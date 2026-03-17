
- Task 1 baseline: store the exact worktree commit hash in `STRATEGY/pinpoint_invention_package/00_baseline_commit.txt` and let the validator fail until later package files are created.
- Task 2 schema lock: keep `01_pinpoint_employee_invention_report_ko.md` as a Korean-first skeleton only, with section control labels instead of full prose.
- Scope guardrails will centralize banned phrases and future-only items so later report prose cannot drift into automatic-registration or compareX-wide claims.
- The docx workflow remains manual/template-based: markdown package first, docx population second.
- Final validator now treats guardrails as the source of forbidden phrases and requires a final gap log before reporting PASS.
