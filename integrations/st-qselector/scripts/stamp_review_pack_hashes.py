#!/usr/bin/env python3
"""Stamp chapter review packs with immutable input/output hash preconditions.

The input hashes are recovered from the parent commit in which each pack was
introduced. Output hashes are calculated from the current reviewed data. The
result lets ``apply_review_pack.py`` reject stale packs instead of silently
applying an answer to a changed or renumbered question.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any

from review_schema import sha256_text


ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = ROOT.parents[1]
AUDIT = ROOT / "Data" / "Audit"
FORMED = ROOT / "Data" / "Formed"


def run_git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=REPOSITORY,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def git_json(revision: str, path: Path) -> dict[str, Any]:
    relative = path.relative_to(REPOSITORY).as_posix()
    return json.loads(run_git("show", f"{revision}:{relative}"))


def index(items: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {str(item["id"]): item for item in items}


def set_or_check(
    target: dict[str, Any],
    field: str,
    expected: Any,
    *,
    context: str,
    check_only: bool,
) -> None:
    if check_only:
        if target.get(field) != expected:
            raise ValueError(
                f"{context}: stale {field}; expected {expected!r}, got {target.get(field)!r}"
            )
        return
    target[field] = expected


def stamp_pack(path: Path, *, check_only: bool) -> int:
    relative = path.relative_to(REPOSITORY).as_posix()
    introductions = [line for line in run_git("log", "--diff-filter=A", "--format=%H", "--", relative).splitlines() if line]
    if not introductions:
        raise ValueError(f"cannot find introduction commit for {relative}")
    introduction = introductions[-1]
    parent = run_git("rev-parse", f"{introduction}^").strip()
    pack = load(path)
    chapter = str(pack["chapter"])
    question_path = FORMED / chapter / "questions.json"
    answer_path = FORMED / chapter / "answers.json"
    baseline_questions = index(git_json(parent, question_path).get("questions", []))
    baseline_answers = index(git_json(parent, answer_path).get("answers", []))
    reviewed_questions = index(load(question_path).get("questions", []))
    reviewed_answers = index(load(answer_path).get("answers", []))

    for record in pack.get("records", []):
        qid = str(record["id"])
        baseline_question = baseline_questions.get(qid)
        baseline_answer = baseline_answers.get(qid)
        if baseline_question is None or baseline_answer is None:
            raise ValueError(f"{path.name}:{qid}: missing record in historical baseline {parent}")
        context = f"{path.name}:{qid}"
        set_or_check(
            record,
            "expected_question_hash",
            sha256_text(str(baseline_question.get("content") or "")),
            context=context,
            check_only=check_only,
        )
        set_or_check(
            record,
            "expected_answer_hash",
            sha256_text(str(baseline_answer.get("answer") or "")),
            context=context,
            check_only=check_only,
        )

        if record.get("decision") == "delete":
            if check_only:
                if "reviewed_question_hash" in record or "reviewed_answer_hash" in record:
                    raise ValueError(f"{context}: deleted record must not contain reviewed output hashes")
            else:
                record.pop("reviewed_question_hash", None)
                record.pop("reviewed_answer_hash", None)
            continue
        reviewed_question = reviewed_questions.get(qid)
        reviewed_answer = reviewed_answers.get(qid)
        if reviewed_question is None or reviewed_answer is None:
            raise ValueError(f"{path.name}:{qid}: retained record missing from current reviewed data")
        set_or_check(
            record,
            "reviewed_question_hash",
            sha256_text(str(reviewed_question.get("content") or "")),
            context=context,
            check_only=check_only,
        )
        set_or_check(
            record,
            "reviewed_answer_hash",
            sha256_text(str(reviewed_answer.get("answer") or "")),
            context=context,
            check_only=check_only,
        )

    set_or_check(
        pack,
        "hash_algorithm",
        "sha256",
        context=path.name,
        check_only=check_only,
    )
    set_or_check(
        pack,
        "baseline_commit",
        parent,
        context=path.name,
        check_only=check_only,
    )
    if not check_only:
        path.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(pack.get("records", []))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="calculate and validate without rewriting packs")
    args = parser.parse_args()
    total = 0
    for path in sorted(AUDIT.glob("ch??-review-v1.json")):
        count = stamp_pack(path, check_only=args.check)
        total += count
        print(f"{path.name}: {count} records")
    action = "Validated" if args.check else "Stamped"
    print(f"{action} {total} review-pack records with SHA-256 preconditions.")


if __name__ == "__main__":
    main()
