# Errors and retries

## Methods do not throw

Every method returns a discriminated union. An API failure is a value, not an exception.

```typescript
type PhylaxResult<T> =
  | { success: true;  status: number; data: T }
  | { success: false; status: number; code: PhylaxErrorCode; error: string; cause?: string }
```

The SDK runs inside CI steps, editor extensions and MCP servers, where an unhandled rejection is a crashed process rather than a handled error. Callers get an exhaustive union rather than a `try` block they might forget to write.

Only programmer errors throw. A missing token or a non callable `fetch` raises a `TypeError` at construction, because those are bugs rather than expected outcomes.

## Error codes

Branch on `code` rather than parsing `error`, which is a human readable string and may change.

| Code | Status | Meaning |
| --- | --- | --- |
| `unauthenticated` | 401 | Token missing, malformed or revoked. |
| `plan_required` | 402 | Capability is not part of this subscription. |
| `forbidden` | 403 | Token lacks a required permission. |
| `not_found` | 404 | Resource does not exist. |
| `timeout` | 408 or local | Exceeded `timeoutMs`. |
| `rate_limited` | 429 | Too many requests. |
| `quota_exceeded` | 429 or 402 | Plan quota spent for the period. |
| `invalid_request` | other 4xx | Malformed input. |
| `server_error` | 5xx | Transient server fault. |
| `network_error` | none | Connection failed before a response. |
| `aborted` | none | Cancelled through the supplied `AbortSignal`. |

## Retry policy

Reads and writes are treated differently, because replaying them carries different risk.

**Idempotent requests** (`GET`, `HEAD`, `PUT`) retry on `408`, `429`, `500`, `502`, `503` and `504`. Replaying them cannot create a second side effect.

**Writes** (`POST`, `PATCH`, `DELETE`) retry only on `408` and `429`. Those responses are produced before the request reaches the handler, so the write definitely did not apply. A `5xx` on a write is ambiguous, because the server may have committed before failing to respond, and replaying it would create a duplicate webhook, repository, or evaluation. Those are surfaced rather than retried.

A transport level failure on a write is treated the same way, and for the same reason.

## Backoff

`Retry-After` is honoured whenever the server sends it, as a number of seconds or an HTTP date, because the server knows when the window reopens. The value is capped at 30 seconds so a hostile or mistaken header cannot stall a build.

Without that header the delay is exponential backoff with full jitter, `random(0, 2^attempt)` seconds, capped at 30 seconds.

The jitter is not cosmetic. If every client that was rejected in the same window doubles its delay on the same schedule, they all retry at the same instant, exhaust the next window, and reproduce the thundering herd the backoff was meant to prevent. Randomising across the whole interval spreads them out.

## Cancellation

Pass an `AbortSignal` to cancel in flight work. A caller abort is reported as `aborted` and is never retried, because the caller asked for it to stop.

```typescript
const controller = new AbortController()
setTimeout(() => controller.abort(), 5_000)

const result = await phylax.artifacts.verify(artifact, {
  signal: controller.signal,
})
```

## Token redaction

The API token never appears in `error` or `cause`. Response bodies are scanned and the token replaced before being returned, so a `401` body that echoes the credential cannot reach a log or a CI transcript. There is a test that fails if this regresses.
