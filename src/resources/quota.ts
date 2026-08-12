import { METHOD_REQUIREMENTS, PATHS } from '../constants.js'
import type { HttpClient } from '../client/http-client.js'
import type { RequestOptions } from '../types/options.js'
import type { PhylaxResult } from '../types/result.js'
import type {
  Entitlements,
  MethodRequirement,
  Permission,
  PlanTier,
} from '../types/plan.js'
import { planAtLeast } from '../types/plan.js'

export interface AccessCheck {
  allowed: boolean
  reasons: string[]
  requirement: MethodRequirement | undefined
}

export class QuotaResource {
  readonly #http: HttpClient

  constructor(http: HttpClient) {
    this.#http = http
  }

  async entitlements(
    options?: RequestOptions,
  ): Promise<PhylaxResult<Entitlements>> {
    return this.#http.get<Entitlements>(PATHS.entitlements, options)
  }

  getRequirement(method: string): MethodRequirement | undefined {
    return METHOD_REQUIREMENTS[method]
  }

  getAllRequirements(): Readonly<Record<string, MethodRequirement>> {
    return METHOD_REQUIREMENTS
  }

  totalQuotaCost(methods: string[]): number {
    return methods.reduce(
      (sum, method) => sum + (METHOD_REQUIREMENTS[method]?.quotaCost ?? 0),
      0,
    )
  }

  checkAccess(method: string, entitlements: Entitlements): AccessCheck {
    const requirement = METHOD_REQUIREMENTS[method]
    if (!requirement) {
      return { allowed: true, reasons: [], requirement: undefined }
    }

    const reasons: string[] = []
    const held = new Set(entitlements.permissions as string[])

    const missing = requirement.permissions.filter(p => !held.has(p))
    if (missing.length > 0) {
      reasons.push(`missing permissions: ${missing.join(', ')}`)
    }

    if (!planAtLeast(String(entitlements.plan), requirement.minimumPlan)) {
      reasons.push(
        `requires the ${requirement.minimumPlan} plan or above, current plan is ${entitlements.plan}`,
      )
    }

    const remaining = entitlements.quota_remaining
    if (typeof remaining === 'number' && remaining < requirement.quotaCost) {
      reasons.push(
        `quota exhausted, ${remaining} remaining but ${requirement.quotaCost} required`,
      )
    }

    return { allowed: reasons.length === 0, reasons, requirement }
  }

  methodsForPlan(plan: PlanTier): string[] {
    return Object.entries(METHOD_REQUIREMENTS)
      .filter(([, req]) => planAtLeast(plan, req.minimumPlan))
      .map(([method]) => method)
  }

  methodsRequiringPermission(permission: Permission): string[] {
    return Object.entries(METHOD_REQUIREMENTS)
      .filter(([, req]) => req.permissions.includes(permission))
      .map(([method]) => method)
  }
}
