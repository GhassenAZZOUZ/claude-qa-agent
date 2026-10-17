# Examples

What the agent actually produces, on a **fictional** shop (`shop.example.com`).
These are illustrative samples, not output from a real project. They show
the shape and level of detail you get from each WAY.

| File | Produced by | Trigger |
|---|---|---|
| [test-cases/checkout-discount-2026-10-09/](test-cases/checkout-discount-2026-10-09/) | `test-writer` (WAY 1/4) | `write it #148` |
| [bug-issue.md](bug-issue.md) | `bug-report` skill → GitLab issue (WAY 1/3) | `e2e it #148` / `report it …` |
| [session-report.md](session-report.md) | `session-report` skill (WAY 1) | `e2e it #148` |
| [mr-impact-comment.md](mr-impact-comment.md) | `mr-impact` (WAY 11) → MR comment | `test mr !87` |
| [release-readiness.md](release-readiness.md) | `release-readiness` (WAY 12) | `release check v2.3` |
| [traceability.md](traceability.md) | `traceability` (WAY 14) | `trace it #148` |
| [verify-fix-summary.md](verify-fix-summary.md) | `verify-fix` (WAY 9) → session summary | `verify it #161 #158` |
| [verify-fix-comment.md](verify-fix-comment.md) | `verify-fix` (WAY 9) → comment on a verified bug | `verify it #161` |
| [flaky-triage.md](flaky-triage.md) | `flaky-triage` (WAY 13) | `flaky` |
| [load-test/orders-api-2026-10-16/load.js](load-test/orders-api-2026-10-16/load.js) | `load-test-writer` (WAY 15) → k6 script | `load test orders-api` |
| [load-test-report.md](load-test-report.md) | `load-test` (WAY 15) → per-endpoint report | `load test orders-api` |

Story #148 is the running example: *"As a shopper, I want to apply a discount code at checkout so that I pay the promotional price."*
