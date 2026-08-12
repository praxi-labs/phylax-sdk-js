import { describe, expect, it, vi } from 'vitest'

import { METHOD_REQUIREMENTS } from '../../src/constants.js'
import { PhylaxSdk } from '../../src/phylax-sdk.js'
import { isPaidPlan } from '../../src/types/plan.js'
import type { Entitlements } from '../../src/types/plan.js'

const sdk = new PhylaxSdk({
  apiToken: 'phx_live_test',
  fetch: vi.fn() as never,
})

const anonymous: Entitlements = {
  plan: 'anonymous',
  permissions: [],
  quota_remaining: 0,
}

const builder: Entitlements = {
  plan: 'builder',
  permissions: ['artifacts:read', 'artifacts:verify'],
  quota_remaining: 100,
}

const marketplace: Entitlements = {
  plan: 'marketplace',
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
      minimumPlan: 'builder',
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

describe('paid access only', () => {
  it('gates every method behind a paid plan', () => {
    for (const [method, requirement] of Object.entries(METHOD_REQUIREMENTS)) {
      expect(
        isPaidPlan(requirement.minimumPlan),
        `${method} declares the unpaid plan ${requirement.minimumPlan}`,
      ).toBe(true)
    }
  })

  it('refuses every method on the anonymous plan', () => {
    for (const method of Object.keys(METHOD_REQUIREMENTS)) {
      const check = sdk.quota.checkAccess(method, anonymous)
      expect(check.allowed, `${method} is reachable anonymously`).toBe(false)
    }
  })
})

describe('access checks', () => {
  it('allows a builder plan the methods it pays for', () => {
    const check = sdk.quota.checkAccess('artifacts.verify', builder)
    expect(check.allowed).toBe(true)
    expect(check.reasons).toEqual([])
  })

  it('blocks a builder plan from a marketplace method and says why', () => {
    const check = sdk.quota.checkAccess('policies.evaluate', builder)
    expect(check.allowed).toBe(false)
    expect(check.reasons.join(' ')).toMatch(/marketplace plan or above/)
    expect(check.reasons.join(' ')).toMatch(/missing permissions/)
  })

  it('blocks when quota is exhausted even on a sufficient plan', () => {
    const check = sdk.quota.checkAccess('policies.evaluate', {
      ...marketplace,
      quota_remaining: 1,
    })
    expect(check.allowed).toBe(false)
    expect(check.reasons.join(' ')).toMatch(/quota exhausted/)
  })

  it('refuses an unknown method rather than waving it through', () => {
    const check = sdk.quota.checkAccess('health', marketplace)
    expect(check.allowed).toBe(false)
    expect(check.requirement).toBeUndefined()
    expect(check.reasons.join(' ')).toMatch(/unknown method/)
  })
})

describe('plan introspection', () => {
  it('lists what a plan unlocks, cumulatively', () => {
    const anonymousMethods = sdk.quota.methodsForPlan('anonymous')
    const builderMethods = sdk.quota.methodsForPlan('builder')
    const marketplaceMethods = sdk.quota.methodsForPlan('marketplace')

    expect(anonymousMethods).toEqual([])
    expect(builderMethods).toContain('artifacts.verify')
    expect(builderMethods).not.toContain('policies.evaluate')
    expect(marketplaceMethods).toContain('policies.evaluate')
    expect(marketplaceMethods.length).toBeGreaterThan(builderMethods.length)
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
