export { PhylaxSdk } from './phylax-sdk.js'

export { HttpClient } from './client/http-client.js'
export type { HttpClientConfig, HttpMethod } from './client/http-client.js'
export { isRetryable, retryDelayMs } from './client/retry.js'
export { buildUserAgent } from './client/user-agent.js'

export { ArtifactsResource } from './resources/artifacts.js'
export type {
  AnalyseOptions,
  ListArtifactsParams,
  SearchParams,
  VerifyOptions,
} from './resources/artifacts.js'
export { AttestationsResource } from './resources/attestations.js'
export type { ListAttestationsParams } from './resources/attestations.js'
export { PoliciesResource } from './resources/policies.js'
export type { EvaluateInput } from './resources/policies.js'
export { RepositoriesResource } from './resources/repositories.js'
export type { AddRepositoryInput } from './resources/repositories.js'
export { WebhooksResource } from './resources/webhooks.js'
export type {
  CreateWebhookInput,
  UpdateWebhookInput,
} from './resources/webhooks.js'
export { QuotaResource } from './resources/quota.js'
export type { AccessCheck } from './resources/quota.js'

export { verifySignature } from './utils/signature.js'
export type {
  VerifySignatureInput,
  VerifySignatureResult,
} from './utils/signature.js'
export { redactToken } from './utils/redact.js'

export {
  DEFAULT_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT_MS,
  METHOD_REQUIREMENTS,
  PATHS,
} from './constants.js'
export { SDK_NAME, SDK_VERSION } from './version.js'

export { classifyStatus, isRetryableCode } from './types/result.js'
export { planAtLeast, PLAN_ORDER } from './types/plan.js'
export type * from './types/index.js'
