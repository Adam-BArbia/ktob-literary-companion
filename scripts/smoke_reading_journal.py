#!/usr/bin/env python3
"""Live, isolated reading/journal QA. Never prints tokens or response bodies.

Set API_BASE_URL (including /api/v1), QA_READER_A_TOKEN and QA_READER_B_TOKEN.
Supply two distinct, owner-authorized test accounts. This creates one private QA
work/entry and only mutates descendants created by this run. The entry is archived
in finally; catalog/reading records are intentionally retained, never purged.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid


class SmokeFailure(Exception):
    """Only static, non-sensitive messages belong in this exception."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        # An API deployment should not redirect; never forward bearer credentials.
        return None


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SmokeFailure(message)


def identifier(value: object) -> str:
    require(isinstance(value, str), "API returned an invalid fixture identifier.")
    try:
        parsed = uuid.UUID(value)
    except (ValueError, AttributeError):
        raise SmokeFailure("API returned an invalid fixture identifier.") from None
    require(str(parsed) == value.lower(), "API returned an invalid fixture identifier.")
    return str(parsed)


class Api:
    def __init__(self) -> None:
        self.base = os.environ.get("API_BASE_URL", "").rstrip("/")
        self.tokens = {"a": os.environ.get("QA_READER_A_TOKEN", ""),
                       "b": os.environ.get("QA_READER_B_TOKEN", "")}
        require(bool(self.base) and all(self.tokens.values()),
                "Set API_BASE_URL, QA_READER_A_TOKEN and QA_READER_B_TOKEN in the environment.")
        target = urllib.parse.urlsplit(self.base)
        require(target.scheme == "https" or
                (target.scheme == "http" and target.hostname in ("localhost", "127.0.0.1")),
                "Use HTTPS, or HTTP only for a local disposable API.")
        require(not target.username and not target.password and not target.query and
                not target.fragment and target.path.rstrip("/").endswith("/api/v1"),
                "API_BASE_URL must end in /api/v1 and contain no credentials, query or fragment.")
        self.opener = urllib.request.build_opener(NoRedirect())

    def call(self, method: str, path: str, body: dict | None = None,
             expected: int = 200, token: str | None = "a", code: str | None = None):
        headers = {"Accept": "application/json", "User-Agent": "KTOB-Isolated-Release-QA/1"}
        if token is not None:
            headers["Authorization"] = "Bearer " + self.tokens[token]
        payload = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            payload = json.dumps(body).encode("utf-8")
        request = urllib.request.Request(self.base + path, data=payload, headers=headers, method=method)
        try:
            with self.opener.open(request, timeout=45) as response:
                status, raw = response.status, response.read(1_000_001)
        except urllib.error.HTTPError as error:
            status, raw = error.code, error.read(1_000_001)
        except (urllib.error.URLError, TimeoutError, OSError):
            raise SmokeFailure("An API request failed or timed out; no write was retried.") from None
        require(status == expected, f"Unexpected HTTP status for {method} {path}: expected {expected}, got {status}.")
        require(len(raw) <= 1_000_000, "An API response exceeded the QA response limit.")
        if not raw:
            require(expected == 204, "A JSON API response was unexpectedly empty.")
            return {}
        try:
            result = json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            raise SmokeFailure("An API response was not valid JSON.") from None
        require(isinstance(result, dict), "An API response had an unexpected envelope.")
        if code is not None:
            require(result.get("code") == code, "The API returned an unexpected problem code.")
        return result


def run() -> int:
    artifacts: dict[str, object] = {"runId": str(uuid.uuid4()), "entryArchived": False}
    checks: list[str] = []
    success = False
    api: Api | None = None
    entry_path: str | None = None

    def passed(label: str) -> None:
        checks.append(label)
        print("PASS " + label, flush=True)

    try:
        api = Api()
        a = api.call("GET", "/me")["data"]["id"]
        b = api.call("GET", "/me", token="b")["data"]["id"]
        require(identifier(a) != identifier(b), "Use two different test readers for the privacy checks.")
        passed("two distinct authenticated test readers")

        title = "KTOB release QA " + str(artifacts["runId"])
        work = api.call("POST", "/catalog/manual-works", {"title": title, "authors": ["KTOB QA"]}, 201)["data"]
        require(work.get("title") == title and work.get("origin") == "MANUAL", "QA work creation did not return its expected metadata.")
        artifacts["manualWorkId"] = identifier(work["id"])
        entry = api.call("POST", "/library", {"workId": artifacts["manualWorkId"]}, 201)["data"]
        artifacts["entryId"] = identifier(entry["id"])
        entry_path = "/library/" + str(artifacts["entryId"])
        require(entry.get("shelfStatus") == "WANT_TO_READ", "A saved book unexpectedly implied reading.")
        passed("fresh private QA work and Want to read entry")

        finished = api.call("POST", entry_path + "/experiences", {
            "status": "FINISHED", "historicalImport": True,
            "finishedOn": dt.datetime.now(dt.timezone.utc).date().isoformat(), "rating": 4.5,
        }, 201)["data"]
        artifacts["finishedExperienceId"] = identifier(finished["id"])
        reading_path = "/experiences/" + str(artifacts["finishedExperienceId"])
        journal_path = reading_path + "/journal"
        for index, rating in enumerate((4.5, 5, None, 4.5)):
            if index:
                api.call("PATCH", reading_path, {"rating": rating})
            persisted = api.call("GET", reading_path)["data"]
            require(persisted.get("rating") == rating and persisted.get("status") == "FINISHED",
                    "Rating did not persist independently of status.")
            require(persisted.get("progressPercent") is None, "Finishing forced a progress percentage.")
            passed("persisted rating " + ("cleared" if rating is None else str(rating)))
        for bad in (0.5, 4.2, 5.5):
            api.call("PATCH", reading_path, {"rating": bad}, 422)
        passed("invalid rating values rejected")

        def note(kind: str, body: str) -> str:
            saved = api.call("POST", journal_path,
                             {"kind": kind, "body": body, "emotionTags": [], "allowForPersonalization": False}, 201)["data"]
            require(saved.get("allowForPersonalization") is False, "Journal personalization default changed.")
            return identifier(saved["id"])

        review = note("REVIEW", "Isolated QA review. This is test content.")
        quote = note("QUOTE", "Isolated QA quotation field test; no literary attribution.")
        artifacts.update({"reviewId": review, "deletedQuoteId": quote})
        notes = api.call("GET", journal_path)["data"]
        require({n["id"] for n in notes} == {review, quote}, "Created journal entries did not persist.")
        api.call("PATCH", "/journal/" + review, {"body": "Isolated QA revised review."})
        notes = api.call("GET", journal_path)["data"]
        require(next(n for n in notes if n["id"] == review)["body"] == "Isolated QA revised review.",
                "Edited review did not persist.")
        require(next(n for n in notes if n["id"] == quote)["kind"] == "QUOTE", "Review edit changed its neighboring note.")
        api.call("DELETE", "/journal/" + quote, expected=204)
        require([n["id"] for n in api.call("GET", journal_path)["data"]] == [review], "Deleting one note affected another.")
        require(api.call("GET", reading_path)["data"]["rating"] == 4.5, "Journal changes affected the rating.")
        passed("journal create, refresh, edit and delete preserve the reading and other notes")

        for favorite in (True, False, True):
            api.call("PATCH", entry_path, {"favorite": favorite})
            current = api.call("GET", entry_path)["data"]
            require(current["favorite"] is favorite and current["shelfStatus"] == "FINISHED", "Favorite changed unrelated reading state.")
        passed("favorite persists and can be removed")

        api.call("POST", entry_path + "/experiences", {"status": "FINISHED"}, 422, code="HISTORICAL_IMPORT_REQUIRED")
        active = api.call("POST", entry_path + "/experiences", {"status": "CURRENTLY_READING", "progressPercent": 12}, 201)["data"]
        active_path = "/experiences/" + identifier(active["id"])
        artifacts["rereadExperienceId"] = identifier(active["id"])
        api.call("PATCH", active_path, {"status": "PAUSED"})
        api.call("POST", entry_path + "/experiences", {"status": "CURRENTLY_READING"}, 409, code="READING_ALREADY_OPEN")
        api.call("PATCH", active_path, {"status": "CURRENTLY_READING"})
        ended = api.call("PATCH", active_path, {"status": "DID_NOT_FINISH"})["data"]
        require(ended["progressPercent"] == 12 and ended.get("rating") is None, "Reread metadata was not independent.")
        api.call("PATCH", active_path, {"status": "CURRENTLY_READING"}, 422, code="INVALID_READING_TRANSITION")
        require(api.call("GET", reading_path)["data"]["rating"] == 4.5, "Rereading overwrote the earlier score.")
        passed("historical intent, pause/resume, one-open limit, terminal status and reread preservation")

        operations = [
            ("GET", entry_path + "/experiences", None),
            ("POST", entry_path + "/experiences", {"status": "CURRENTLY_READING"}),
            ("GET", reading_path, None), ("PATCH", reading_path, {"rating": 5}),
            ("GET", journal_path, None),
            ("POST", journal_path, {"kind": "NOTE", "body": "QA", "allowForPersonalization": False}),
            ("PATCH", "/journal/" + review, {"body": "QA"}),
            ("DELETE", "/journal/" + review, None), ("PATCH", entry_path, {"favorite": False}),
        ]
        for method, path, body in operations:
            api.call(method, path, body, 404, token="b")
            api.call(method, path, body, 401, token=None)
        passed("all nine operations enforce cross-reader 404 and anonymous 401")

        api.call("DELETE", entry_path, expected=204)
        for method, path, body in operations:
            if method == "GET":
                api.call(method, path)
            else:
                api.call(method, path, body, 409, code="LIBRARY_ENTRY_ARCHIVED")
            api.call(method, path, body, 404, token="b")
        api.call("POST", entry_path + "/restore")
        api.call("PATCH", "/journal/" + review, {"body": "Isolated QA restored review."})
        require(api.call("GET", reading_path)["data"]["rating"] == 4.5, "Archive/restore lost the original rating.")
        passed("archive preserves reads, blocks child writes, keeps owner isolation, and restores editing")
        success = True
    except SmokeFailure as error:
        print("FAIL " + str(error), file=sys.stderr, flush=True)
    except Exception:
        print("FAIL unexpected QA response or runtime error; response contents suppressed.", file=sys.stderr, flush=True)
    finally:
        if api is not None and entry_path is not None:
            try:
                api.call("DELETE", entry_path, expected=204)
                artifacts["entryArchived"] = True
                passed("QA entry archived; no preexisting record changed")
            except Exception:
                success = False
                print("FAIL QA entry archive could not be confirmed; inspect the reported fixture ID.", file=sys.stderr, flush=True)
        print(json.dumps({"success": success, "checksPassed": len(checks), "artifacts": artifacts}, sort_keys=True), flush=True)
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(run())
