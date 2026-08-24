import type { MethodRequirement } from './types/plan.js'

export const DEFAULT_BASE_URL = 'https://api.phyi.dev'
export const DEFAULT_TIMEOUT_MS = 30_000
export const DEFAULT_MAX_RETRIES = 3
export const MAX_BACKOFF_MS = 30_000

export const PATHS = {
  health: '/v1/health',
  serverIdentity: '/v1/server-identity',
  entitlements: '/v1/account/entitlements',
  me: '/v1/account/me',

  artifacts: '/v1/artifacts',
  artifactVerify: '/v1/artifacts/verify',
  artifactAnalyse: '/v1/artifacts/analyse',

  audit: '/v1/audit',
  auditScan: (id: string) => `/v1/audit/${encodeURIComponent(id)}`,
  auditStream: (id: string) => `/v1/audit/${encodeURIComponent(id)}/stream`,
  artifact: (ref: string) => `/v1/artifacts/${encodeURIComponent(ref)}`,
  search: '/v1/search',

  attestations: '/v1/attestations',
  attestation: (id: string) => `/v1/attestations/${encodeURIComponent(id)}`,
  attestationVerify: '/v1/attestations/verify',

  policies: '/v1/policies',
  policy: (id: string) => `/v1/policies/${encodeURIComponent(id)}`,
  policyEvaluate: '/v1/policies/evaluate',

  repositories: '/v1/repositories',
  repository: (id: string) => `/v1/repositories/${encodeURIComponent(id)}`,
  repositoryVerify: '/v1/repositories/verify',

  webhooks: '/v1/webhooks',
  webhook: (id: string) => `/v1/webhooks/${encodeURIComponent(id)}`,
} as const

export const METHOD_REQUIREMENTS: Readonly<
  Record<string, MethodRequirement>
> = {
  'artifacts.verify': {
    quotaCost: 1,
    permissions: ['artifacts:verify'],
    minimumPlan: 'builder',
  },
  'artifacts.analyse': {
    quotaCost: 2,
    permissions: ['artifacts:verify'],
    minimumPlan: 'builder',
  },
  'audit.create': {
    quotaCost: 2,
    permissions: ['artifacts:verify'],
    minimumPlan: 'builder',
  },
  'audit.get': {
    quotaCost: 0,
    permissions: ['artifacts:read'],
    minimumPlan: 'builder',
  },
  'artifacts.verifyMany': {
    quotaCost: 1,
    permissions: ['artifacts:verify'],
    minimumPlan: 'builder',
  },
  'artifacts.get': {
    quotaCost: 1,
    permissions: ['artifacts:read'],
    minimumPlan: 'builder',
  },
  'artifacts.list': {
    quotaCost: 1,
    permissions: ['artifacts:read'],
    minimumPlan: 'builder',
  },
  'artifacts.search': {
    quotaCost: 1,
    permissions: ['artifacts:read'],
    minimumPlan: 'builder',
  },
  'attestations.list': {
    quotaCost: 1,
    permissions: ['attestations:read'],
    minimumPlan: 'builder',
  },
  'attestations.get': {
    quotaCost: 1,
    permissions: ['attestations:read'],
    minimumPlan: 'builder',
  },
  'attestations.verify': {
    quotaCost: 2,
    permissions: ['attestations:verify'],
    minimumPlan: 'builder',
  },
  'policies.list': {
    quotaCost: 1,
    permissions: ['policies:read'],
    minimumPlan: 'marketplace',
  },
  'policies.get': {
    quotaCost: 1,
    permissions: ['policies:read'],
    minimumPlan: 'marketplace',
  },
  'policies.create': {
    quotaCost: 1,
    permissions: ['policies:write'],
    minimumPlan: 'marketplace',
  },
  'policies.update': {
    quotaCost: 1,
    permissions: ['policies:write'],
    minimumPlan: 'marketplace',
  },
  'policies.delete': {
    quotaCost: 1,
    permissions: ['policies:write'],
    minimumPlan: 'marketplace',
  },
  'policies.evaluate': {
    quotaCost: 2,
    permissions: ['policies:evaluate'],
    minimumPlan: 'marketplace',
  },
  'repositories.list': {
    quotaCost: 1,
    permissions: ['repositories:read'],
    minimumPlan: 'builder',
  },
  'repositories.get': {
    quotaCost: 1,
    permissions: ['repositories:read'],
    minimumPlan: 'builder',
  },
  'repositories.add': {
    quotaCost: 1,
    permissions: ['repositories:write'],
    minimumPlan: 'builder',
  },
  'repositories.remove': {
    quotaCost: 1,
    permissions: ['repositories:write'],
    minimumPlan: 'builder',
  },
  'repositories.verify': {
    quotaCost: 1,
    permissions: ['repositories:read'],
    minimumPlan: 'builder',
  },
  'webhooks.list': {
    quotaCost: 1,
    permissions: ['webhooks:read'],
    minimumPlan: 'builder',
  },
  'webhooks.get': {
    quotaCost: 1,
    permissions: ['webhooks:read'],
    minimumPlan: 'builder',
  },
  'webhooks.create': {
    quotaCost: 1,
    permissions: ['webhooks:write'],
    minimumPlan: 'builder',
  },
  'webhooks.update': {
    quotaCost: 1,
    permissions: ['webhooks:write'],
    minimumPlan: 'builder',
  },
  'webhooks.delete': {
    quotaCost: 1,
    permissions: ['webhooks:write'],
    minimumPlan: 'builder',
  },
}
