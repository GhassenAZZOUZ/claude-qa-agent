# runner-template

A ready-made Playwright + playwright-bdd runner for the tests QA QualiGate writes.

```bash
cp -r runner-template/. qa-artifacts/
cd qa-artifacts
npm install
npx playwright install chromium
```

That's all. `test-writer` creates `steps/` (shared step definitions + fixtures) and `test-cases/` the first time it runs, and `test-execution-agent` sets `BASE_URL` / `API_BASE_URL` / `RUN_ID` for each run.

Using a saved login? Uncomment `storageState` in `playwright.config.ts` and keep `.auth/` out of git. For CI, `ci-test-setup` (WAY 10) generates a login setup project instead.

The config follows the **Playwright config contract** in `.claude/agents/test-execution-agent.md`. If you change it, keep the projects, tags, report paths, and `snapshotPathTemplate` as they are.
