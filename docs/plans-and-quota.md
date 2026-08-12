# Plans and quota

Access to Phylax is controlled by the subscription plan attached to your API token and by the permissions granted to that token. The SDK models both, so you can check entitlement before spending a call rather than discovering the limit through a rejected request.

## Checking what a token can do

```typescript
const entitlements = await phylax.quota.entitlements()

if (entitlements.success) {
  console.log(entitlements.data.plan)
  console.log(entitlements.data.quota_remaining)
}
```

## Checking a specific method

`checkAccess` compares a method against live entitlements and explains any refusal.

```typescript
const check = phylax.quota.checkAccess('policies.evaluate', entitlements.data)

if (!check.allowed) {
  console.error(check.reasons.join('; '))
  // requires the team plan or above, current plan is free
}
```

Three things can block a call, and all three are reported together rather than one at a time.

| Reason | Meaning |
| --- | --- |
| `missing permissions` | The token was not granted a permission the method needs. |
| `requires the ... plan` | The capability is not part of the current subscription. |
| `quota exhausted` | The plan quota is spent for the current period. |

## Planning a batch

Sum the cost of a run before starting it, so a long job fails at the start rather than halfway through.

```typescript
const cost = phylax.quota.totalQuotaCost([
  'artifacts.verify',
  'policies.evaluate',
  'attestations.verify',
])
```

## Discovering the surface

```typescript
phylax.quota.methodsForPlan('team')
phylax.quota.methodsRequiringPermission('policies:write')
phylax.quota.getRequirement('artifacts.verify')
```

## Quota cost by method

Costs are relative units. A verification is one unit; anything that runs a policy or a signature check is two.

| Method | Cost | Permissions | Minimum plan |
| --- | --- | --- | --- |
| `artifacts.verify` | 1 | `artifacts:verify` | free |
| `artifacts.get` | 1 | `artifacts:read` | free |
| `artifacts.search` | 1 | `artifacts:read` | free |
| `attestations.list` | 1 | `attestations:read` | free |
| `attestations.get` | 1 | `attestations:read` | free |
| `artifacts.verifyMany` | 1 | `artifacts:verify` | team |
| `artifacts.list` | 1 | `artifacts:read` | team |
| `attestations.verify` | 2 | `attestations:verify` | team |
| `policies.list` | 1 | `policies:read` | team |
| `policies.get` | 1 | `policies:read` | team |
| `policies.evaluate` | 2 | `policies:evaluate` | team |
| `repositories.list` | 1 | `repositories:read` | team |
| `repositories.verify` | 2 | `repositories:read` | team |
| `policies.create` | 1 | `policies:write` | business |
| `policies.update` | 1 | `policies:write` | business |
| `policies.delete` | 1 | `policies:write` | business |
| `repositories.add` | 1 | `repositories:write` | business |
| `webhooks.list` | 1 | `webhooks:read` | business |
| `webhooks.create` | 1 | `webhooks:write` | business |

Plans are cumulative. A business plan includes everything at team and free.

## Handling a refusal at runtime

Client side checks are advisory. The server is the authority, and it can refuse a call the local check allowed, for example when quota ran out between the check and the call. Branch on the error code.

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
      // Period quota is spent.
      break
    case 'rate_limited':
      // Retried automatically. Reaching here means retries were exhausted.
      break
  }
}
```
