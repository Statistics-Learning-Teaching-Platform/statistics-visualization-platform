#!/usr/bin/env python3
"""One-time, reproducible migration from traceable review packs to review v1.

This script deliberately refuses to approve records merely because their
legacy free-text ``review_status`` contains the word "reviewed". A record must
be traceable either to a chapter audit pack present in ``Data/Audit`` or to the
pinned OPL/NAU curated pack.
"""

from __future__ import annotations

import argparse
import json
from copy import deepcopy
from pathlib import Path
from typing import Any

from review_schema import approved_review, sha256_text, validate_review_pair


ROOT = Path(__file__).resolve().parents[1]
FORMED = ROOT / "Data" / "Formed"
AUDIT = ROOT / "Data" / "Audit"
OPL_PACK = ROOT / "Data" / "External" / "opl-nau-curated-v1.json"


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value: dict[str, Any]) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def trusted_chapter_packs() -> dict[str, dict[str, dict[str, Any]]]:
    packs: dict[str, dict[str, dict[str, Any]]] = {}
    for path in AUDIT.glob("ch??-review-v1.json"):
        pack = load(path)
        pack_id = pack.get("pack_id")
        if not isinstance(pack_id, str) or not pack_id:
            raise ValueError(f"{path}: missing pack_id")
        if pack_id in packs:
            raise ValueError(f"duplicate review pack id: {pack_id}")
        packs[pack_id] = {
            str(record["id"]): record
            for record in pack.get("records", [])
            if record.get("id")
        }
    return packs


def determine_pack_id(
    question: dict[str, Any],
    answer: dict[str, Any],
    *,
    chapter_packs: dict[str, dict[str, dict[str, Any]]],
    opl_pack: dict[str, Any],
    opl_records: dict[str, dict[str, Any]],
) -> str | None:
    question_pack = question.get("audit_pack")
    answer_pack = answer.get("audit_pack")
    qid = str(question.get("id") or "")
    if question_pack == answer_pack and question_pack in chapter_packs:
        record = chapter_packs[str(question_pack)].get(qid)
        if (
            record
            and record.get("decision") != "delete"
            and record.get("reviewed_question_hash") == sha256_text(str(question.get("content") or ""))
            and record.get("reviewed_answer_hash") == sha256_text(str(answer.get("answer") or ""))
        ):
            return str(question_pack)

    opl_record = opl_records.get(qid)
    opl_commit = opl_pack.get("source_commit")
    if (
        opl_pack.get("pack") == "opl-nau-curated-v1"
        and opl_record
        and question.get("source_commit") == opl_commit
        and answer.get("source_commit") == opl_commit
        and str(question.get("content") or "") == str(opl_record.get("content") or "")
        and str(answer.get("answer") or "") == str(opl_record.get("answer") or "")
    ):
        return "opl-nau-curated-v1"
    return None


def migrate(*, check_only: bool) -> int:
    chapter_packs = trusted_chapter_packs()
    opl_pack = load(OPL_PACK)
    opl_records = {str(item["id"]): item for item in opl_pack.get("questions", [])}
    approved = 0
    untraceable: list[str] = []

    for question_path in sorted(FORMED.glob("Ch??/questions.json")):
        answer_path = question_path.with_name("answers.json")
        question_data = load(question_path)
        answer_data = load(answer_path)
        answer_map = {str(item.get("id")): item for item in answer_data.get("answers", []) if item.get("id")}

        for question in question_data.get("questions", []):
            qid = str(question.get("id") or "")
            answer = answer_map.get(qid)
            if answer is None:
                untraceable.append(f"{qid}: missing answer record")
                continue
            pack_id = determine_pack_id(
                question,
                answer,
                chapter_packs=chapter_packs,
                opl_pack=opl_pack,
                opl_records=opl_records,
            )
            if pack_id is None:
                untraceable.append(f"{qid}: no trusted review pack provenance")
                continue
            review = approved_review(
                content=str(question.get("content") or ""),
                answer=str(answer.get("answer") or ""),
                pack_id=pack_id,
            )
            question["review"] = deepcopy(review)
            answer["review"] = deepcopy(review)
            valid, errors = validate_review_pair(question, answer)
            if not valid:
                raise ValueError(f"{qid}: invalid migrated review: {', '.join(errors)}")
            approved += 1

        if not check_only:
            write(question_path, question_data)
            write(answer_path, answer_data)

    if untraceable:
        raise ValueError("structured review migration refused records:\n- " + "\n- ".join(untraceable))
    return approved


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="validate without writing Data/Formed")
    args = parser.parse_args()
    count = migrate(check_only=args.check)
    action = "Validated" if args.check else "Migrated"
    print(f"{action} {count} traceable records to structured review schema v1.")


if __name__ == "__main__":
    main()
