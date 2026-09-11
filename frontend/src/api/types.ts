/**
 * Shared TypeScript types for PAIMANA API responses.
 *
 * These mirror the backend (Express) API contracts. Keep them aligned
 * with the actual backend schemas — if an API response changes, update
 * these types rather than bypassing TypeScript.
 */

// ============================================================================
// Projects
// ============================================================================

export type RiskLevel = "low" | "medium" | "high";

export type ScheduleState =
  | "completed"
  | "no_target"
  | "overdue_incomplete"
  | "insufficient_observed_velocity"
  | "stalled"
  | "regressing"
  | "on_track"
  | "behind";

/**
 * Prediction availability for a project at its latest observation month.
 * - "predicted": the ML service produced a prediction (risk fields populated)
 * - "unavailable": the ML service could not construct a prediction
 * - null: no risk data available (prediction service unreachable)
 */
export type PredictionStatus =
  | "predicted"
  | "unavailable"
  | null;

export type PredictionAvailability = "predicted" | "unavailable";

/**
 * Product-level lifecycle stage for a project — separate from the ML outlook.
 * - closure_watch: physical progress >= 97% (finalization stage)
 * - normal_execution: otherwise
 * - null: no physical progress reported
 */
export type ProjectStage =
  | "closure_watch"
  | "normal_execution"
  | null;

/**
 * Product-level attention category — independent of the model's deadline-
 * revision probability.
 * - intervention_required: overdue/stalled/regressing, large velocity gap, or
 *   significant cost increase
 * - monitor: medium/high model outlook, behind schedule, or approaching deadline
 * - closure_watch: >=97% physical progress and otherwise healthy
 * - null: no officer attention required
 */
export type AttentionCategory =
  | "intervention_required"
  | "monitor"
  | "closure_watch"
  | null;

/**
 * Sort orders accepted by GET /projects. `risk` sorts by model probability
 * of reported deadline revision (most likely to revise first). The rest map
 * to plain presentation orders backed by observation fields.
 */
export type ProjectSort =
  | "risk"
  | "name"
  | "progress"
  | "financial"
  | "cost"
  | "deadline";

/**
 * Lightweight project summary returned by GET /projects.
 * Derived from the project's most recent PAIMANA observation, enriched with
 * the cached ML risk index (schedule state / risk level / probability).
 */
export interface ProjectSummary {
  projectCode: string;
  projectName: string;
  agency: string | null;
  state: string | null;
  ministry: string | null;
  sector: string | null;
  reportMonth: string | null;
  physicalProgress: number | null;
  originalCost: number | null;
  revisedCost: number | null;
  cumulativeExpenditure: number | null;
  originalDoc: string | null;
  revisedDoc: string | null;

  // ── ML risk index (nullable) ──
  predictionStatus: PredictionStatus;
  predictionReason: string | null;
  predictionMonth: string | null;
  riskLevel: RiskLevel | null;
  probability: number | null;
  scheduleState: ScheduleState | null;
  deadlineDate: string | null;
  remainingDays: number | null;

  /**
   * Recent observed progress velocity (pp/month) from the ML context.
   * Null when the history does not support an estimate.
   */
  observedVelocity: number | null;
  /** Required progress velocity to meet the deadline. Null when overdue. */
  requiredVelocity: number | null;

  /** Product lifecycle stage (>=97% physical progress => closure_watch). */
  projectStage: ProjectStage;
  /** Product attention category, independent of the model outlook. */
  attentionCategory: AttentionCategory;
}

/**
 * Filters accepted by GET /projects. All are backed by real backend data:
 * ministry/sector/state/agency come from the observation record, scheduleState
 * and riskLevel come from the project's ML prediction, predictionStatus
 * filters on prediction availability, and the progress/financial ranges filter
 * on observation fields directly.
 */
export interface ProjectFilters {
  ministry?: string;
  sector?: string;
  state?: string;
  agency?: string;
  scheduleState?: string;
  riskLevel?: RiskLevel;
  predictionStatus?: PredictionAvailability;
  /** Physical progress % range (inclusive). */
  progressFrom?: number;
  progressTo?: number;
  /** Financial progress % range (expenditure vs original cost). */
  financialFrom?: number;
  financialTo?: number;
  /** Filter by product lifecycle stage (closure_watch | normal_execution | unknown). */
  projectStage?: "closure_watch" | "normal_execution" | "unknown";
  /** Filter by product attention category. */
  attentionCategory?: Exclude<AttentionCategory, null>;
}

/**
 * Pagination metadata returned with list endpoints.
 */
export interface Pagination {
  page: number;
  limit: number;
  totalProjects: number;
  totalPages: number;
}

/**
 * Response shape for GET /projects.
 */
export interface ProjectListResponse {
  data: ProjectSummary[];
  pagination: Pagination;
}

/**
 * Response shape for GET /projects/:projectCode.
 */
export interface ProjectDetailResponse {
  project: ProjectSummary;
  history: ProjectHistory | null;
}

/**
 * One reported monthly observation for a single project, used by the project
 * detail page to render the observed trajectory and the "what changed"
 * comparison.
 */
export interface ProjectObservationPoint {
  reportMonth: string;
  physicalProgress: number | null;
  cumulativeExpenditure: number | null;
  originalCost: number | null;
  revisedCost: number | null;
  originalDoc: string | null;
  revisedDoc: string | null;
  /** Financial progress %: cumulativeExpenditure / originalCost × 100. */
  financialProgress: number | null;
}

/**
 * Derived stall status for a project.
 */
export type StallStatus = "active" | "slowing" | "stalled" | "insufficient_data";

/**
 * A single entry in the deadline revision history.
 */
export interface DeadlineHistoryEntry {
  date: string;
  label: "original" | "revision" | "current";
  revisionNumber?: number;
}

/**
 * Observed monthly history for a single project, plus derived intelligence
 * fields computed from the real observations.
 */
export interface ProjectHistory {
  points: ProjectObservationPoint[];
  observationCount: number;
  consecutiveProgressIntervals: number;
  availableIntervals: number;

  /** Physical − financial progress (pp). Positive = financial lag. */
  progressGap: number | null;
  progressGapInterpretation: string | null;
  /** Short classification: "FINANCIAL_LAG" | "FINANCIAL_LEAD" | "ALIGNED" | null. */
  progressGapLabel: string | null;

  stallStatus: StallStatus;
  stalledSinceMonth: string | null;
  stallDurationMonths: number | null;

  deadlineRevisionCount: number;
  deadlineHistory: DeadlineHistoryEntry[];
  originalDeadline: string | null;
  latestDeadline: string | null;

  observationFrequency: "monthly" | "irregular" | "single";
  hasGaps: boolean;

  deadlineRevisionTrend: "rising" | "stable" | "falling" | "insufficient_history";
}

/**
 * One section of the "Projects Requiring Attention" surface. Only non-empty
 * categories are returned.
 */
export interface AttentionCategoryGroup {
  key: Exclude<AttentionCategory, null>;
  /** Human summary of how this category was determined. Rendered as-is. */
  summary: string;
  count: number;
  data: ProjectSummary[];
}

/**
 * Response shape for GET /projects/attention.
 */
export interface AttentionResponse {
  categories: AttentionCategoryGroup[];
  total: number;
}

/**
 * A single selectable filter value with a count of matching projects.
 */
export interface FacetValue {
  value: string;
  count: number;
}

/**
 * Response shape for GET /projects/facets — distinct filter values backed
 * by real data plus current ML prediction coverage.
 */
export interface ProjectFacets {
  ministries: FacetValue[];
  sectors: FacetValue[];
  states: FacetValue[];
  agencies: FacetValue[];
  scheduleStates: FacetValue[];
  riskLevels: FacetValue[];
  predictionSummary: {
    total: number;
    predicted: number;
    unavailable: number;
  };
  /** Product lifecycle stage distribution (closure_watch / normal_execution). */
  projectStages: FacetValue[];
  /** Product attention category distribution. */
  attentionCategories: FacetValue[];
}

/**
 * Response shape for GET /projects/stats — portfolio-level aggregates.
 */
export interface PortfolioStats {
  totalProjects: number;
  predictedCount: number;
  unavailableCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  latestReportMonths: FacetValue[];
}

// ============================================================================
// Prediction / Intelligence
// ============================================================================

export interface PredictionProject {
  projectCode: string;
  projectName: string;
  agency: string;
  state: string;
}

export interface Prediction {
  /** Probability of deadline revision (0.0 to 1.0) */
  probability: number;
  /** Categorized risk level based on probability threshold */
  riskLevel: RiskLevel;
  /** The outcome being predicted */
  target: string;
}

export interface PredictionContext {
  /** Current completion percentage (0-100) */
  currentProgress: number;
  /** Remaining work percentage (0-100) */
  remainingProgress: number;
  /** Scheduled completion date (YYYY-MM-DD) */
  deadlineDate: string;
  /** Number of days remaining until the deadline (may be negative/overdue) */
  remainingDays: number;
  /**
   * Recent observed progress velocity (percentage points/month).
   * Null when the history does not support an estimate; negative when regressing.
   */
  observedVelocity: number | null;
  /** Required progress velocity to meet the deadline. Null when overdue. */
  requiredVelocity: number | null;
  /** Current schedule status category */
  scheduleState: ScheduleState;
}

export type ReasonGroup =
  | "time_pressure"
  | "progress_execution"
  | "financial"
  | "data_quality";

export interface Reason {
  group: ReasonGroup;
  direction: "increases" | "decreases";
  message: string;
}

/**
 * External evidence retrieved from web sources (clearly distinct from
 * PAIMANA's internal data).
 */
export interface ExternalEvidence {
  title: string;
  source: string;
  url: string;
  date: string;
  claim: string;
  quality: "high" | "medium";
}

export interface Recommendation {
  summary: string;
  keyReasons: string[];
  recommendedActions: string[];
  verificationNeeded: string[];
}

/**
 * Complete intelligence response returned by
 * POST /projects/:projectCode/intelligence.
 */
export interface ProjectIntelligence {
  project: PredictionProject;
  prediction: Prediction;
  context: PredictionContext;
  reasons: Reason[];
  externalEvidence: ExternalEvidence[];
  /**
   * LLM-generated written recommendation. Null when the model prediction is
   * available but the recommendation step failed (service/rate-limit).
   */
  recommendation: Recommendation | null;
}

// ============================================================================
// Errors
// ============================================================================

/**
 * Structured backend error payload.
 */
export interface ApiErrorBody {
  error?: string;
  code?: string;
  message?: string;
  details?: unknown;
}

/**
 * Error thrown by the API client, carrying the HTTP status and
 * backend error code when available.
 */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}