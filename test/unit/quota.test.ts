import { describe, expect, it, vi } from 'vitest'

import { PhylaxSdk } from '../../src/phylax-sdk.js'
import type { Entitlements } from '../../src/types/plan.js'

const sdk = new PhylaxSdk({
  apiToken: 'phx_live_test',
  fetch: vi.fn() as never,
})

const free: Entitlements = {
  plan: 'free',
  permissions: ['artifacts:read', 'artifacts:verify'],
  quota_remaining: 100,
}

const business: Entitlements = {
  plan: 'business',
  permissions: [
    'artifacts:read',
    'artifacts:verify',
    'policies:read',
    'policies:write',
    'policies:evaluate',
    'webhooks:read',
    'webhooks:write',
  ],
  quota_remaining: 10_000,
}

describe('quota requirements', () => {
  it('exposes a requirement per gated method', () => {
    expect(sdk.quota.getRequirement('artifacts.verify')).toEqual({
      quotaCost: 1,
      permissions: ['artifacts:verify'],
      minimumPlan: 'free',
    })
  })

  it('sums quota cost across a planned batch of calls', () => {
    expect(
      sdk.quota.totalQuotaCost([
        'artifacts.verify',
        'policies.evaluate',
        'attestations.verify',
      ]),
    ).toBe(5)
  })
})

describe('access checks', () => {
  it('allows a free plan the methods it pays for', () => {
    const check = sdk.quota.checkAccess('artifacts.verify', free)
    expect(check.allowed).toBe(true)
    expect(check.reasons).toEqual([])
  })

  it('blocks a free plan from a business method and says why', () => {
    const check = sdk.quota.checkAccess('webhooks.create', free)
    expect(check.allowed).toBe(false)
    expect(check.reasons.join(' ')).toMatch(/business plan or above/)
    expect(check.reasons.join(' ')).toMatch(/missing permissions/)
  })

  it('blocks when quota is exhausted even on a sufficient plan', () => {
    const check = sdk.quota.checkAccess('policies.evaluate', {
      ...business,
      quota_remaining: 1,
    })
    expect(check.allowed).toBe(false)
    expect(check.reasons.join(' ')).toMatch(/quota exhausted/)
  })

  it('allows an ungated method through untouched', () => {
    const check = sdk.quota.checkAccess('health', free)
    expect(check.allowed).toBe(true)
    expect(check.requirement).toBeUndefined()
  })
})

describe('plan introspection', () => {
  it('lists what a plan unlocks, cumulatively', () => {
    const freeMethods = sdk.quota.methodsForPlan('free')
    const businessMethods = sdk.quota.methodsForPlan('business')

    expect(freeMethods).toContain('artifacts.verify')
    expect(freeMethods).not.toContain('webhooks.create')
    expect(businessMethods).toContain('webhooks.create')
    expect(businessMethods.length).toBeGreaterThan(freeMethods.length)
  })

  it('finds every method needing a permission', () => {
    expect(sdk.quota.methodsRequiringPermission('policies:write')).toEqual(
      expect.arrayContaining([
        'policies.create',
        'policies.update',
        'policies.delete',
      ]),
    )
  })
})
