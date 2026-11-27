#!/usr/bin/env python3
"""Download the openly licensed demo images listed in content.json.

Images come from Wikimedia Commons at a phone-friendly width. The author and
licence of every file are written to demo-content/media/credits.json and to
scripts/demo-content/CREDITS.md, because most licences require attribution.
Only the Python standard library is used. Existing downloads are kept.
"""

from __future__ import annotations

import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
MEDIA = ROOT / "demo-content" / "media"
API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "SmartHeritageStudentDemo/1.0 (educational project)"
WIDTH = 1280
ALLOWED_LICENSES = ("cc0", "cc by", "public domain")
MAX_BYTES = 8 * 1024 * 1024


def request(url: str) -> bytes:
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=60) as response:
                data = response.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES:
                raise ValueError(f"download is larger than {MAX_BYTES} bytes: {url}")
            return data
        except (urllib.error.URLError, TimeoutError) as exc:
            if attempt == 5:
                raise
            wait = 10 * (attempt + 1)
            print(f"  retry in {wait}s: {exc}", file=sys.stderr)
            time.sleep(wait)
    raise AssertionError("unreachable")


def plain(value: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", value)).split())


def describe(title: str) -> dict:
    params = {
        "action": "query",
        "format": "json",
        "titles": title,
        "prop": "imageinfo",
        "iiprop": "url|extmetadata",
        "iiurlwidth": WIDTH,
    }
    data = json.loads(request(API + "?" + urllib.parse.urlencode(params)))
    page = next(iter(data["query"]["pages"].values()))
    if "imageinfo" not in page:
        raise SystemExit(f"Not found on Wikimedia Commons: {title}")
    info = page["imageinfo"][0]
    meta = info.get("extmetadata", {})
    licence = plain(meta.get("LicenseShortName", {}).get("value", ""))
    if not licence.lower().startswith(ALLOWED_LICENSES):
        raise SystemExit(f"Licence '{licence}' is not allowed: {title}")
    return {
        "title": title,
        "downloadUrl": info.get("thumburl") or info["url"],
        "sourcePage": info["descriptionurl"],
        "author": plain(meta.get("Artist", {}).get("value", "")) or "Không rõ tác giả",
        "license": licence,
    }


def main() -> None:
    content = json.loads((HERE / "content.json").read_text(encoding="utf-8"))
    MEDIA.mkdir(parents=True, exist_ok=True)
    credits_path = MEDIA / "credits.json"
    credits = (
        json.loads(credits_path.read_text(encoding="utf-8")) if credits_path.exists() else {}
    )

    for artifact in content["artifacts"]:
        for index, title in enumerate(artifact["images"], start=1):
            name = f"a{artifact['artifactId']:02d}_image{index}.jpg"
            target = MEDIA / name
            if target.exists() and credits.get(name, {}).get("title") == title:
                continue
            info = describe(title)
            data = request(info["downloadUrl"])
            if not data.startswith(b"\xff\xd8\xff"):
                raise SystemExit(f"Not a JPEG image: {title}")
            target.write_bytes(data)
            credits[name] = info
            credits_path.write_text(
                json.dumps(credits, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print(f"{name}  {len(data) // 1024} KB  {info['license']}")
            time.sleep(2)

    lines = [
        "# Nguồn ảnh demo",
        "",
        "Ảnh lấy từ Wikimedia Commons, thu nhỏ còn chiều rộng tối đa "
        f"{WIDTH}px. Video thuyết minh được dựng từ chính các ảnh này.",
        "",
        "| File | Tác giả | Giấy phép | Nguồn |",
        "|---|---|---|---|",
    ]
    for name in sorted(credits):
        item = credits[name]
        author = item["author"].replace("|", "/")
        lines.append(f"| `{name}` | {author} | {item['license']} | <{item['sourcePage']}> |")
    (HERE / "CREDITS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{len(credits)} images ready in {MEDIA}")


if __name__ == "__main__":
    main()
