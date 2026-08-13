# @phyi/sdk

[![npm](https://img.shields.io/npm/v/@phyi/sdk?label=npm&color=CB3837)](https://www.npmjs.com/package/@phyi/sdk)

TypeScript SDK for the [Phylax](https://phyi.dev) API. Package verification, policy evaluation, attestations, and plan aware quota handling.

`@phyi/sdk` is the canonical JavaScript and TypeScript client for the Phylax API. It exists so any Node application, whether that is your build pipeline, your registry tooling, or your own security gate, can verify what your software depends on without hand rolling auth, retries, redaction, and response shapes. The SDK is consumed by the Phylax CLI, MCP server, VS Code extension, Chrome extension, and GitHub Action.

## Install

```sh
npm install @phyi/sdk
```

## Usage

<details>
<summary><b>Quickstart</b>: construct <code>PhylaxSdk</code> with a token, verify a package, and act on the verdict</summary>

```typescript
import { PhylaxSdk } from '@phyi/sdk'

const phylax = new PhylaxSdk({
  apiToken: process.env.PHYLAX_API_TOKEN,
  maxRetries: 3,
  timeoutMs: 30_000,
})

// Verify one package before you install it.
const result = await phylax.artifacts.verify('pkg:npm/express@4.18.2')

if (!result.success) {
  console.error(`${result.code}: ${result.error}`)
} else if (result.data.verdict === 'BLOCK') {
  console.error(`Blocked: ${result.data.artifact}`)
  process.exit(1)
}

// Verify a whole dependency tree in one call.
const batch = await phylax.artifacts.verifyMany([
  'pkg:npm/express@4.18.2',
  'pkg:pypi/requests@2.32.3',
])

// Evaluate against your organization policy.
const decision = await phylax.policies.evaluate({
  artifact: 'pkg:npm/express@4.18.2',
  policy: 'prod-runtime-policy',
})
```

</details>

<details>
<summary><b>Check entitlement before spending quota</b></summary>

```typescript
const entitlements = await phylax.quota.entitlements()

if (entitlements.success) {
  const check = phylax.quota.checkAccess('policies.evaluate', entitlements.data)

  if (!check.allowed) {
    console.error(check.reasons.join('; '))
  }
}
```

</details>

<details>
<summary><b>Verify an inbound webhook delivery</b></summary>

```typescript
import { verifySignature } from '@phyi/sdk'

const result = verifySignature({
  rawBody,
  signature: req.headers['x-phylax-signature'],
  timestamp: req.headers['x-phylax-timestamp'],
  secret: process.env.PHYLAX_WEBHOOK_SECRET,
})

if (!result.valid) {
  return res.writeHead(401).end(result.reason)
}
```

</details>

## Development

<details>
<summary>Contributor commands</summary>

```sh
npm install
npm run typecheck
npm test
npm run build
```

### Documentation map

| Guide | Description |
| --- | --- |
| **[API reference](./docs/api.md)** | Every resource and method |
| **[Plans and quota](./docs/plans-and-quota.md)** | Permissions, plan tiers, quota costs |
| **[Errors and retries](./docs/errors-and-retries.md)** | Error codes, retry policy, backoff |
| **[Webhooks](./docs/webhooks.md)** | Signature verification and replay protection |

</details>

## License

MIT

## The rest of Phylax

| Tool | Where to get it |
| --- | --- |
| JavaScript SDK | [`@phyi/sdk`](https://www.npmjs.com/package/@phyi/sdk) on npm |
| Python SDK | [`phylax-sdk`](https://github.com/praxi-labs/phylax-sdk-python), PyPI release pending |
| MCP server | [`@phyi/mcp`](https://www.npmjs.com/package/@phyi/mcp) on npm |
| Agent runtime gate | [`@phyi/runtime-gate`](https://www.npmjs.com/package/@phyi/runtime-gate) on npm |
| VS Code extension | [`phylax.phylax`](https://marketplace.visualstudio.com/items?itemName=phylax.phylax) on the Marketplace |
| GitHub Action | [`praxi-labs/phylax-action`](https://github.com/praxi-labs/phylax-action) |
| Browser extension | [`praxi-labs/phylax-chrome`](https://github.com/praxi-labs/phylax-chrome/releases/latest), Web Store listing pending |

Docs live at [phyi.dev](https://phyi.dev).
