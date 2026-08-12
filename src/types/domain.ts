export type Verdict = 'ALLOW' | 'WARN' | 'BLOCK'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type Ecosystem = 'npm' | 'pypi' | 'golang' | 'cargo' | 'maven' | 'oci'
export type ArtifactKind = 'package' | 'repository' | 'mcp_server' | 'skill'

export interface HealthResponse {
  status: string
  [key: string]: unknown
}

export interface ServerIdentity {
  [key: string]: unknown
}

export interface Finding {
  type?: string
  category?: string
  severity?: string
  title?: string
  file?: string
  [key: string]: unknown
}

export interface VerificationResult {
  artifact: string
  verdict: Verdict | string
  risk_score?: number
  risk?: RiskLevel | string
  provenance?: string
  attestation?: { count?: number; available?: boolean } | string
  findings?: Finding[]
  evaluated_at?: string
  [key: string]: unknown
}

export interface Attestation {
  id?: string
  artifact?: string
  verdict?: Verdict | string
  signature?: string
  issued_at?: string
  [key: string]: unknown
}

export interface AttestationVerification {
  valid: boolean
  reason?: string
  [key: string]: unknown
}

export interface Policy {
  id?: string
  name?: string
  description?: string
  rules?: unknown[]
  [key: string]: unknown
}

export interface PolicyEvaluation {
  id?: string
  artifact: string
  policy?: string
  verdict: Verdict | string
  score?: number
  risk?: RiskLevel | string
  details?: {
    passed?: string[]
    failed?: string[]
    warnings?: string[]
  }
  evaluated_at?: string
  [key: string]: unknown
}

export interface SearchHit {
  artifact?: string
  name?: string
  ecosystem?: Ecosystem | string
  version?: string
  verdict?: Verdict | string
  [key: string]: unknown
}

export interface Webhook {
  id?: string
  url?: string
  events?: string[]
  active?: boolean
  created_at?: string
  [key: string]: unknown
}

export interface Repository {
  id?: string
  url?: string
  provider?: 'github' | 'gitlab' | 'bitbucket' | string
  verdict?: Verdict | string
  [key: string]: unknown
}
