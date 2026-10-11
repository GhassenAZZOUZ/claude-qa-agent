---
name: quick-bug
description: 'WAY 3 — quick bug report from a one-line description. Use when the user says "report it", "log this", "raise this", "file this issue", "बग रिपोर्ट करो", "इश्यू दर्ज करो" with input like "[Area], [Precondition], [Step 1 > Step 2 > Observe: what you saw]". Files the bug and writes a regression test for it.'
---

# WAY 3 — Quick Bug Report

1. Apply the `bug-report` skill. It parses `[Area], [Precondition], [Step 1 > Step 2 > Observe: …]` and derives the title, expected result, severity × priority and labels. It asks you if the Observe part or the expected result is missing
2. File the issue with those labels (`issue.create`, per the `tracker` skill). If the user gave a screenshot path, attach it (`file.attach`)
3. Run `test-writer` to write a regression test that reproduces the steps, tagged `@regression`, saved to `./qa-artifacts/test-cases/regression/bug-<ref>/Test#01.{md,feature,steps.ts}`. The test asserts the **expected** behavior, so it fails now and passes once the fix lands. `verify-fix` (WAY 9) runs it later
4. Print: issue ref, title, severity, URL, regression test path, and the hint "run `verify it <ref>` once a fix is deployed"
