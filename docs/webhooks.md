# Webhooks

Webhooks tell you a verdict changed without polling. A package that verified clean last week can be compromised today, and the delivery is how you find out.

## Registering an endpoint

```typescript
const hook = await phylax.webhooks.create({
  url: 'https://acme.test/hooks/phylax',
  events: ['verdict.changed', 'artifact.verified'],
  secret: process.env.PHYLAX_WEBHOOK_SECRET,
})
```

Store the secret when you create the endpoint. It is not returned again.

## Verifying a delivery

Anyone who learns your endpoint URL can post to it. Verify before acting.

```typescript
import { verifySignature } from '@phyi/sdk'

app.post('/hooks/phylax', express.raw({ type: 'application/json' }), (req, res) => {
  const result = verifySignature({
    rawBody: req.body,
    signature: req.headers['x-phylax-signature'],
    timestamp: req.headers['x-phylax-timestamp'],
    secret: process.env.PHYLAX_WEBHOOK_SECRET,
  })

  if (!result.valid) {
    return res.status(401).send(result.reason)
  }

  res.status(202).end()
})
```

## Three details that decide whether this works

**Sign the raw body, not parsed JSON.** Note the `express.raw` above. Any middleware that parses and reserialises the payload can reorder keys or change whitespace, which changes the bytes and invalidates a signature that was perfectly good. This is the most common cause of a receiver that rejects every legitimate delivery.

**Compare in constant time.** `verifySignature` uses `timingSafeEqual`. A plain `===` returns as soon as two bytes differ, which leaks how much of the signature matched and is enough to forge one byte at a time.

**Check the timestamp.** Without it a captured delivery can be replayed forever. The default tolerance is 300 seconds, which absorbs normal clock skew in both directions.

## Options

| Field | Default | Notes |
| --- | --- | --- |
| `rawBody` | required | `string` or `Uint8Array`, exactly as received. |
| `signature` | required | The `X-Phylax-Signature` header. |
| `timestamp` | required | The `X-Phylax-Timestamp` header, Unix seconds. |
| `secret` | required | The secret from endpoint creation. |
| `toleranceSeconds` | `300` | Replay window. |

## Failure reasons

`verifySignature` returns a reason rather than a boolean, so a receiver can log why a delivery was refused.

| Reason | Cause |
| --- | --- |
| `Missing signature header` | Not sent by Phylax, or stripped by a proxy. |
| `Missing timestamp header` | Same. |
| `Malformed timestamp header` | Not a number. |
| `Timestamp outside tolerance` | Clock skew, or a replay. |
| `Signature mismatch` | Wrong secret, or the body changed in transit. |

## Two more things worth doing

Deduplicate on `X-Phylax-Delivery` so a retried delivery is processed once. Delivery is at least once, not exactly once.

When rotating a secret, accept both the old and new value during an overlap window rather than cutting over instantly, or you will drop deliveries that were already in flight.
