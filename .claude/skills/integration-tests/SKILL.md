---
name: integration-tests
description: WAY 17 — write API integration tests (one OpenAPI spec) or E2E API tests (several specs, one per service), no execution. Use when the user says "integration it", "write integration tests", "integration tests from spec", "generate integration tests", "e2e api it", "write e2e api tests", "multi-service tests" — spec(s) → resource / cross-service map → workflow scenarios (lifecycle, chains, state transitions, referential integrity, async propagation, compensation) → playwright-bdd test files.
---

# WAY 17 — API Integration & E2E API Tests from Spec (write only)

WAY 2 tests each endpoint in isolation. This WAY tests how endpoints **work together**: data written by one call is read, changed, or rejected by the next. It writes the tests and stops. Nothing is run, nothing is filed unless the user asks.

Two modes, chosen by how many specs you get:

| Mode | Input | Scope | Tags | Folder |
|---|---|---|---|---|
| **Integration** | one spec | endpoints/resources of **one** service | `@api @integration` | `[api-slug]-integration-[YYYY-MM-DD]/` |
| **E2E API** | 2+ specs, each named after its service | a business flow across **several** services, incl. async effects | `@api @e2e-api` | `[flow-slug]-e2e-api-[YYYY-MM-DD]/` |

## Step 1: Gather inputs
**Required (ask if missing):** an OpenAPI 3.x / Swagger 2 spec (file path or URL), or for E2E API several, one per service:
```
Specs:
  orders   = https://orders.staging.myapp.com/openapi.json
  payments = ./specs/payments.yaml
```
Service names are lowercase (`[a-z][a-z0-9-]*`). They become the request prefix (`"orders:/v1/orders"`) and the env keys (`ORDERS_BASE_URL`, `ORDERS_TOKEN`; `-` becomes `_`).

**Optional:**
- `Issue:` a requirements issue (fetched with `issue.get`, per the `tracker` skill), to trace workflows to its ACs
- `Scope:` limit to spec `tags`, path prefixes, or operationIds (`Scope: orders, /v1/payments`)
- `Flows:` (E2E API) the business flows to cover, in plain words (`checkout: order → payment → stock reservation → confirmation`). Without it, propose flows from the cross-service map
- `file: true` file a `test-plan` issue with the index. `MR:`/`PR:` comment the plan on it (`change.comment`)

No `--env` resolution: nothing hits a URL. The tests read `API_BASE_URL` (integration) or `<SERVICE>_BASE_URL` (E2E API) when they run later.

## Phase 1: Map the spec(s)
1. Read each file or WebFetch each URL. Resolve `$ref`s. If one isn't a valid OpenAPI/Swagger document, stop and say which and why
2. Apply `Scope:`. Build a **resource map** per service, one row per resource:

| Resource | Create | Read | Update | Delete | List | ID field | Depends on | States |
|---|---|---|---|---|---|---|---|---|
| order | `POST /orders` | `GET /orders/{orderId}` | `PATCH /orders/{orderId}` | `DELETE /orders/{orderId}` | `GET /orders` | `id` | customer (`customerId` in body), product | `pending → paid → shipped`, `pending → cancelled` |

   - **Depends on**: a request field or path param whose name/description matches another resource's ID (`customerId`, `/customers/{id}/orders`), or an OpenAPI `links` object. Links win over name matching
   - **States**: from an `enum` field named `status`/`state`, plus action endpoints (`POST /orders/{id}/cancel`)
3. **E2E API only — cross-service map**, one row per link between services:

| From | To | Via | Sync / async | Evidence |
|---|---|---|---|---|
| `orders` order.id | `payments` payment.orderId | request field | sync | field name (inferred) |
| `orders` order.status=`paid` | `stock` reservation.status=`reserved` | event / consumer | async | description mentions "reserved on payment" (inferred) |

   - Evidence: `links` across specs, a field named after another service's resource ID, descriptions, `callbacks`/`webhooks`, AsyncAPI-style `x-` extensions. **Every cross-service row is `(inferred)`** unless a spec states it outright
   - **Async** when the effect isn't in the calling service's response: a consumer, a webhook, a status that changes later. Ask for the documented delay or SLA; default the poll to 10 s
4. Show the map(s) and the planned workflows (Phase 2, one line each) to the user. Mark guesses `(inferred)`. Ask once: "Anything wrong or missing?" Proceed on OK or after corrections

## Phase 2: Pick workflows
Plan the workflows that apply. Skip one only when the spec has no endpoint for it, and say so in the index.

**Integration** (per resource):

| Workflow | Asserts |
|---|---|
| **Lifecycle** | create → read returns what was sent → update → read shows the change → delete → read is 404 |
| **List consistency** | a created item appears in the list (with its filter, if any); after delete it's gone |
| **Cross-resource chain** | create the parent, create the child with the parent's ID, read the child, the reference resolves |
| **Referential integrity** | child with a non-existent parent ID → 4xx, never 2xx or 5xx; delete a parent that has children → the documented behavior (409, or cascade the child to 404) |
| **State transitions** | every allowed transition succeeds and is visible on read; each forbidden one (e.g. ship a cancelled order) → 409/422 and state is unchanged |
| **Idempotency** | PUT/DELETE repeated give the same final state; POST with an `Idempotency-Key` (if the spec documents one) creates once |
| **Ownership across calls** | resource created by user A: B can't read, update, or delete it (403/404), and it's unchanged afterwards. Only if the spec has a second auth scheme or `API_TEST_TOKEN_B` is set |

**E2E API** (per business flow):

| Workflow | Asserts |
|---|---|
| **Happy flow** | each step's effect is visible in the service that owns it: sync effects by a plain read, async ones by polling (`within N seconds …`) |
| **Propagation** | an update or cancel upstream reaches every downstream service (e.g. cancel order → reservation released) |
| **Failure & compensation** | a step fails (declined payment, out of stock): the flow stops, and every service already touched ends in its compensated state |
| **Cross-service integrity** | a downstream call with an ID unknown to the upstream service is rejected (4xx), never accepted |
| **Duplicate delivery** | repeating the triggering call (same `Idempotency-Key` if documented) creates **one** downstream effect, not two |

Per-endpoint checks (missing auth, invalid types, schema on each response) are WAY 2's job; don't repeat them here. Each workflow still validates the schema of its **final** read. E2E API flows don't repeat what the single-service integration workflows already cover inside one service.

## Phase 3: Write
Run `test-writer` with scenario type **`integration`** (one spec) or **`e2e-api`** (several), passing the spec(s), the confirmed map(s), the workflow list, the service names, and the `Issue:` content if given. It writes `Test#<nn>` triples plus the index `.md` in the folder from the mode table, one workflow per `Test#<nn>`.

If `test-writer` reports `NOT IMPLEMENTED` steps (an undocumented payload, an unclear dependency), list them for the user. Don't fill them in by guessing.

## Phase 4: Hand off
Reply with:
- the files written, and a table: `Test# | Workflow | Services / resources | Endpoints touched | Covers`
- skipped workflows and why (no DELETE endpoint, no second token, no documented compensation…)
- **E2E API:** the env values the run needs (`<SERVICE>_BASE_URL`, optional `<SERVICE>_TOKEN`, else `API_TEST_TOKEN` is used), and a note that these are slower and environment-dependent: run them on a schedule or before release, not on every MR (`--grep-invert @e2e-api` for MR pipelines)
- how to run them: `api it` on that folder, or from `qa-artifacts/`: `npx bddgen && npx playwright test --project=api --grep @integration` (or `--grep @e2e-api`)
- if `file: true`: file the `test-plan` issue (`issue.create`) and, with `MR:`/`PR:`, comment the summary (`change.comment`). Otherwise offer it in one line

## Rules
- Never run the tests or call the API in this WAY
- Data is created by the scenario and deleted by it (`the client will delete … after the scenario`), in every service that holds it, so runs don't depend on each other or on seed data
- A workflow never relies on another `Test#<nn>` having run first
- Async effects are polled until a deadline, never awaited with a fixed sleep
- Out of scope: asserting on queues, topics or databases directly, and consumer-driven contract tests (Pact). Only what the services' APIs expose is tested
