# API reference

Every method returns a `PhylaxResult<T>`. See [Errors and retries](./errors-and-retries.md) for the failure shape.

## Constructing a client

```typescript
import { PhylaxSdk } from '@phyi/sdk'

const phylax = new PhylaxSdk({ apiToken: process.env.PHYLAX_API_TOKEN })
```

| Option | Default | Notes |
| --- | --- | --- |
| `apiToken` | none | Required. Throws if absent. |
| `baseUrl` | `https://api.phyi.dev` | |
| `timeoutMs` | `30000` | Per attempt, not per call. |
| `maxRetries` | `3` | Total attempts. `1` disables retries. |
| `userAgent` | none | Prepended to the SDK user agent so traffic can be attributed to your tool. |
| `fetch` | `globalThis.fetch` | Injection point for tests. |

## artifacts

The resource most integrations use. Answers whether something is safe to install, ship, or load.

| Method | Description |
| --- | --- |
| `verify(artifact, options?)` | Verify one package URL. |
| `verifyMany(artifacts, options?)` | Verify many in one request. Preferred for lockfiles. |
| `get(artifact, options?)` | Fetch a stored record without re-evaluating. |
| `list(params?, options?)` | List known artifacts. |
| `search(query, params?, options?)` | Resolve a name to a package URL. |

`VerifyOptions` accepts `policy` to evaluate against a named policy, and `include` to request extra detail such as `vulnerabilities`, `licenses` or `provenance`.

```typescript
await phylax.artifacts.verify('pkg:npm/express@4.18.2', {
  policy: 'prod-runtime-policy',
  include: ['vulnerabilities', 'licenses'],
})
```

## attestations

Signed evidence behind a verdict.

| Method | Description |
| --- | --- |
| `list(artifact, params?, options?)` | Attestations for an artifact, newest first. |
| `get(id, options?)` | One attestation by id. |
| `verify(bundle, options?)` | Check a bundle signature server side. |

For a genuinely offline check, fetch the public keys from `serverIdentity()` and verify the bundle locally instead of calling `verify`.

## policies

How an organization turns a risk score into a decision.

| Method | Description |
| --- | --- |
| `list(options?)` | All policies. |
| `get(id, options?)` | One policy. |
| `create(policy, options?)` | Create a policy. |
| `update(id, policy, options?)` | Partial update. |
| `delete(id, options?)` | Remove a policy. |
| `evaluate(input, options?)` | Evaluate an artifact against a policy. |

## repositories

Continuous verification of a source repository.

| Method | Description |
| --- | --- |
| `list(options?)` | Registered repositories. |
| `get(id, options?)` | One repository. |
| `add(input, options?)` | Register for continuous verification. |
| `remove(id, options?)` | Stop verifying. |
| `verify(url, options?)` | One off verification without registering. |

## webhooks

Delivery of verdict changes, so you are not polling.

| Method | Description |
| --- | --- |
| `list(options?)` | All endpoints. |
| `get(id, options?)` | One endpoint. |
| `create(input, options?)` | Register an endpoint. Store the secret, it is not returned again. |
| `update(id, input, options?)` | Change url, events, or active state. |
| `delete(id, options?)` | Remove an endpoint. |

See [Webhooks](./webhooks.md) for verifying inbound deliveries.

## quota

Plan and permission introspection. See [Plans and quota](./plans-and-quota.md).

| Method | Description |
| --- | --- |
| `entitlements(options?)` | Plan, permissions and remaining quota for the token. |
| `checkAccess(method, entitlements)` | Whether a method is permitted, with reasons when not. |
| `getRequirement(method)` | Quota cost, permissions and minimum plan for a method. |
| `totalQuotaCost(methods)` | Sum the cost of a planned batch. |
| `methodsForPlan(plan)` | Everything a plan unlocks. |
| `methodsRequiringPermission(permission)` | Reverse lookup. |

## Account and status

| Method | Description |
| --- | --- |
| `health(options?)` | Reachability and credential check. |
| `serverIdentity(options?)` | Public keys for offline attestation verification. |
| `me(options?)` | The account a token belongs to. |

## Request options

Every method accepts an optional final argument.

| Field | Description |
| --- | --- |
| `signal` | An `AbortSignal` to cancel the request. |
| `query` | Extra query parameters, merged last. |

```typescript
const controller = new AbortController()
setTimeout(() => controller.abort(), 5_000)

await phylax.artifacts.verify('pkg:npm/express@4.18.2', {
  signal: controller.signal,
})
```
