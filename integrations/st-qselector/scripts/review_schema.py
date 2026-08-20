#!/usr/bin/env python3
"""Shared structured-review helpers for question-bank build scripts.

The legacy ``review_status`` string is intentionally not an approval signal.
Only a review object whose hashes match the current question and answer, and
whose required workflow gates all passed, can make a record paper-eligible.
"""

from __future__ import annotations

import hashlib
from copy import deepcopy
from typing import Any, Mapping, MutableMapping


REVIEW_SCHEMA_VERSION = 1
REQUIRED_GATES = (
    "english",
    "source",
    "grouping",
    "independent_solution",
    "verification",
    "metadata",
    "render",
)


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def approved_review(*, content: str, answer: str, pack_id: str) -> dict[str, Any]:
    if not content.strip() or not answer.strip():
        raise ValueError("an approved review requires non-empty question and answer text")
    if not pack_id.strip():
        raise ValueError("an approved review requires a traceable pack_id")
    return {
        "schema_version": REVIEW_SCHEMA_VERSION,
        "status": "approved",
        "pack_id": pack_id,
        "question_hash": sha256_text(content),
        "answer_hash": sha256_text(answer),
        "gates": {gate: "passed" for gate in REQUIRED_GATES},
    }


def pending_review(*, content: str, answer: str, pack_id: str) -> dict[str, Any]:
    return {
        "schema_version": REVIEW_SCHEMA_VERSION,
        "status": "pending",
        "pack_id": pack_id,
        "question_hash": sha256_text(content),
        "answer_hash": sha256_text(answer),
        "gates": {gate: "pending" for gate in REQUIRED_GATES},
    }


def stamp_approved_review(
    question: MutableMapping[str, Any],
    answer: MutableMapping[str, Any],
    *,
    pack_id: str,
) -> dict[str, Any]:
    review = approved_review(
        content=str(question.get("content") or ""),
        answer=str(answer.get("answer") or ""),
        pack_id=pack_id,
    )
    question["review"] = deepcopy(review)
    answer["review"] = deepcopy(review)
    return review


def validate_review_pair(
    question: Mapping[str, Any],
    answer: Mapping[str, Any] | None,
) -> tuple[bool, list[str]]:
    errors: list[str] = []
    if answer is None:
        return False, ["answer_record_missing"]

    question_review = question.get("review")
    answer_review = answer.get("review")
    if not isinstance(question_review, Mapping):
        errors.append("question_review_missing")
    if not isinstance(answer_review, Mapping):
        errors.append("answer_review_missing")
    if errors:
        return False, errors

    assert isinstance(question_review, Mapping)
    assert isinstance(answer_review, Mapping)
    for label, review in (("question", question_review), ("answer", answer_review)):
        if review.get("schema_version") != REVIEW_SCHEMA_VERSION:
            errors.append(f"{label}_review_schema_invalid")
        if review.get("status") != "approved":
            errors.append(f"{label}_review_not_approved")
        if not isinstance(review.get("pack_id"), str) or not str(review.get("pack_id")).strip():
            errors.append(f"{label}_review_pack_missing")
        gates = review.get("gates")
        if not isinstance(gates, Mapping):
            errors.append(f"{label}_review_gates_missing")
        else:
            for gate in REQUIRED_GATES:
                if gates.get(gate) != "passed":
                    errors.append(f"{label}_review_gate_{gate}_not_passed")

    content = str(question.get("content") or "")
    answer_text = str(answer.get("answer") or "")
    if not content.strip():
        errors.append("question_empty")
    if not answer_text.strip():
        errors.append("answer_empty")
    expected_question_hash = sha256_text(content)
    expected_answer_hash = sha256_text(answer_text)
    for label, review in (("question", question_review), ("answer", answer_review)):
        if review.get("question_hash") != expected_question_hash:
            errors.append(f"{label}_review_question_hash_mismatch")
        if review.get("answer_hash") != expected_answer_hash:
            errors.append(f"{label}_review_answer_hash_mismatch")

    for field in ("status", "pack_id", "question_hash", "answer_hash", "gates"):
        if question_review.get(field) != answer_review.get(field):
            errors.append(f"review_pair_{field}_mismatch")

    return not errors, sorted(set(errors))
