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
    minimumPlan: 'free',
  },
  'artifacts.verifyMany': {
    quotaCost: 1,
    permissions: ['artifacts:verify'],
    minimumPlan: 'team',
  },
  'artifacts.get': {
    quotaCost: 1,
    permissions: ['artifacts:read'],
    minimumPlan: 'free',
  },
  'artifacts.list': {
    quotaCost: 1,
    permissions: ['artifacts:read'],
    minimumPlan: 'team',
  },
  'artifacts.search': {
    quotaCost: 1,
    permissions: ['artifacts:read'],
    minimumPlan: 'free',
  },
  'attestations.list': {
    quotaCost: 1,
    permissions: ['attestations:read'],
    minimumPlan: 'free',
  },
  'attestations.get': {
    quotaCost: 1,
    permissions: ['attestations:read'],
    minimumPlan: 'free',
  },
  'attestations.verify': {
    quotaCost: 2,
    permissions: ['attestations:verify'],
    minimumPlan: 'team',
  },
  'policies.list': {
    quotaCost: 1,
    permissions: ['policies:read'],
    minimumPlan: 'team',
  },
  'policies.get': {
    quotaCost: 1,
    permissions: ['policies:read'],
    minimumPlan: 'team',
  },
  'policies.create': {
    quotaCost: 1,
    permissions: ['policies:write'],
    minimumPlan: 'business',
  },
  'policies.update': {
    quotaCost: 1,
    permissions: ['policies:write'],
    minimumPlan: 'business',
  },
  'policies.delete': {
    quotaCost: 1,
    permissions: ['policies:write'],
    minimumPlan: 'business',
  },
  'policies.evaluate': {
    quotaCost: 2,
    permissions: ['policies:evaluate'],
    minimumPlan: 'team',
  },
  'repositories.list': {
    quotaCost: 1,
    permissions: ['repositories:read'],
    minimumPlan: 'team',
  },
  'repositories.add': {
    quotaCost: 1,
    permissions: ['repositories:write'],
    minimumPlan: 'business',
  },
  'repositories.verify': {
    quotaCost: 2,
    permissions: ['repositories:read'],
    minimumPlan: 'team',
  },
  'webhooks.list': {
    quotaCost: 1,
    permissions: ['webhooks:read'],
    minimumPlan: 'business',
  },
  'webhooks.create': {
    quotaCost: 1,
    permissions: ['webhooks:write'],
    minimumPlan: 'business',
  },
}
