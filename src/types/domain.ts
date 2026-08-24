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
  cwe?: string
  remediation?: string
  line?: string
  [key: string]: unknown
}

/**
 * Whether the network has anything to say about this artifact.
 *
 * `network` means it was evaluated. `none` means it was not, and the verdict
 * is ALLOW rather than a 404, so one unknown entry does not break a batch call.
 * Branch on this, not on the verdict, if you need to fail closed on artifacts
 * the network has never seen.
 */
export type Coverage = 'network' | 'none'

/**
 * How far the engine actually got on an analysed artifact.
 *
 * `champion` means the network's top-ranked agents executed it in a sandbox.
 * `cached` is a previous champion run over identical bytes. `static` means only
 * the signal scanner reached it, which is a far weaker claim, and `none` means
 * nothing analysed it at all.
 *
 * Read this before acting on a verdict. A WARN backed by three champions and a
 * WARN from a regex pass are indistinguishable if you only read `verdict`.
 */
export type AnalysisCoverage = 'champion' | 'cached' | 'static' | 'none'

export interface EngineInfo {
  /** The promoted ensemble's identity. `none` when nobody was promoted. */
  version: string
  /** How many champions produced an opinion. Zero means static only. */
  analysers: number
  /** Whether the analysers disagreed and the strictest verdict won. */
  dissent: boolean
}

/**
 * The result of analysing supplied bytes, as opposed to looking up a name.
 *
 * `identity` is a digest of exactly what was read, so two runs over the same
 * source are comparable. `trace` carries the engine's own account of how it
 * reached the verdict and is present only for plans that receive full finding
 * detail.
 */
export interface AnalysisResult {
  artifact: string
  artifact_type: ArtifactKind | string
  verdict: Verdict | string
  confidence: number
  coverage: AnalysisCoverage | string
  engine: EngineInfo
  identity?: string
  classification_disputed?: boolean
  finding_counts?: Record<string, number>
  findings?: Finding[]
  reasons?: string[]
  trace?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * What the reference was reduced to before lookup.
 *
 * Verdicts are recorded per package rather than per version, so
 * `pkg:npm/express@4.18.2` resolves to `npm:express`. `version_specific` is
 * false whenever a version was supplied and could not be honoured.
 */
export interface Resolution {
  requested: string
  resolved_to: string | null
  version_specific: boolean
  note?: string | null
}

export interface VerificationResult {
  artifact: string
  verdict: Verdict | string
  coverage: Coverage | string
  resolution?: Resolution
  reason?: string
  policies?: string[]
  risk_band?: RiskLevel | string
  risk_score?: number
  risk?: RiskLevel | string
  provenance?: string
  attestation?: { count?: number; available?: boolean } | string
  finding_counts?: Record<string, number>
  findings?: Finding[]
  last_evaluated_at?: string | null
  evaluated_at?: string
  [key: string]: unknown
}

/**
 * How far an audit has got.
 *
 * `resolve` expands the manifests into a graph, `precrawl` asks the index what
 * is already known, `scan` fetches and analyses the rest. A run that dies leaves
 * its last state behind rather than vanishing.
 */
export type AuditState =
  | 'pending'
  | 'precrawl'
  | 'resolve'
  | 'scan'
  | 'complete'
  | 'failed'

export interface AuditScan {
  type?: 'scan'
  id: string
  state: AuditState | string
  verdict?: Verdict | string | null
  coordinate?: string | null
  manifests?: string[]
  notes?: string[]
  ecosystems?: Record<string, number>
  total?: number
  completed?: number
  error?: string | null
  stream?: string
  created_at?: string | null
  finished_at?: string | null
}

/**
 * One package in the tree, and where it came from.
 *
 * `ancestors` and `declared_line` are what make a verdict actionable. Knowing a
 * package is BLOCK is a fact; knowing it arrived through a build tool and is
 * declared on a particular line is something a person can do something about.
 */
export interface AuditArtifact {
  type: 'artifact'
  purl: string
  ecosystem: string
  name: string
  version: string
  direct: boolean
  dev: boolean
  state: string
  verdict: Verdict | string
  coverage?: string | null
  analysers?: number
  declared_in?: string | null
  declared_line?: number | null
  ancestors?: string[]
  finding_counts?: Record<string, number>
  findings?: Finding[]
  reasons?: string[]
  engine_version?: string
  identity?: string
  error?: string
}

export interface AuditSummary {
  type: 'summary'
  verdict?: Verdict | string | null
  state?: string
  packages: number
  by_verdict: Record<string, number>
}

export type AuditEvent = AuditScan | AuditArtifact | AuditSummary

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
