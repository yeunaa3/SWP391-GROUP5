# REST API conventions

## Base contract

- Base path: `/api`.
- JSON request/response uses `camelCase`; database columns use `snake_case`.
- Dates are ISO-8601 UTC timestamps, for example `2026-10-04T08:30:00Z`.
- Money is a decimal string/number plus a three-letter currency code; never use floating-point calculations in Java.
- List endpoints use `page`, `size`, `sort` and return content plus page metadata.

## Authentication and authorization

- Login creates a Spring Security server-side session.
- Browser sends the session cookie with `credentials: include`.
- `GET /api/auth/csrf` initializes the `XSRF-TOKEN`; React returns it as `X-XSRF-TOKEN` on POST/PUT/PATCH/DELETE.
- Backend checks role and ownership/company scope for every protected record.
- Payment webhooks are exempt from browser CSRF but must pass provider signature validation.

## Status codes

| Code | Meaning |
| --- | --- |
| 200 | Successful read/update/action |
| 201 | Resource created |
| 204 | Successful action with no response body |
| 400 | Invalid request shape/field |
| 401 | No valid session |
| 403 | Role or ownership denied |
| 404 | Resource unavailable in caller scope |
| 409 | Duplicate or concurrent conflict |
| 422 | Business/state transition rejected |

Errors use the shared `ApiError` structure: timestamp, status, error, message and path. Do not expose stack traces, SQL text or provider secrets.

## Idempotency and concurrency

- Checkout/submit endpoints accept an `Idempotency-Key` when a repeated request could duplicate money or state.
- Payment callbacks are deduplicated with provider event ID and transaction reference.
- Review/booking/campaign updates must carry an expected version or expected current state.
- Slot availability is informational; creating the hold performs a second check inside a locking transaction.

## Endpoint ownership by flow

The proposed endpoint groups and acceptance conditions are in `docs/planning/CODING_PLAN.md`. Add exact request/response examples here before frontend and backend implementations are merged.

## PUB-02 article search

Public `GET /api/articles/search` accepts `query` (title/summary, max 200 characters), `category` (active slug), `access=all|public|premium`, ISO dates `from`/`to` (Vietnam time, inclusive end), `sort=newest|oldest|popular`, zero-based `page` (default 0) and `size` (default 12, maximum 50). Popular uses the existing views_count. Invalid parameters return 400; no matches return an empty page.

Response contains `content` (article summaries), `page`, `size`, `totalElements`, `totalPages`, `first`, `last`. Only published articles are returned; filtering Premium does not grant full-content access. Literal `%` and `_` in keywords are escaped.

Public `GET /api/articles/categories` returns active categories as `{slug,name}` records. Existing `/api/articles` feed API remains unchanged. `/search` opens the filter form; latest/category browsing without a keyword uses the news-card view. No database migration is required.
