# Plans and quota

Access to Phylax is controlled by the subscription plan attached to your API token and by the permissions granted to that token. The SDK models both, so you can check entitlement before spending a call rather than discovering the limit through a rejected request.

## The plans

| Plan | Who it is for | API access |
| --- | --- | --- |
| `anonymous` | The public, with no account | None |
| `builder` | Individual developers and researchers | Keys, with a daily allowance |
| `marketplace` | Engineering teams with private code | Unlimited, on a priority queue |
| `enterprise` | Organizations needing governance and compliance | Custom volume |

`anonymous` is the only free plan and it has no programmatic access at all. It covers the public catalog, search and public scores through the web, at a capped rate. Every method in this SDK requires `builder` or above, so a token is always attached to a paid subscription.

Plans are cumulative. A `marketplace` token can do everything a `builder` token can.

## Checking what a token can do

```typescript
const entitlements = await phylax.quota.entitlements()

if (entitlements.success) {
  console.log(entitlements.data.plan)
  console.log(entitlements.data.quota_remaining)
}
```

Read this once at startup and cache it. It changes when a subscription changes, not between requests.

## Checking a specific method

`checkAccess` compares a method against live entitlements and explains any refusal.

```typescript
const check = phylax.quota.checkAccess('policies.evaluate', entitlements.data)

if (!check.allowed) {
  console.error(check.reasons.join('; '))
  // requires the marketplace plan or above, current plan is builder
}
```

Three things can block a call, and all three are reported together rather than one at a time.

| Reason | Meaning |
| --- | --- |
| `missing permissions` | The token was not granted a permission the method needs. |
| `requires the ... plan` | The capability is not part of the current subscription. |
| `quota exhausted` | The plan allowance is spent for the current period. |
| `unknown method` | The method is not in the requirement table. Refused rather than assumed safe. |

That last row is deliberate. An unrecognised method name is refused, so a typo or a method from a newer SDK version fails closed instead of appearing to be allowed.

## Planning a batch

Sum the cost of a run before starting it, so a long job fails at the start rather than halfway through.

```typescript
const cost = phylax.quota.totalQuotaCost([
  'artifacts.verify',
  'policies.evaluate',
  'attestations.verify',
])
```

This matters most on `builder`, where the allowance is daily. A run that would exceed it is better stopped before it commits half its work.

## Discovering the surface

```typescript
phylax.quota.methodsForPlan('builder')
phylax.quota.methodsRequiringPermission('policies:write')
phylax.quota.getRequirement('artifacts.verify')
```

`methodsForPlan('anonymous')` returns an empty array, which is the honest answer rather than an oversight.

## Quota cost by method

Costs are relative units. A verification is one unit; anything that runs a policy or a signature check is two.

| Method | Cost | Permissions | Minimum plan |
| --- | --- | --- | --- |
| `artifacts.verify` | 1 | `artifacts:verify` | builder |
| `artifacts.verifyMany` | 1 | `artifacts:verify` | builder |
| `artifacts.get` | 1 | `artifacts:read` | builder |
| `artifacts.list` | 1 | `artifacts:read` | builder |
| `artifacts.search` | 1 | `artifacts:read` | builder |
| `attestations.list` | 1 | `attestations:read` | builder |
| `attestations.get` | 1 | `attestations:read` | builder |
| `attestations.verify` | 2 | `attestations:verify` | builder |
| `repositories.list` | 1 | `repositories:read` | builder |
| `repositories.get` | 1 | `repositories:read` | builder |
| `repositories.add` | 1 | `repositories:write` | builder |
| `repositories.remove` | 1 | `repositories:write` | builder |
| `repositories.verify` | 2 | `repositories:read` | builder |
| `webhooks.list` | 1 | `webhooks:read` | builder |
| `webhooks.get` | 1 | `webhooks:read` | builder |
| `webhooks.create` | 1 | `webhooks:write` | builder |
| `webhooks.update` | 1 | `webhooks:write` | builder |
| `webhooks.delete` | 1 | `webhooks:write` | builder |
| `policies.list` | 1 | `policies:read` | marketplace |
| `policies.get` | 1 | `policies:read` | marketplace |
| `policies.create` | 1 | `policies:write` | marketplace |
| `policies.update` | 1 | `policies:write` | marketplace |
| `policies.delete` | 1 | `policies:write` | marketplace |
| `policies.evaluate` | 2 | `policies:evaluate` | marketplace |

Policy controls are the `marketplace` boundary, because a policy is how a team enforces one decision across everyone. Everything else in the SDK is available to an individual `builder` subscription.

Some limits are not expressible in this table and are enforced by the server. A `builder` subscription may hold one webhook rather than many, and may run CI against public repositories rather than private ones. The method is available at `builder`; the specific request may still be refused.

## Handling a refusal at runtime

Client side checks are advisory. The server is the authority, and it can refuse a call the local check allowed, for example when the allowance ran out between the check and the call, or when a `builder` token asks to add a second webhook. Branch on the error code.

```typescript
const result = await phylax.policies.evaluate({ artifact })

if (!result.success) {
  switch (result.code) {
    case 'plan_required':
      // Capability is not part of this subscription.
      break
    case 'forbidden':
      // Token is missing a permission.
      break
    case 'quota_exceeded':
      // Period allowance is spent.
      break
    case 'rate_limited':
      // Retried automatically. Reaching here means retries were exhausted.
      break
  }
}
```

Never treat the local check as authorization. It exists to avoid a doomed request and to give a clear message, not to decide what the account may do.
