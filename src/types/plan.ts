export type PlanTier = 'free' | 'team' | 'business' | 'enterprise'

export type Permission =
  | 'artifacts:read'
  | 'artifacts:verify'
  | 'attestations:read'
  | 'attestations:verify'
  | 'policies:read'
  | 'policies:write'
  | 'policies:evaluate'
  | 'repositories:read'
  | 'repositories:write'
  | 'webhooks:read'
  | 'webhooks:write'
  | 'network:read'

export interface MethodRequirement {
  quotaCost: number
  permissions: Permission[]
  minimumPlan: PlanTier
}

export interface Entitlements {
  plan: PlanTier | string
  permissions: Permission[] | string[]
  quota_remaining?: number
  quota_limit?: number
  quota_resets_at?: string
  [key: string]: unknown
}

export const PLAN_ORDER: readonly PlanTier[] = [
  'free',
  'team',
  'business',
  'enterprise',
]

export function planAtLeast(actual: string, required: PlanTier): boolean {
  const a = PLAN_ORDER.indexOf(actual as PlanTier)
  const r = PLAN_ORDER.indexOf(required)
  return a !== -1 && r !== -1 && a >= r
}
