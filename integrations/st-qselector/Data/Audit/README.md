# Question Bank Audit Workspace

This directory contains generated audit artifacts for the current formed question bank.
The source documents in `Data/Origin` and the extracted records in
`Data/Formed` remain the traceable inputs.

- `question-audit-manifest.json`: one workflow record per question.
- `AUDIT_BASELINE.md`: human-readable baseline and priority queues.

Regenerate both files with:

```bash
python3 scripts/build_audit_manifest.py
node Program/scripts/generate-reviewed-index.mjs
python3 scripts/validate_release.py
```

Do not mark a question eligible for paper assembly until its structured review
has matching question/answer SHA-256 hashes, every workflow gate has passed,
and the manifest independently reports the same record as eligible. The legacy
free-text `review_status` field is descriptive only and is never an approval
signal.
