---
name: integration-tests
description: WAY 17 — write API integration tests from an OpenAPI spec, no execution. Use when the user says "integration it", "write integration tests", "integration tests from spec", "generate integration tests" — spec → resource dependency map → multi-endpoint workflow scenarios (lifecycle, cross-resource chains, state transitions, referential integrity) → playwright-bdd test files.
---

# WAY 17 — Integration Tests from Spec (write only)

WAY 2 tests each endpoint in isolation. This WAY tests how endpoints **work together**: data written by one call is read, changed, or rejected by the next. It writes the tests and stops. Nothing is run, nothing is filed unless the user asks.

## Step 1: Gather inputs
**Required (ask if missing):** an OpenAPI 3.x / Swagger 2 spec (file path or URL).
**Optional:**
- `Issue:` a requirements issue (fetched with `issue.get`, per the `tracker` skill), to trace workflows to its ACs
- `Scope:` limit to spec `tags`, path prefixes, or operationIds (`Scope: orders, /v1/payments`)
- `file: true` file a `test-plan` issue with the index. `MR:`/`PR:` comment the plan on it (`change.comment`)

No `--env` resolution: nothing hits a URL. The tests read `API_BASE_URL` when they run later.

## Phase 1: Map the spec
1. Read the file or WebFetch the URL. Resolve `$ref`s. If it isn't a valid OpenAPI/Swagger document, stop and say why
2. Apply `Scope:`. Build a **resource map**, one row per resource:

| Resource | Create | Read | Update | Delete | List | ID field | Depends on | States |
|---|---|---|---|---|---|---|---|---|
| order | `POST /orders` | `GET /orders/{orderId}` | `PATCH /orders/{orderId}` | `DELETE /orders/{orderId}` | `GET /orders` | `id` | customer (`customerId` in body), product | `pending → paid → shipped`, `pending → cancelled` |

   - **Depends on**: a request field or path param whose name/description matches another resource's ID (`customerId`, `/customers/{id}/orders`), or an OpenAPI `links` object. Links win over name matching
   - **States**: from an `enum` field named `status`/`state`, plus action endpoints (`POST /orders/{id}/cancel`)
3. Show the map and the planned workflows (Phase 2 list, one line each) to the user. Mark guessed dependencies `(inferred)`. Ask once: "Anything wrong or missing?" Proceed on OK or after corrections

## Phase 2: Pick workflows
For each resource, plan the workflows that apply. Skip one only when the spec has no endpoint for it, and say so in the index.

| Workflow | Asserts |
|---|---|
| **Lifecycle** | create → read returns what was sent → update → read shows the change → delete → read is 404 |
| **List consistency** | a created item appears in the list (with its filter, if any); after delete it's gone |
| **Cross-resource chain** | create the parent, create the child with the parent's ID, read the child, the reference resolves |
| **Referential integrity** | child with a non-existent parent ID → 4xx, never 2xx or 5xx; delete a parent that has children → the documented behavior (409, or cascade the child to 404) |
| **State transitions** | every allowed transition succeeds and is visible on read; each forbidden one (e.g. ship a cancelled order) → 409/422 and state is unchanged |
| **Idempotency** | PUT/DELETE repeated give the same final state; POST with an `Idempotency-Key` (if the spec documents one) creates once |
| **Ownership across calls** | resource created by user A: B can't read, update, or delete it (403/404), and it's unchanged afterwards. Only if the spec has a second auth scheme or `API_TEST_TOKEN_B` is set |

Per-endpoint checks (missing auth, invalid types, schema on each response) are WAY 2's job; don't repeat them here. Each workflow still validates the schema of its **final** read.

## Phase 3: Write
Run `test-writer` with scenario type **`integration`**, passing the spec, the confirmed resource map, the workflow list, and the `Issue:` content if given. It writes `Test#<nn>` triples under `./qa-artifacts/test-cases/[api-slug]-integration-[YYYY-MM-DD]/` plus the index `.md`, one workflow per `Test#<nn>`, tagged `@api @integration`.

If `test-writer` reports `NOT IMPLEMENTED` steps (an undocumented payload, an unclear dependency), list them for the user. Don't fill them in by guessing.

## Phase 4: Hand off
Reply with:
- the files written, and a table: `Test# | Workflow | Resources | Endpoints touched | Covers`
- skipped workflows and why (no DELETE endpoint, no second token…)
- how to run them: `api it` on that folder, or from `qa-artifacts/`: `npx bddgen && npx playwright test --project=api --grep @integration`
- if `file: true`: file the `test-plan` issue (`issue.create`) and, with `MR:`/`PR:`, comment the summary (`change.comment`). Otherwise offer it in one line

## Rules
- Never run the tests or call the API in this WAY
- Data is created by the scenario and deleted by it (`the client will delete … after the scenario`), so runs don't depend on each other or on seed data
- A workflow never relies on another `Test#<nn>` having run first
