#!/usr/bin/env python3
"""Build the deterministic, per-question audit ledger for the assignment bank.

This script never mutates the source question or answer JSON files. It writes
derived audit artifacts under Data/Audit so every later rewrite can be traced
back to the original chapter record and source document.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
FORMED = ROOT / "Data" / "Formed"
ORIGIN = ROOT / "Data" / "Origin"
OUTPUT_DIR = ROOT / "Data" / "Audit"
MANIFEST_PATH = OUTPUT_DIR / "question-audit-manifest.json"
SUMMARY_PATH = OUTPUT_DIR / "AUDIT_BASELINE.md"

URL_RE = re.compile(r"https?://\S+", re.I)
HAN_RE = re.compile(r"[\u3400-\u9fff]")
LATIN_WORD_RE = re.compile(r"\b[A-Za-z]{2,}\b")
PART_RE = re.compile(r"(?mi)^\s*(?:[a-h][.)]|\([a-h]\)|\d{1,2}[.)])\s+")
IMAGE_PATH_RE = re.compile(r"^[\w./\- ]+\.(?:png|jpe?g|gif|webp)$", re.I)

FORMAT_RULES: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("pandoc_underline", re.compile(r"\{\.underline\}")),
    ("pandoc_html", re.compile(r"\{=html\}|<!--.*?-->", re.S)),
    ("strikethrough_residue", re.compile(r"~~")),
    ("replacement_character", re.compile(r"�")),
    ("legacy_subscript", re.compile(r"\b[Hh]~[0a]~")),
    ("legacy_superscript", re.compile(r"\b[A-Za-z0-9]+\^[A-Za-z0-9.+-]+\^")),
    ("escaped_line_end", re.compile(r"\\\s*$", re.M)),
)

CONTEXT_RULES: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("references_previous_exercise", re.compile(r"\b(?:exercise|question|problem)\s+\d+\s+(?:above|previously)\b", re.I)),
    ("references_missing_figure", re.compile(r"\b(?:figure|table|graph)\s+[\d.]+\s+(?:above|below|gives)\b", re.I)),
    # Do not flag answer-choice phrases such as “None of the above” or
    # “All of the above”; those are self-contained options, not missing context.
    ("references_unprovided_context", re.compile(r"(?<!of )\b(?:the|as)\s+(?:above|below)\b", re.I)),
)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def detect_language(text: str) -> str:
    without_urls = URL_RE.sub("", text)
    han_count = len(HAN_RE.findall(without_urls))
    latin_count = len(LATIN_WORD_RE.findall(without_urls))
    if han_count == 0:
        return "en"
    if latin_count >= 3:
        return "mixed"
    return "zh"


def resolve_source(source: str) -> dict[str, Any]:
    urls = URL_RE.findall(source)
    local_paths: list[str] = []
    missing_paths: list[str] = []
    for raw_part in source.split("|"):
        part = raw_part.strip()
        if not part or URL_RE.search(part) or part.startswith("ROTEL "):
            continue
        candidate = ORIGIN / part
        if candidate.is_file():
            local_paths.append(part)
        else:
            missing_paths.append(part)

    if urls and local_paths:
        kind = "mixed"
    elif urls:
        kind = "external"
    else:
        kind = "local"

    return {
        "raw": source,
        "kind": kind,
        "local_paths": local_paths,
        "external_urls": urls,
        "missing_paths": missing_paths,
        "resolvable": bool(urls or local_paths) and not missing_paths,
    }


def resolve_asset(chapter_dir: Path, relative: str) -> str | None:
    candidates = (
        chapter_dir / relative,
        chapter_dir / "Assests" / relative,
        chapter_dir / "Answers" / relative,
        chapter_dir / "Answer" / relative,
    )
    for candidate in candidates:
        try:
            candidate.resolve().relative_to(chapter_dir.resolve())
        except ValueError:
            continue
        if candidate.is_file():
            return candidate.relative_to(chapter_dir).as_posix()
    return None


def analyze_record(
    *, chapter: str, chapter_dir: Path, question: dict[str, Any], answer: dict[str, Any] | None
) -> dict[str, Any]:
    qid = str(question["id"])
    content = str(question.get("content") or "")
    answer_text = None if answer is None else answer.get("answer")
    answer_value = None if answer_text is None else str(answer_text)
    source = resolve_source(str(question.get("source") or ""))
    language = detect_language(content)
    answer_language = "missing" if not answer_value else detect_language(answer_value)

    formula_refs = [str(value) for value in question.get("formula_refs") or []]
    data_refs = [str(value) for value in question.get("data_refs") or []]
    asset_refs = formula_refs + data_refs
    if answer_value and IMAGE_PATH_RE.fullmatch(answer_value.strip()):
        asset_refs.append(answer_value.strip())

    resolved_assets: list[dict[str, Any]] = []
    for asset in asset_refs:
        resolved = resolve_asset(chapter_dir, asset)
        resolved_assets.append({"reference": asset, "resolved_path": resolved, "available": bool(resolved)})

    issue_codes: list[str] = []
    if not content.strip():
        issue_codes.append("empty_question")
    if not answer_value or not answer_value.strip():
        issue_codes.append("missing_answer")
    if language != "en":
        issue_codes.append("question_requires_english")
    if answer_language not in {"en", "missing"}:
        issue_codes.append("answer_requires_english")
    if question.get("type") in {None, "", "unknown"}:
        issue_codes.append("question_type_unclassified")
    if not source["resolvable"]:
        issue_codes.append("source_unresolved")
    if any(not item["available"] for item in resolved_assets):
        issue_codes.append("asset_missing")

    format_findings: list[str] = []
    combined_text = f"{content}\n{answer_value or ''}"
    for code, pattern in FORMAT_RULES:
        if pattern.search(combined_text):
            format_findings.append(code)
            issue_codes.append(code)

    context_findings: list[str] = []
    for code, pattern in CONTEXT_RULES:
        if pattern.search(content):
            context_findings.append(code)
            issue_codes.append(code)

    part_count = len(PART_RE.findall(content))
    grouping_status = "multi_part_candidate" if part_count >= 2 else "atomic_candidate"
    if part_count >= 2:
        issue_codes.append("multi_part_requires_alignment_review")

    review_status = question.get("review_status") or (answer or {}).get("review_status")
    previously_reviewed = bool(review_status and re.search(r"审核|审校|reviewed", str(review_status), re.I))

    unique_issues = sorted(set(issue_codes))
    return {
        "id": qid,
        "chapter": chapter,
        "source": source,
        "original": {
            "question_hash": sha256_text(content),
            "answer_hash": sha256_text(answer_value or ""),
            "type": question.get("type") or "unknown",
            "difficulty": question.get("difficulty"),
            "keywords": question.get("keywords") or [],
            "formula_refs": formula_refs,
            "data_refs": data_refs,
            "review_status": review_status,
        },
        "diagnostics": {
            "question_language": language,
            "answer_language": answer_language,
            "answer_present": bool(answer_value and answer_value.strip()),
            "source_resolvable": source["resolvable"],
            "assets": resolved_assets,
            "format_findings": sorted(set(format_findings)),
            "context_findings": sorted(set(context_findings)),
            "detected_part_count": part_count,
            "grouping_status": grouping_status,
            "previously_reviewed": previously_reviewed,
            "issue_codes": unique_issues,
        },
        "workflow": {
            "decision": "pending",
            "english_status": "passed" if language == "en" and answer_language in {"en", "missing"} else "needs_work",
            "source_recovery_status": "not_needed" if source["resolvable"] else "needs_work",
            "grouping_review_status": "pending",
            "independent_solution_status": "pending",
            "verification_status": "pending",
            "metadata_status": "pending",
            "render_status": "pending",
            "eligible_for_paper": False,
        },
        "audit_notes": [],
    }


def build_manifest() -> dict[str, Any]:
    records: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for chapter_dir in sorted(FORMED.glob("Ch[0-9][0-9]")):
        question_file = chapter_dir / "questions.json"
        answer_file = chapter_dir / "answers.json"
        if not question_file.is_file():
            continue

        answer_map: dict[str, dict[str, Any]] = {}
        if answer_file.is_file():
            for answer in load_json(answer_file).get("answers", []):
                if answer.get("id"):
                    answer_map[str(answer["id"])] = answer

        for question in load_json(question_file).get("questions", []):
            qid = str(question.get("id") or "")
            if not qid:
                raise ValueError(f"question without id in {question_file}")
            if qid in seen_ids:
                raise ValueError(f"duplicate question id: {qid}")
            seen_ids.add(qid)
            records.append(
                analyze_record(
                    chapter=chapter_dir.name,
                    chapter_dir=chapter_dir,
                    question=question,
                    answer=answer_map.get(qid),
                )
            )

    issue_counts = Counter(code for record in records for code in record["diagnostics"]["issue_codes"])
    chapter_counts = Counter(record["chapter"] for record in records)
    language_counts = Counter(record["diagnostics"]["question_language"] for record in records)
    answer_language_counts = Counter(record["diagnostics"]["answer_language"] for record in records)
    grouping_counts = Counter(record["diagnostics"]["grouping_status"] for record in records)

    return {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_roots": {
            "origin": ORIGIN.relative_to(ROOT).as_posix(),
            "formed": FORMED.relative_to(ROOT).as_posix(),
        },
        "policy": {
            "target_language": "en",
            "paper_requires_verified_answer": True,
            "multi_part_questions_are_atomic": True,
            "source_files_are_read_only": True,
        },
        "summary": {
            "total_questions": len(records),
            "chapters": dict(sorted(chapter_counts.items())),
            "question_languages": dict(sorted(language_counts.items())),
            "answer_languages": dict(sorted(answer_language_counts.items())),
            "grouping_candidates": dict(sorted(grouping_counts.items())),
            "issue_counts": dict(sorted(issue_counts.items())),
            "eligible_for_paper": 0,
        },
        "questions": records,
    }


def render_summary(manifest: dict[str, Any]) -> str:
    summary = manifest["summary"]
    issue_counts = summary["issue_counts"]
    missing_answer_ids = [
        record["id"]
        for record in manifest["questions"]
        if "missing_answer" in record["diagnostics"]["issue_codes"]
    ]
    unresolved_sources = [
        record["id"]
        for record in manifest["questions"]
        if "source_unresolved" in record["diagnostics"]["issue_codes"]
    ]

    lines = [
        "# Question Bank Audit Baseline",
        "",
        "> Generated by `scripts/build_audit_manifest.py`. Do not edit counts by hand.",
        "",
        "## Scope",
        "",
        f"- Total questions: **{summary['total_questions']}**",
        f"- Target language: **English**",
        f"- Questions currently eligible for paper assembly: **{summary['eligible_for_paper']}**",
        "- Source files remain read-only; all rewrites must be traceable through the manifest.",
        "",
        "## Language baseline",
        "",
        f"- English questions: {summary['question_languages'].get('en', 0)}",
        f"- Chinese questions: {summary['question_languages'].get('zh', 0)}",
        f"- Mixed-language questions: {summary['question_languages'].get('mixed', 0)}",
        "",
        "## Priority findings",
        "",
        f"- Missing answers: {issue_counts.get('missing_answer', 0)}",
        f"- Unclassified question types: {issue_counts.get('question_type_unclassified', 0)}",
        f"- Multi-part alignment candidates: {issue_counts.get('multi_part_requires_alignment_review', 0)}",
        f"- Unresolved sources: {issue_counts.get('source_unresolved', 0)}",
        f"- Missing referenced assets: {issue_counts.get('asset_missing', 0)}",
        "",
        "## Missing-answer queue",
        "",
        ", ".join(f"`{qid}`" for qid in missing_answer_ids) or "None",
        "",
        "## Unresolved-source queue",
        "",
        ", ".join(f"`{qid}`" for qid in unresolved_sources) or "None",
        "",
        "## Workflow gate",
        "",
        "A question becomes eligible only after English normalization, source/grouping review,",
        "independent solution, second verification, metadata review, and render validation all pass.",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    manifest = build_manifest()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    SUMMARY_PATH.write_text(render_summary(manifest), encoding="utf-8")
    print(f"Wrote {len(manifest['questions'])} audit records to {MANIFEST_PATH}")
    print(f"Wrote baseline summary to {SUMMARY_PATH}")


if __name__ == "__main__":
    main()
