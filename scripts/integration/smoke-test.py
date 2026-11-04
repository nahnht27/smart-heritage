#!/usr/bin/env python3
"""Smart Heritage - API integration smoke tests (stdlib only).

Verifies a running backend against the documented contract:
- health + public content endpoints
- JWT login, user profile
- visitor interaction write + duplicate behaviour
- analytics authorization (anonymous / VISITOR / ADMIN) and data

Configuration (environment variables, never hardcode credentials):
    API_BASE_URL             Default: http://localhost:8080/api
    API_TIMEOUT_SECONDS      Default: 10
    TEST_VISITOR_USERNAME    Visitor account (backend login uses username)
    TEST_VISITOR_PASSWORD
    TEST_ADMIN_USERNAME      ADMIN account
    TEST_ADMIN_PASSWORD
    TEST_ARTIFACT_ID         Existing artifact id for the interaction write
    ENABLE_INTERACTION_WRITE Default: false. Must be true to write an event.
    ENABLE_CONCURRENT_DUPLICATE
                             Default: false. Opt-in for the concurrent duplicate
                             scenario (writes one extra event when enabled).

Without credentials, authenticated scenarios are reported as SKIPPED.
Credentials that are provided but fail to authenticate are reported as FAIL.
No token, password, or response body containing secrets is printed.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Any


class Reporter:
    def __init__(self) -> None:
        self.passed: list[str] = []
        self.failed: list[str] = []
        self.skipped: list[str] = []

    def ok(self, name: str, detail: str = "") -> None:
        suffix = f" - {detail}" if detail else ""
        self.passed.append(name)
        print(f"PASS  {name}{suffix}")

    def fail(self, name: str, detail: str) -> None:
        self.failed.append(name)
        print(f"FAIL  {name} - {detail}")

    def skip(self, name: str, detail: str) -> None:
        self.skipped.append(name)
        print(f"SKIP  {name} - {detail}")

    def check(self, name: str, condition: bool, detail: str) -> bool:
        if condition:
            self.ok(name)
        else:
            self.fail(name, detail)
        return condition

    def summary(self) -> int:
        print()
        print(
            f"Summary: {len(self.passed)} passed, "
            f"{len(self.failed)} failed, {len(self.skipped)} skipped"
        )
        if self.failed:
            print("Failed: " + "; ".join(self.failed))
            return 1
        return 0


class HttpClient:
    def __init__(self, base_url: str, timeout: float) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def request(
        self,
        method: str,
        path: str,
        token: str | None = None,
        body: dict[str, Any] | None = None,
    ) -> tuple[int, Any, str]:
        url = f"{self.base_url}/{path.lstrip('/')}"
        data = None
        headers = {"Accept": "application/json"}
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if token:
            headers["Authorization"] = f"Bearer {token}"

        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8", errors="replace")
                return response.status, _maybe_json(raw), raw
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            return exc.code, _maybe_json(raw), raw
        except urllib.error.URLError as exc:
            return 0, None, f"connection error: {exc.reason}"
        except TimeoutError:
            return 0, None, "request timed out"


def _maybe_json(raw: str) -> Any:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def is_envelope(payload: Any) -> bool:
    return isinstance(payload, dict) and isinstance(payload.get("success"), bool)


def assert_envelope(
    reporter: Reporter, name: str, status: int, payload: Any, raw: str
) -> bool:
    if not reporter.check(
        f"{name}: envelope",
        is_envelope(payload),
        f"expected ApiResponse envelope, got HTTP {status}: {raw[:200]}",
    ):
        return False
    if status >= 400:
        return True
    return reporter.check(
        f"{name}: success=true",
        payload.get("success") is True,
        f"success={payload.get('success')!r} message={payload.get('message')!r}",
    )


def login(
    reporter: Reporter,
    client: HttpClient,
    label: str,
    username: str | None,
    password: str | None,
) -> str | None:
    if not username or not password:
        reporter.skip(f"{label} login", "credentials not provided")
        return None

    status, payload, raw = client.request(
        "POST", "auth/login", body={"username": username, "password": password}
    )
    if status != 200:
        reporter.fail(
            f"{label} login",
            f"HTTP {status}: {raw[:200]} (check username/password; backend logs in by username)",
        )
        return None
    if not is_envelope(payload) or payload.get("success") is not True:
        reporter.fail(f"{label} login", f"unexpected body: {raw[:200]}")
        return None

    token = (payload.get("data") or {}).get("accessToken")
    if not token:
        reporter.fail(f"{label} login", "accessToken missing from response")
        return None

    reporter.ok(f"{label} login", "JWT received (not printed)")
    return token


def scenario_health(reporter: Reporter, client: HttpClient) -> None:
    status, payload, raw = client.request("GET", "health")
    reporter.check("health: HTTP 200", status == 200, f"got HTTP {status}: {raw[:200]}")
    reporter.check(
        "health: status UP",
        isinstance(payload, dict) and payload.get("status") == "UP",
        f"body={raw[:200]}",
    )


def scenario_public_content(reporter: Reporter, client: HttpClient) -> None:
    for resource in ("heritage-sites", "artifacts", "multimedia"):
        status, payload, raw = client.request("GET", resource)
        reporter.check(
            f"public GET /{resource}: HTTP 200",
            status == 200,
            f"got HTTP {status}: {raw[:200]}",
        )
        if assert_envelope(reporter, f"public GET /{resource}", status, payload, raw):
            reporter.check(
                f"public GET /{resource}: data is a list",
                isinstance(payload.get("data"), list),
                f"data type={type(payload.get('data')).__name__}",
            )


def scenario_auth_negative(reporter: Reporter, client: HttpClient) -> None:
    status, payload, raw = client.request(
        "POST",
        "auth/login",
        body={"username": "__smoke_missing_user__", "password": "__wrong_password__"},
    )
    reporter.check(
        "login invalid credentials: HTTP 401",
        status == 401,
        f"got HTTP {status}: {raw[:200]}",
    )
    reporter.check(
        "login invalid credentials: success=false",
        is_envelope(payload) and payload.get("success") is False,
        f"body={raw[:200]}",
    )


def scenario_profile(reporter: Reporter, client: HttpClient, token: str | None) -> None:
    if not token:
        reporter.skip("GET /users/me", "visitor token unavailable")
        return

    status, payload, raw = client.request("GET", "users/me", token=token)
    reporter.check(
        "GET /users/me: HTTP 200",
        status == 200,
        f"got HTTP {status}: {raw[:200]}",
    )
    if assert_envelope(reporter, "GET /users/me", status, payload, raw):
        data = payload.get("data") or {}
        reporter.check(
            "GET /users/me: profile fields present",
            isinstance(data, dict) and "userId" in data and "username" in data,
            f"data keys={list(data) if isinstance(data, dict) else data}",
        )

    status, payload, raw = client.request("GET", "users/me")
    reporter.check(
        "GET /users/me without token: HTTP 401",
        status == 401,
        f"got HTTP {status}: {raw[:200]}",
    )


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _summary_total(
    client: HttpClient,
    admin_token: str,
    range_from: str,
    range_to: str,
) -> int | None:
    status, payload, _ = client.request(
        "GET",
        f"analytics/interactions/summary?from={range_from}&to={range_to}",
        token=admin_token,
    )
    if status == 200 and is_envelope(payload):
        total = (payload.get("data") or {}).get("totalInteractions")
        return total if isinstance(total, int) else None
    return None


def _interaction_write_enabled() -> bool:
    return os.environ.get("ENABLE_INTERACTION_WRITE", "false").lower() in (
        "1",
        "true",
        "yes",
    )


def scenario_interaction(
    reporter: Reporter,
    client: HttpClient,
    visitor_token: str | None,
    admin_token: str | None,
    artifact_id: str | None,
) -> tuple[bool, str | None]:
    """Returns (interaction_created, interaction_type)."""
    if not visitor_token:
        reporter.skip("POST /interactions", "visitor token unavailable")
        return False, None
    if not artifact_id:
        reporter.skip("POST /interactions", "TEST_ARTIFACT_ID not provided")
        return False, None
    if not _interaction_write_enabled():
        reporter.skip(
            "POST /interactions",
            "write disabled (set ENABLE_INTERACTION_WRITE=true to opt in)",
        )
        return False, None

    event_id = str(uuid.uuid4())
    interaction_type = "VIEW"
    now = datetime.now(timezone.utc)
    body = {
        "eventId": event_id,
        "artifactId": int(artifact_id),
        "interactionType": interaction_type,
        "languageCode": "vi",
        "startedAt": _iso(now),
        "endedAt": _iso(now + timedelta(seconds=30)),
        "interactedAt": _iso(now),
    }

    status, payload, raw = client.request(
        "POST", "interactions", token=visitor_token, body=body
    )
    if status == 404:
        reporter.fail(
            "POST /interactions",
            f"artifact {artifact_id} not found (HTTP 404); provide a real TEST_ARTIFACT_ID",
        )
        return False, None
    reporter.check(
        "POST /interactions: HTTP 201",
        status == 201,
        f"got HTTP {status}: {raw[:200]}",
    )
    if not assert_envelope(reporter, "POST /interactions", status, payload, raw):
        return False, None

    first_data = payload.get("data") or {}
    first_id = first_data.get("interactionId")
    reporter.check(
        "POST /interactions: interactionId returned",
        first_id is not None,
        f"data={first_data}",
    )

    # Sequential duplicate (same eventId, sent after the first request has
    # completed): contract requires 200 OK with the existing record, NOT 409.
    range_from = _iso(now - timedelta(hours=1))
    range_to = _iso(now + timedelta(hours=1))
    total_before = (
        _summary_total(client, admin_token, range_from, range_to)
        if admin_token
        else None
    )

    status, payload, raw = client.request(
        "POST", "interactions", token=visitor_token, body=body
    )
    reporter.check(
        "POST /interactions sequential duplicate: HTTP 200",
        status == 200,
        f"got HTTP {status}: {raw[:200]} (409 is only valid for concurrent races)",
    )
    if status == 200:
        if assert_envelope(reporter, "POST /interactions sequential duplicate", status, payload, raw):
            reporter.check(
                "POST /interactions sequential duplicate: same interactionId",
                (payload.get("data") or {}).get("interactionId") == first_id,
                "duplicate response did not reference the existing record",
            )
            reporter.check(
                "POST /interactions sequential duplicate: idempotent message",
                "already" in str(payload.get("message", "")).lower(),
                f"message={payload.get('message')!r}",
            )

    if admin_token and total_before is not None:
        total_after = _summary_total(client, admin_token, range_from, range_to)
        reporter.check(
            "POST /interactions sequential duplicate: totalInteractions unchanged",
            total_after is not None and total_after == total_before,
            f"totalInteractions before={total_before} after={total_after}",
        )
    else:
        reporter.skip(
            "POST /interactions sequential duplicate: totalInteractions unchanged",
            "admin token unavailable",
        )

    return True, interaction_type


def scenario_concurrent_duplicate(
    reporter: Reporter,
    client: HttpClient,
    visitor_token: str | None,
    admin_token: str | None,
    artifact_id: str | None,
) -> None:
    """Fire simultaneous requests with one eventId and verify only one row wins.

    Concurrency (not sequential) may legitimately return 409 for the requests
    blocked by the unique event_id constraint. Exactly one request must create
    the record (201) and the analytics total must grow by exactly one.
    """
    if not visitor_token:
        reporter.skip("POST /interactions concurrent duplicate", "visitor token unavailable")
        return
    if not artifact_id:
        reporter.skip("POST /interactions concurrent duplicate", "TEST_ARTIFACT_ID not provided")
        return
    if not _interaction_write_enabled():
        reporter.skip(
            "POST /interactions concurrent duplicate",
            "write disabled (set ENABLE_INTERACTION_WRITE=true to opt in)",
        )
        return
    if os.environ.get("ENABLE_CONCURRENT_DUPLICATE", "false").lower() not in (
        "1",
        "true",
        "yes",
    ):
        reporter.skip(
            "POST /interactions concurrent duplicate",
            "concurrent check disabled (set ENABLE_CONCURRENT_DUPLICATE=true to opt in)",
        )
        return

    now = datetime.now(timezone.utc)
    body = {
        "eventId": str(uuid.uuid4()),
        "artifactId": int(artifact_id),
        "interactionType": "VIEW",
        "languageCode": "vi",
        "startedAt": _iso(now),
        "endedAt": _iso(now + timedelta(seconds=30)),
        "interactedAt": _iso(now),
    }
    range_from = _iso(now - timedelta(hours=1))
    range_to = _iso(now + timedelta(hours=1))
    total_before = (
        _summary_total(client, admin_token, range_from, range_to)
        if admin_token
        else None
    )

    def send(_: int) -> tuple[int, Any, str]:
        return client.request(
            "POST", "interactions", token=visitor_token, body=body
        )

    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(send, range(3)))

    statuses = [status for status, _, _ in results]
    reporter.check(
        "POST /interactions concurrent duplicate: statuses in {200,201,409}",
        all(status in (200, 201, 409) for status in statuses),
        f"statuses={statuses}",
    )
    reporter.check(
        "POST /interactions concurrent duplicate: exactly one 201",
        statuses.count(201) == 1,
        f"statuses={statuses} (more than one 201 means duplicate rows)",
    )

    interaction_ids = set()
    for status, payload, _ in results:
        if status in (200, 201) and is_envelope(payload):
            interaction_id = (payload.get("data") or {}).get("interactionId")
            if interaction_id is not None:
                interaction_ids.add(interaction_id)
    reporter.check(
        "POST /interactions concurrent duplicate: one interactionId",
        len(interaction_ids) == 1,
        f"interactionIds={interaction_ids}",
    )

    if admin_token and total_before is not None:
        total_after = _summary_total(client, admin_token, range_from, range_to)
        reporter.check(
            "POST /interactions concurrent duplicate: exactly one record stored",
            total_after is not None and total_after == total_before + 1,
            f"totalInteractions before={total_before} after={total_after}",
        )
    else:
        reporter.skip(
            "POST /interactions concurrent duplicate: exactly one record stored",
            "admin token unavailable",
        )


def scenario_analytics_auth(
    reporter: Reporter,
    client: HttpClient,
    visitor_token: str | None,
    admin_token: str | None,
) -> None:
    endpoint = "analytics/interactions/summary"

    status, _, raw = client.request("GET", endpoint)
    reporter.check(
        "analytics anonymous: HTTP 401",
        status == 401,
        f"got HTTP {status}: {raw[:200]}",
    )

    if visitor_token:
        status, _, raw = client.request("GET", endpoint, token=visitor_token)
        reporter.check(
            "analytics VISITOR: HTTP 403",
            status == 403,
            f"got HTTP {status}: {raw[:200]}",
        )
    else:
        reporter.skip("analytics VISITOR -> 403", "visitor token unavailable")

    if admin_token:
        status, payload, raw = client.request("GET", endpoint, token=admin_token)
        reporter.check(
            "analytics ADMIN: HTTP 200",
            status == 200,
            f"got HTTP {status}: {raw[:200]}",
        )
        assert_envelope(reporter, "analytics ADMIN", status, payload, raw)
    else:
        reporter.skip("analytics ADMIN -> 200", "admin token unavailable")


def scenario_analytics_data(
    reporter: Reporter,
    client: HttpClient,
    admin_token: str | None,
    interaction_created: bool,
    interaction_type: str | None,
    artifact_id: str | None,
) -> None:
    if not admin_token:
        reporter.skip("analytics data/filter", "admin token unavailable")
        return

    now = datetime.now(timezone.utc)
    range_from = _iso(now - timedelta(hours=1))
    range_to = _iso(now + timedelta(hours=1))

    status, payload, raw = client.request(
        "GET",
        f"analytics/interactions/summary?from={range_from}&to={range_to}",
        token=admin_token,
    )
    if not reporter.check(
        "analytics filtered range: HTTP 200",
        status == 200,
        f"got HTTP {status}: {raw[:200]}",
    ):
        return
    if not assert_envelope(reporter, "analytics filtered range", status, payload, raw):
        return

    data = payload.get("data") or {}
    total = data.get("totalInteractions")
    reporter.check(
        "analytics: totalInteractions is int >= 0",
        isinstance(total, int) and total >= 0,
        f"totalInteractions={total!r}",
    )

    if interaction_created:
        reporter.check(
            "analytics: reflects recorded interaction",
            isinstance(total, int) and total >= 1,
            f"totalInteractions={total!r} after recording one event",
        )
        types = data.get("interactionTypes") or []
        matching = [
            item
            for item in types
            if isinstance(item, dict)
            and item.get("interactionType") == interaction_type
            and isinstance(item.get("count"), int)
            and item.get("count") >= 1
        ]
        reporter.check(
            "analytics: interaction type counted",
            bool(matching),
            f"interactionTypes={types}",
        )
    else:
        reporter.skip(
            "analytics: reflects recorded interaction",
            "no interaction written in this run",
        )

    if artifact_id:
        popular = data.get("popularArtifacts") or []
        reporter.check(
            "analytics: popularArtifacts is a list",
            isinstance(popular, list),
            f"popularArtifacts={popular!r}",
        )

    status, payload, raw = client.request(
        "GET",
        f"analytics/interactions/summary?from={range_from}",
        token=admin_token,
    )
    reporter.check(
        "analytics: from without to -> HTTP 400",
        status == 400,
        f"got HTTP {status}: {raw[:200]}",
    )


def main() -> int:
    base_url = os.environ.get("API_BASE_URL", "http://localhost:8080/api")
    timeout = float(os.environ.get("API_TIMEOUT_SECONDS", "10"))
    reporter = Reporter()
    client = HttpClient(base_url, timeout)

    print(f"Smart Heritage API smoke tests -> {client.base_url}")
    print(f"Timeout: {timeout}s")
    print()

    scenario_health(reporter, client)
    scenario_public_content(reporter, client)
    scenario_auth_negative(reporter, client)

    visitor_token = login(
        reporter,
        client,
        "VISITOR",
        os.environ.get("TEST_VISITOR_USERNAME"),
        os.environ.get("TEST_VISITOR_PASSWORD"),
    )
    admin_token = login(
        reporter,
        client,
        "ADMIN",
        os.environ.get("TEST_ADMIN_USERNAME"),
        os.environ.get("TEST_ADMIN_PASSWORD"),
    )

    scenario_profile(reporter, client, visitor_token)
    created, interaction_type = scenario_interaction(
        reporter,
        client,
        visitor_token,
        admin_token,
        os.environ.get("TEST_ARTIFACT_ID"),
    )
    scenario_concurrent_duplicate(
        reporter,
        client,
        visitor_token,
        admin_token,
        os.environ.get("TEST_ARTIFACT_ID"),
    )
    scenario_analytics_auth(reporter, client, visitor_token, admin_token)
    scenario_analytics_data(
        reporter,
        client,
        admin_token,
        created,
        interaction_type,
        os.environ.get("TEST_ARTIFACT_ID"),
    )

    return reporter.summary()


if __name__ == "__main__":
    sys.exit(main())
