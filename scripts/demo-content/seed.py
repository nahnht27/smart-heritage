#!/usr/bin/env python3
"""Load the demo content into a local PostgreSQL container.

Usage (from the repository root, with the backend already started once so that
Flyway has applied V5):

    python3 scripts/demo-content/seed.py            # show what would change
    python3 scripts/demo-content/seed.py --apply    # change the database

For the artifacts listed in content.json this replaces name, description, site
and ALL multimedia rows. Sites and beacons are inserted or updated. Users and
visitor interactions are not touched. Back up the database first
(docs/deployment/backup-restore.md). Running it again gives the same result.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
MEDIA = HERE.parents[1] / "demo-content" / "media"
REMOTE = "/tmp/smart-heritage-seed"
VOICE_PAGE = (
    "https://huggingface.co/rhasspy/piper-voices/tree/main/vi/vi_VN/vais1000/medium"
)


def quote(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def media_items(artifact: dict, credits: dict) -> list[dict]:
    prefix = f"a{artifact['artifactId']:02d}"
    items = []
    for index in range(1, len(artifact["images"]) + 1):
        name = f"{prefix}_image{index}.jpg"
        credit = credits[name]
        items.append({
            "file": name, "type": "IMAGE", "mime": "image/jpeg",
            "title": f"Ảnh: {credit['author']} · {credit['license']} (Wikimedia Commons)",
            "url": credit["sourcePage"],
        })
    items.append({
        "file": f"{prefix}_audio.mp3", "type": "AUDIO", "mime": "audio/mpeg",
        "title": f"Thuyết minh (giọng đọc tổng hợp): {artifact['name']}",
        "url": VOICE_PAGE,
    })
    items.append({
        "file": f"{prefix}_video.mp4", "type": "VIDEO", "mime": "video/mp4",
        "title": f"Video giới thiệu: {artifact['name']}",
        "url": credits[f"{prefix}_image1.jpg"]["sourcePage"],
    })
    return items


def build_sql(content: dict, credits: dict) -> tuple[str, list[Path]]:
    sql = ["\\set ON_ERROR_STOP on", "BEGIN;"]
    files: list[Path] = []

    for site in content["sites"]:
        values = [site[key] for key in
                  ("siteId", "name", "description", "address", "latitude", "longitude")]
        sql.append(
            "INSERT INTO heritage_site (site_id, name, description, address, latitude, longitude) "
            f"VALUES ({', '.join(map(quote, values))}) "
            "ON CONFLICT (site_id) DO UPDATE SET name = excluded.name, "
            "description = excluded.description, address = excluded.address, "
            "latitude = excluded.latitude, longitude = excluded.longitude;")

    for artifact in content["artifacts"]:
        artifact_id = artifact["artifactId"]
        values = [artifact_id, artifact["siteId"], artifact["name"], artifact["description"]]
        sql.append(
            "INSERT INTO artifact (artifact_id, site_id, name, description) "
            f"VALUES ({', '.join(map(quote, values))}) "
            "ON CONFLICT (artifact_id) DO UPDATE SET site_id = excluded.site_id, "
            "name = excluded.name, description = excluded.description;")
        sql.append(f"DELETE FROM multimedia WHERE artifact_id = {artifact_id};")

        for item in media_items(artifact, credits):
            path = MEDIA / item["file"]
            data = path.read_bytes()
            files.append(path)
            sql.append(
                "WITH added AS (INSERT INTO multimedia (artifact_id, type, title, url) VALUES "
                f"({artifact_id}, {quote(item['type'])}, {quote(item['title'][:255])}, "
                f"{quote(item['url'])}) RETURNING multimedia_id) "
                "INSERT INTO multimedia_file (multimedia_id, file_data, file_name, "
                "content_type, file_size, sha256) SELECT multimedia_id, "
                f"pg_read_binary_file({quote(REMOTE + '/' + item['file'])}), "
                f"{quote(item['file'])}, {quote(item['mime'])}, {len(data)}, "
                f"{quote(hashlib.sha256(data).hexdigest())} FROM added;")

        minor = 100 + artifact_id
        sql.append(
            "INSERT INTO beacon (name, proximity_uuid, major, minor, enabled, artifact_id) VALUES "
            f"({quote(('Beacon ' + str(minor) + ' · ' + artifact['name'])[:255])}, "
            f"{quote(content['beaconUuid'])}, {content['beaconMajor']}, {minor}, true, {artifact_id}) "
            "ON CONFLICT (proximity_uuid, major, minor) DO UPDATE SET name = excluded.name, "
            "enabled = true, artifact_id = excluded.artifact_id;")

    # Explicit IDs were used above, so move the sequences past them.
    for table, column in (("heritage_site", "site_id"), ("artifact", "artifact_id")):
        sql.append(
            f"SELECT setval(pg_get_serial_sequence('{table}', '{column}'), "
            f"(SELECT max({column}) FROM {table}));")
    sql.append("COMMIT;")
    sql.append(
        "SELECT (SELECT count(*) FROM heritage_site) AS sites, "
        "(SELECT count(*) FROM artifact) AS artifacts, "
        "(SELECT count(*) FROM multimedia) AS media, "
        "(SELECT count(*) FROM multimedia_file) AS stored_files, "
        "(SELECT pg_size_pretty(sum(file_size)) FROM multimedia_file) AS stored_size, "
        "(SELECT count(*) FROM beacon) AS beacons;")
    return "\n".join(sql) + "\n", files


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--apply", action="store_true", help="write to the database")
    parser.add_argument("--container", default="smart-heritage-db")
    parser.add_argument("--database", default="smart_heritage")
    parser.add_argument("--user", default="postgres")
    args = parser.parse_args()

    content = json.loads((HERE / "content.json").read_text(encoding="utf-8"))
    credits = json.loads((MEDIA / "credits.json").read_text(encoding="utf-8"))
    sql, files = build_sql(content, credits)
    size = sum(path.stat().st_size for path in files) / 1024 / 1024

    print(f"{len(content['sites'])} sites, {len(content['artifacts'])} artifacts, "
          f"{len(files)} files ({size:.1f} MB) -> {args.container}/{args.database}")
    if not args.apply:
        print("Dry run. Add --apply to change the database.")
        return

    docker = ["docker", "exec"]
    subprocess.run(docker + [args.container, "rm", "-rf", REMOTE], check=True)
    subprocess.run(docker + [args.container, "mkdir", "-p", REMOTE], check=True)
    try:
        for path in files:
            subprocess.run(
                ["docker", "cp", str(path), f"{args.container}:{REMOTE}/{path.name}"],
                check=True, stdout=subprocess.DEVNULL)
        subprocess.run(docker + [args.container, "chmod", "-R", "a+rX", REMOTE], check=True)
        subprocess.run(
            docker[:2] + ["-i", args.container, "psql", "-q", "-U", args.user,
                          "-d", args.database],
            input=sql.encode("utf-8"), check=True)
    finally:
        subprocess.run(docker + [args.container, "rm", "-rf", REMOTE], check=False)


if __name__ == "__main__":
    main()
