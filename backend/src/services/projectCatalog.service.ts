/**
 * Project Catalog Service Module
 *
 * Provides a lightweight project listing sourced from the same PAIMANA
 * historical dataset that the ML/intelligence service consumes. This keeps
 * the Project Explorer consistent with the prediction/intelligence layer
 * rather than depending on a partially-populated transactional database.
 *
 * The dataset is the deduplicated set of project observations keyed by
 * projectCode, where each project reflects its most recent observation.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    getRiskIndex,
    type ProjectRisk,
    type RiskLevel,
    type ScheduleState,
} from "./riskIndex.service";

// ============================================================================
// Constants
// ============================================================================

const __dirname = path.dirname(
    fileURLToPath(import.meta.url)
);

const HISTORICAL_DATA_PATH = path.resolve(
    __dirname,
    "../../data/historical/observations.json"
);

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Raw observation record as stored in the historical dataset.
 */
interface HistoricalObservation {
    projectCode?: string | null;
    projectName?: string | null;
    agency?: string | null;
    state?: string | null;
    ministry?: string | null;
    sector?: string | null;
    reportMonth?: string | null;
    physicalProgress?: number | null;
    originalCost?: number | null;
    revisedCost?: number | null;
    cumulativeExpenditure?: number | null;
    originalDoc?: string | null;
    revisedDoc?: string | null;
}

export type ProjectStage =
    | "closure_watch"
    | "normal_execution";

export type AttentionCategory =
    | "intervention_required"
    | "monitor"
    | "closure_watch";

/**
 * Public project summary returned to the frontend.
 * Matches the fields the Project Explorer renders.
 *
 * Risk/schedule fields are joined from the ML risk index and are null when
 * no prediction exists for the project or when the ML service is unreachable.
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
    predictionStatus: "predicted" | "unavailable" | null;
    predictionReason: string | null;
    predictionMonth: string | null;
    riskLevel: RiskLevel | null;
    probability: number | null;
    scheduleState: ScheduleState | null;
    deadlineDate: string | null;
    remainingDays: number | null;
    observedVelocity: number | null;
    requiredVelocity: number | null;

    /**
     * Product-level lifecycle stage, NOT a risk label.
     * - closure_watch: physical progress is >= 97% (finalization stage)
     * - normal_execution: otherwise
     * - null: no physical progress is reported
     */
    projectStage: ProjectStage | null;

    /**
     * Product-level attention category, entirely separate from the model
     * outlook. null = no officer attention required. See
     * {@link determineAttentionCategory}.
     */
    attentionCategory: AttentionCategory | null;
}

/**
 * One reported monthly observation for a single project, used by the project
 * detail page to render the observed trajectory and the "what changed"
 * comparison.
 */
export interface ProjectHistoryPoint {
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
 * Derived stall status for a project, computed from consecutive observations
 * where zero physical progress was reported.
 */
export type StallStatus =
    | "active"
    | "slowing"
    | "stalled"
    | "insufficient_data";

/**
 * A single entry in the deadline revision history.
 */
export interface DeadlineHistoryEntry {
    date: string;
    label:
        | "original"
        | "revision"
        | "current";
    /** 1-indexed revision number (only for "revision" entries). */
    revisionNumber?: number;
}

/**
 * Observed monthly history for a single project, plus derived intelligence
 * fields computed from the real observations. Every derived field has a
 * clearly documented source — nothing is invented.
 */
export interface ProjectHistory {
    points: ProjectHistoryPoint[];
    /** Number of distinct monthly observations on record. */
    observationCount: number;
    /**
     * Adjacent month pairs (months exactly one apart) with physical progress
     * reported in both. A signal of how continuous the underlying evidence is.
     */
    consecutiveProgressIntervals: number;
    /**
     * Adjacent observation pairs with physical progress in both, regardless
     * of the gap between them.
     */
    availableIntervals: number;

    // ── Derived intelligence fields ──

    /**
     * Physical progress − financial progress (in percentage points).
     * Positive = financial lag, negative = financial lead.
     * Null when either value is unavailable.
     */
    progressGap: number | null;
    /** Human-readable interpretation of the progress gap. */
    progressGapInterpretation: string | null;
    /**
     * Short classification of the progress gap direction.
     * "FINANCIAL_LAG" | "FINANCIAL_LEAD" | "ALIGNED" | null.
     */
    progressGapLabel: string | null;

    /**
     * Stall status derived from consecutive observations with zero
     * physical progress. "stalled" requires ≥2 consecutive zero-progress
     * intervals with no missing months between them.
     */
    stallStatus: StallStatus;
    /** Month from which no progress has been reported (stalled projects only). */
    stalledSinceMonth: string | null;
    /** Number of months stalled (stalled projects only). */
    stallDurationMonths: number | null;

    /** Number of distinct revisedDoc values across all observations. */
    deadlineRevisionCount: number;
    /** Ordered deadline history from original through latest revision. */
    deadlineHistory: DeadlineHistoryEntry[];
    /** Earliest observed originalDoc, or null. */
    originalDeadline: string | null;
    /** Latest observed revisedDoc, or null. */
    latestDeadline: string | null;

    /**
     * Observation frequency: "monthly" when all intervals are exactly 1
     * month apart, "irregular" when gaps exist, "single" when only one
     * observation exists.
     */
    observationFrequency: "monthly" | "irregular" | "single";
    /** True when the observation record has month gaps. */
    hasGaps: boolean;

    /**
     * Deadline revision trend — "rising" when deadlines are being pushed
     * later over successive observations, "stable" when unchanged,
     * "falling" when the deadline has moved earlier.
     */
    deadlineRevisionTrend:
        | "rising"
        | "stable"
        | "falling"
        | "insufficient_history";
}

/**
 * Single-project detail response: the latest-observation summary (as listed
 * by the Explorer) plus the full observed history used by the detail page's
 * trajectory / what-changed / confidence sections.
 */
export interface ProjectDetail {
    project: ProjectSummary;
    history: ProjectHistory | null;
}

/**
 * A single selectable filter value with a count of matching projects.
 */
export interface FacetValue {
    value: string;
    count: number;
}

/**
 * Filter options + prediction coverage for the Project Explorer.
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
    /** Product attention category distribution. Projects with no category are omitted. */
    attentionCategories: FacetValue[];
}

/**
 * Portfolio-level aggregates for the national situation overview.
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

/**
 * Paginated project list response.
 */
export interface ProjectCatalogResponse {
    data: ProjectSummary[];
    pagination: {
        page: number;
        limit: number;
        totalProjects: number;
        totalPages: number;
    };
}

/**
 * One section of the "Projects Requiring Attention" surface.
 * Only non-empty categories are included in the response.
 */
export interface AttentionCategoryGroup {
    key: AttentionCategory;
    /** Human summary of how this category was determined. Rendered as-is. */
    summary: string;
    count: number;
    data: ProjectSummary[];
}

export interface AttentionResponse {
    categories: AttentionCategoryGroup[];
    total: number;
}

// ============================================================================
// Caching
// ============================================================================

let catalogCache: ProjectSummary[] | null = null;

/**
 * Per-code raw observation history (all months, earliest-seen first per
 * month), built alongside {@link catalogCache} so the detail page can render
 * the observed trajectory without recomputing it per request.
 */
let catalogHistoryCache: Map<string, HistoricalObservation[]> | null = null;

/**
 * Loads and deduplicates the historical observations into a project catalog.
 * Each project reflects its most recent observation (by reportMonth).
 *
 * @returns List of project summaries, one per projectCode.
 */
async function loadProjectCatalog(): Promise<ProjectSummary[]> {
    if (catalogCache) {
        return catalogCache;
    }

    const raw = await readFile(
        HISTORICAL_DATA_PATH,
        "utf-8"
    );

    const parsed = JSON.parse(raw) as {
        observations?: HistoricalObservation[];
    };

    const observations = parsed.observations ?? [];

    const latestByCode = new Map<
        string,
        HistoricalObservation
    >();

    const historyByCode = new Map<
        string,
        HistoricalObservation[]
    >();

    for (const observation of observations) {
        const projectCode = observation.projectCode;

        if (!projectCode) {
            continue;
        }

        const existing = latestByCode.get(projectCode);

        if (
            !existing ||
            (observation.reportMonth ?? "") >
                (existing.reportMonth ?? "")
        ) {
            latestByCode.set(projectCode, observation);
        }

        let months = historyByCode.get(projectCode);

        if (!months) {
            months = [];
            historyByCode.set(projectCode, months);
        }

        months.push(observation);
    }

    const catalog: ProjectSummary[] = [];

    for (const observation of latestByCode.values()) {
        catalog.push({
            projectCode: observation.projectCode as string,
            projectName:
                observation.projectName ?? "Untitled project",
            agency: observation.agency ?? null,
            state: observation.state ?? null,
            ministry: observation.ministry ?? null,
            sector: observation.sector ?? null,
            reportMonth: observation.reportMonth ?? null,
            physicalProgress:
                observation.physicalProgress ?? null,
            originalCost: observation.originalCost ?? null,
            revisedCost: observation.revisedCost ?? null,
            cumulativeExpenditure:
                observation.cumulativeExpenditure ?? null,
            originalDoc: observation.originalDoc ?? null,
            revisedDoc: observation.revisedDoc ?? null,
            predictionStatus: null,
            predictionReason: null,
            predictionMonth: null,
            riskLevel: null,
            probability: null,
            scheduleState: null,
            deadlineDate: null,
            remainingDays: null,
            observedVelocity: null,
            requiredVelocity: null,
            projectStage: null,
            attentionCategory: null,
        });
    }

    catalogCache = catalog;
    catalogHistoryCache = historyByCode;

    return catalog;
}

/**
 * Converts a "YYYY-MM" report month into a sortable month index, or null
 * when the value is malformed.
 */
function monthIndex(month: string): number | null {
    const match = /^(\d{4})-(\d{2})$/.exec(month);

    if (!match) return null;

    return Number(match[1]) * 12 + (Number(match[2]) - 1);
}

/**
 * Reduces a project's raw observations to one point per report month —
 * keeping the earliest-seen record on a same-month tie, mirroring the
 * catalog's deduplication rule — ordered oldest first.
 */
function buildHistoryPoints(
    observations: HistoricalObservation[]
): ProjectHistoryPoint[] {
    const byMonth = new Map<string, HistoricalObservation>();

    for (const observation of observations) {
        const month = observation.reportMonth;

        if (!month) continue;

        if (!byMonth.has(month)) {
            byMonth.set(month, observation);
        }
    }

    return Array.from(byMonth.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([reportMonth, observation]) => {
            const originalCost =
                observation.originalCost ?? null;
            const cumulativeExpenditure =
                observation.cumulativeExpenditure ?? null;

            let financialProgress: number | null = null;

            if (
                originalCost !== null &&
                originalCost > 0 &&
                cumulativeExpenditure !== null
            ) {
                financialProgress = Math.min(
                    100,
                    Math.max(
                        0,
                        (cumulativeExpenditure / originalCost) * 100
                    )
                );
            }

            return {
                reportMonth,
                physicalProgress:
                    observation.physicalProgress ?? null,
                cumulativeExpenditure,
                originalCost,
                revisedCost:
                    observation.revisedCost ?? null,
                originalDoc:
                    observation.originalDoc ?? null,
                revisedDoc:
                    observation.revisedDoc ?? null,
                financialProgress,
            };
        });
}

/**
 * Returns the observed monthly history for a project, including derived
 * intelligence fields (progress gap, stall status, deadline history,
 * observation frequency). All derived fields are sourced directly from
 * the real observations — nothing is invented.
 */
export function getProjectHistory(
    projectCode: string
): ProjectHistory | null {
    const raw = catalogHistoryCache?.get(projectCode);

    if (!raw || raw.length === 0) return null;

    const points = buildHistoryPoints(raw);

    if (points.length === 0) return null;

    // ── Interval counts ──
    let availableIntervals = 0;
    let consecutiveProgressIntervals = 0;
    let monthGaps = 0;

    for (let i = 1; i < points.length; i++) {
        const previous = points[i - 1] as ProjectHistoryPoint | undefined;
        const current = points[i] as ProjectHistoryPoint | undefined;

        if (
            !previous ||
            !current
        ) {
            continue;
        }

        if (
            previous.physicalProgress !== null &&
            current.physicalProgress !== null
        ) {
            availableIntervals += 1;
        }

        const prevIndex = monthIndex(
            previous.reportMonth
        );
        const currIndex = monthIndex(current.reportMonth);

        if (prevIndex !== null && currIndex !== null) {
            if (currIndex - prevIndex === 1) {
                consecutiveProgressIntervals += 1;
            } else if (currIndex - prevIndex > 1) {
                monthGaps += 1;
            }
        }
    }

    // ── Progress gap (latest observation) ──
    const latest = points[points.length - 1]!;
    const progressGap =
        latest.physicalProgress !== null &&
        latest.financialProgress !== null
            ? Math.round(
                  (latest.physicalProgress - latest.financialProgress) * 10
              ) / 10
            : null;

    let progressGapInterpretation: string | null = null;
    let progressGapLabel: string | null = null;

    if (progressGap !== null) {
        const absGap = Math.abs(progressGap);

        if (progressGap > 0) {
            progressGapInterpretation =
                `Physical execution is ${absGap.toFixed(1)} pp ahead of financial progress. Financial lag may reflect billing/payment timing, retention, certification delays, or reporting lag.`;
            progressGapLabel = "FINANCIAL_LAG";
        } else if (progressGap < 0) {
            progressGapInterpretation =
                `Financial progress is ${absGap.toFixed(1)} pp ahead of physical execution. This may reflect advance payments, procurement commitments, or scope changes.`;
            progressGapLabel = "FINANCIAL_LEAD";
        } else {
            progressGapInterpretation =
                "Physical and financial progress are aligned.";
            progressGapLabel = "ALIGNED";
        }
    }

    // ── Stall status ──
    let stallStatus: StallStatus = "insufficient_data";
    let stalledSinceMonth: string | null = null;
    let stallDurationMonths: number | null = null;

    if (points.length >= 2) {
        // Walk backwards from the latest observation to find the most
        // recent month where progress was non-zero.
        let lastNonZeroIndex = -1;

        for (let i = points.length - 1; i >= 0; i--) {
            const pt = points[i] as ProjectHistoryPoint;

            if (pt.physicalProgress !== null && pt.physicalProgress > 0) {
                lastNonZeroIndex = i;
                break;
            }
        }

        if (lastNonZeroIndex === -1) {
            // All observations have zero or null progress.
            stallStatus = "stalled";
            stalledSinceMonth = points[0]?.reportMonth ?? null;
            stallDurationMonths = points.length;
        } else if (lastNonZeroIndex < points.length - 1) {
            // There are observations AFTER the last non-zero one.
            const stalledObsCount =
                points.length - 1 - lastNonZeroIndex;

            // Only call it "stalled" if we have ≥2 consecutive zero-progress
            // observations with no month gaps between the stall start and now.
            if (stalledObsCount >= 2) {
                // Verify no gaps during the stall period.
                let stallHasGaps = false;

                for (
                    let i = lastNonZeroIndex + 1;
                    i < points.length;
                    i++
                ) {
                    const prev = points[i - 1] as ProjectHistoryPoint;
                    const cur = points[i] as ProjectHistoryPoint;
                    const prevIdx = monthIndex(prev.reportMonth);
                    const curIdx = monthIndex(cur.reportMonth);

                    if (
                        prevIdx !== null &&
                        curIdx !== null &&
                        curIdx - prevIdx > 1
                    ) {
                        stallHasGaps = true;
                        break;
                    }
                }

                if (!stallHasGaps) {
                    stallStatus = "stalled";
                    stalledSinceMonth =
                        points[lastNonZeroIndex + 1]?.reportMonth ?? null;
                    stallDurationMonths = stalledObsCount;
                } else {
                    stallStatus = "slowing";
                }
            } else if (stalledObsCount === 1) {
                stallStatus = "slowing";
            } else {
                stallStatus = "active";
            }
        } else {
            stallStatus = "active";
        }

        // Check if the most recent interval shows deceleration.
        if (stallStatus === "active" && points.length >= 2) {
            const last = points[points.length - 1] as ProjectHistoryPoint;
            const prev = points[points.length - 2] as ProjectHistoryPoint;

            if (
                last.physicalProgress !== null &&
                prev.physicalProgress !== null
            ) {
                const delta =
                    last.physicalProgress - prev.physicalProgress;

                if (delta <= 0 && delta > -1) {
                    stallStatus = "slowing";
                }
            }
        }
    } else {
        // Only one observation — cannot determine stall status.
        stallStatus = "insufficient_data";
    }

    // ── Deadline history ──
    const originalDocsSeen = new Set<string>();
    const revisedDocsSeen = new Set<string>();

    for (const pt of points) {
        if (pt.originalDoc) originalDocsSeen.add(pt.originalDoc);
        if (pt.revisedDoc) revisedDocsSeen.add(pt.revisedDoc);
    }

    const deadlineHistory: DeadlineHistoryEntry[] = [];
    let deadlineRevisionCount = 0;

    // Original deadline (from earliest observation or the project-level originalDoc).
    const firstPoint = points[0] as ProjectHistoryPoint;

    if (firstPoint.originalDoc) {
        deadlineHistory.push({
            date: firstPoint.originalDoc,
            label: "original",
        });
    }

    // Collect all distinct revisedDoc values across observations, sorted.
    const allRevisedDocs = Array.from(revisedDocsSeen).sort();

    if (allRevisedDocs.length > 0) {
        // If the latest revisedDoc differs from the originalDoc, count revisions.
        const latestRevised =
            allRevisedDocs[allRevisedDocs.length - 1]!;

        const earlierRevisions = allRevisedDocs.filter(
            (d) => d !== firstPoint.originalDoc
        );

        deadlineRevisionCount = earlierRevisions.length;

        for (let i = 0; i < earlierRevisions.length; i++) {
            const isLatest =
                earlierRevisions[i] === latestRevised;

            deadlineHistory.push({
                date: earlierRevisions[i]!,
                label: isLatest ? "current" : "revision",
                revisionNumber: i + 1,
            });
        }
    } else if (deadlineHistory.length > 0) {
        // No revisedDoc exists — original is also current.
        deadlineHistory[0]!.label = "current";
    }

    const originalDeadline =
        firstPoint.originalDoc ?? null;
    const latestDeadline =
        allRevisedDocs.length > 0
            ? allRevisedDocs[allRevisedDocs.length - 1]!
            : firstPoint.originalDoc ?? null;

    // ── Observation frequency ──
    let observationFrequency:
        | "monthly"
        | "irregular"
        | "single" = "single";

    if (points.length === 1) {
        observationFrequency = "single";
    } else if (monthGaps === 0) {
        observationFrequency = "monthly";
    } else {
        observationFrequency = "irregular";
    }

    // ── Deadline revision trend ──
    let deadlineRevisionTrend:
        | "rising"
        | "stable"
        | "falling"
        | "insufficient_history" = "insufficient_history";

    if (allRevisedDocs.length >= 2) {
        // Compare the earliest and latest revisedDoc dates.
        const earliest = allRevisedDocs[0]!;
        const latest_ = allRevisedDocs[allRevisedDocs.length - 1]!;

        if (latest_ > earliest) {
            deadlineRevisionTrend = "rising";
        } else if (latest_ < earliest) {
            deadlineRevisionTrend = "falling";
        } else {
            deadlineRevisionTrend = "stable";
        }
    } else if (allRevisedDocs.length === 1 && firstPoint.originalDoc) {
        // Only one revisedDoc — compare against original.
        if (allRevisedDocs[0]! > firstPoint.originalDoc) {
            deadlineRevisionTrend = "rising";
        } else if (allRevisedDocs[0]! < firstPoint.originalDoc) {
            deadlineRevisionTrend = "falling";
        } else {
            deadlineRevisionTrend = "stable";
        }
    } else {
        deadlineRevisionTrend = "insufficient_history";
    }

    return {
        points,
        observationCount: points.length,
        consecutiveProgressIntervals,
        availableIntervals,

        progressGap,
        progressGapInterpretation,
        progressGapLabel,

        stallStatus,
        stalledSinceMonth,
        stallDurationMonths,

        deadlineRevisionCount,
        deadlineHistory,
        originalDeadline,
        latestDeadline,

        observationFrequency,
        hasGaps: monthGaps > 0,

        deadlineRevisionTrend,
    };
}

/**
 * Returns the project catalog, optionally filtered by a free-text search
 * across project name, code, ministry, sector, agency, and state.
 *
 * @param search - Optional case-insensitive filter string.
 * @returns Filtered list of project summaries.
 */
async function getFilteredProjects(
    search?: string
): Promise<ProjectSummary[]> {
    const catalog = await loadProjectCatalog();

    const term = (search ?? "").trim().toLowerCase();

    if (!term) {
        return catalog;
    }

    return catalog.filter((project) =>
        [
            project.projectName,
            project.projectCode,
            project.ministry,
            project.sector,
            project.agency,
            project.state,
        ]
            .join(" ")
            .toLowerCase()
            .includes(term)
    );
}

/**
 * Enriches a list of projects with the cached ML risk index.
 *
 * When the risk index is unavailable (ML service unreachable) the projects
 * are returned unchanged with null risk fields so the explorer still works.
 *
 * @param projects - Projects to enrich (in place).
 * @param riskByCode - Project → risk entry map, or null when unavailable.
 */
function enrichWithRisk(
    projects: ProjectSummary[],
    riskByCode:
        | Map<string, ProjectRisk>
        | null
        | undefined
): void {
    const hasRisk = Boolean(riskByCode);

    for (const project of projects) {
        // Product stage is derived from the reported observation regardless
        // of whether a prediction exists.
        project.projectStage = computeProjectStage(
            project.physicalProgress
        );

        if (!hasRisk) {
            project.attentionCategory = null;
            continue;
        }

        const risk = riskByCode
            ? riskByCode.get(project.projectCode)
            : undefined;

        if (!risk) {
            project.attentionCategory = null;
            continue;
        }

        project.predictionStatus = risk.status;
        project.predictionReason = risk.reasonCode;
        project.predictionMonth = risk.predictionMonth;
        project.riskLevel = risk.riskLevel;
        project.probability = risk.probability;
        project.scheduleState = risk.scheduleState;
        project.deadlineDate = risk.deadlineDate;
        project.remainingDays = risk.remainingDays;
        project.observedVelocity = risk.observedVelocity;
        project.requiredVelocity = risk.requiredVelocity;

        // Attention must be classified AFTER the risk/schedule fields are
        // joined in, since the rules depend on schedule state, probability,
        // velocities, and remaining days.
        project.attentionCategory = determineAttentionCategory(
            project
        );
    }
}

/**
 * Computes the product-level lifecycle stage for a project. This is a domain
 * classification derived from reported physical progress — it is NOT a model
 * prediction and does not touch ML probabilities.
 *
 * - closure_watch: physical progress is >= 97% (final ~3%, finalization stage)
 * - normal_execution: otherwise
 * - null: no physical progress reported
 */
function computeProjectStage(
    physicalProgress: number | null
): ProjectStage | null {
    if (physicalProgress === null) return null;

    return physicalProgress >= CLOSURE_WATCH_PROGRESS_THRESHOLD
        ? "closure_watch"
        : "normal_execution";
}

/** Physical progress % at/above which a project enters the Closure Watch stage. */
const CLOSURE_WATCH_PROGRESS_THRESHOLD = 97;

/**
 * High-ish model probability band for the MONITOR category. Mirrors the
 * existing medium risk bucket; low probabilities stay outside attention.
 */
const MONITOR_MINIMUM_PROBABILITY = 0.3; // medium and above

/** Venue for a large remaining-days urgency signal used by MONITOR. */
const APPROACHING_DEADLINE_DAYS = 60;

/**
 * Minimum remaining-work percentage (100 - physicalProgress) for the
 * velocity-gap intervention rule to apply. A project that is already >=95%
 * complete has so little work left that a velocity deficit is immaterial.
 */
const VELOCITY_GAP_REMAINING_PROGRESS_MIN = 5;

/**
 * Velocity gap (percentage points/month) between required and observed
 * pace, above which the project is behind by a margin large enough to be a
 * genuine intervention trigger. Presentational threshold — the ML prediction
 * is never changed by these rules.
 */
const VELOCITY_GAP_POINTS_MIN = 2.0;

/** Cost increase % (revised vs original) that flags a project for review. */
const SIGNIFICANT_COST_INCREASE_PERCENT = 5;

/**
 * For near-complete (Closure Watch) projects, financial signals are read in
 * context: a high cost revision is only treated as a genuine spending problem
 * when spending is NOT already essentially complete. If cumulative expenditure
 * has reached at least this % of the (revised) cost, the project is in normal
 * final-stage financial reconciliation rather than uncontrolled escalation.
 */
const NEAR_COMPLETE_SPENDING_COMPLETE_PERCENT = 90;

/**
 * Determines the attention category for a project — the product question
 * "does this actually require officer attention?" — independent of the
 * model's deadline-revision probability.
 *
 * The category answers "What should an officer do?", which is kept separate
 * from the model's deadline-revision outlook. High physical completion does
 * not, by itself, imply intervention, and high financial completion does not
 * make a near-complete project problematic.
 *
 * Priority order (first match wins):
 *   1. INTERVENTION_REQUIRED — concrete evidence of an unresolved execution
 *        or spending problem an officer should act on:
 *          overdue / stalled / regressing schedule (a genuinely stuck or
 *            regressing project needs intervention even when it is >=97% —
 *            "99% complete and stalled" is still INTERVENTION REQUIRED);
 *          meaningful cost escalation, EXCEPT for near-complete projects whose
 *            spending is already substantially spent (normal final-stage
 *            reconciliation, not a live financial problem);
 *          a large observed-vs-required velocity gap (>=2.0 pp/month) with a
 *            meaningful amount of work still remaining.
 *        A high model probability ALONE never triggers intervention.
 *   2. CLOSURE_WATCH — finalization stage (>=97% physical) for a project that
 *        is not otherwise warranting intervention. This is the default home of
 *        nearly-complete projects — including ones with a high deadline
 *        revision outlook but no unresolved execution problem. Outranks
 *        MONITOR: nearing sign-off, so verify closure rather than throughput.
 *   3. MONITOR — needs watching but lacks intervention evidence: medium/high
 *        deadline-revision outlook, behind schedule, approaching deadline,
 *        insufficient observed velocity, or a large physical-vs-financial gap
 *        (>=30 points).
 *   4. null — no attention category (normal execution, low outlook, healthy).
 */
function determineAttentionCategory(
    project: ProjectSummary
): AttentionCategory | null {
    const { scheduleState, remainingDays, physicalProgress } = project;

    // A genuinely stuck, regressing, or overdue project requires intervention
    // regardless of how close to completion it is. "99% complete and stalled"
    // is still an execution problem, not a closure matter.
    if (
        scheduleState === "overdue_incomplete" ||
        scheduleState === "stalled" ||
        scheduleState === "regressing"
    ) {
        return "intervention_required";
    }

    const isNearComplete =
        physicalProgress !== null && physicalProgress >= CLOSURE_WATCH_PROGRESS_THRESHOLD;

    // Significant cost increase over the sanctioned original estimate. For
    // near-complete projects, a cost revision is only a genuine financial
    // intervention when spending is NOT already essentially complete — a
    // 97%+ project with ~100% expenditure is in normal final reconciliation,
    // not uncontrolled cost escalation.
    if (
        project.revisedCost !== null &&
        project.originalCost !== null &&
        project.originalCost > 0
    ) {
        const increase =
            ((project.revisedCost - project.originalCost) /
                project.originalCost) *
            100;

        if (increase >= SIGNIFICANT_COST_INCREASE_PERCENT) {
            if (!isNearComplete) {
                return "intervention_required";
            }

            // For near-complete projects, only flag when spending is still
            // meaningfully short of completion (i.e. real money is still being
            // spent against an inflated budget).
            const spending = financialProgress(project);
            if (
                spending === null ||
                spending < NEAR_COMPLETE_SPENDING_COMPLETE_PERCENT
            ) {
                return "intervention_required";
            }
        }
    }

    // Large velocity gap: observed execution trails the required pace by at
    // least 2.0 pp/month, with a meaningful amount of work still remaining.
    const remainingProgress =
        physicalProgress !== null
            ? Math.max(0, 100 - physicalProgress)
            : null;

    if (
        project.observedVelocity !== null &&
        project.requiredVelocity !== null &&
        remainingProgress !== null &&
        remainingProgress >= VELOCITY_GAP_REMAINING_PROGRESS_MIN
    ) {
        const gap =
            project.requiredVelocity - project.observedVelocity;

        if (gap >= VELOCITY_GAP_POINTS_MIN) {
            return "intervention_required";
        }
    }

    // ── CLOSURE WATCH (default home of near-complete projects) ──────────
    // Outranks MONITOR: a nearly-complete project that has no unresolved
    // intervention signal is a final-stage verification matter, not a
    // throughput/watch item — even when its deadline outlook is elevated.
    if (project.projectStage === "closure_watch") {
        return "closure_watch";
    }

    // ── MONITOR ─────────────────────────────────────────────────────────
    if (
        scheduleState === "behind" ||
        scheduleState === "insufficient_observed_velocity" ||
        (project.probability !== null &&
            project.probability >= MONITOR_MINIMUM_PROBABILITY)
    ) {
        return "monitor";
    }

    if (
        remainingDays !== null &&
        remainingDays > 0 &&
        remainingDays <= APPROACHING_DEADLINE_DAYS
    ) {
        return "monitor";
    }

    // Large physical-vs-financial divergence (>=30 points) signals an
    // execution/commitment imbalance worth monitoring.
    const physical = physicalProgress;
    const financial = financialProgress(project);
    if (
        physical !== null &&
        financial !== null &&
        Math.abs(physical - financial) >= 30
    ) {
        return "monitor";
    }

    return null;
}

function matchesFacet(
    value: string | null,
    filter: string | undefined
): boolean {
    if (!filter) return true;

    return (value ?? "").trim() === filter.trim();
}

/**
 * Financial progress derived from cumulative expenditure vs original cost.
 * Presentation only — not a model prediction. Returns null when the data
 * is missing or the denominator is zero. Mirrors the Project Explorer so
 * the range filter keeps the list consistent with what the table renders.
 */
function financialProgress(
    project: ProjectSummary
): number | null {
    if (
        project.cumulativeExpenditure === null ||
        project.originalCost === null ||
        project.originalCost === 0
    ) {
        return null;
    }

    const ratio =
        (project.cumulativeExpenditure /
            project.originalCost) *
        100;

    return Math.min(100, Math.max(0, ratio));
}

function inRange(
    value: number | null,
    from: number | undefined,
    to: number | undefined
): boolean {
    if (value === null || value === undefined) {
        return false;
    }

    if (from !== undefined && value < from) {
        return false;
    }

    if (to !== undefined && value > to) {
        return false;
    }

    return true;
}

function applyFilters(
    projects: ProjectSummary[],
    filters: {
        ministry?: string;
        sector?: string;
        state?: string;
        agency?: string;
        scheduleState?: string;
        riskLevel?: string;
        predictionStatus?: "predicted" | "unavailable";
        progressFrom?: number;
        progressTo?: number;
        financialFrom?: number;
        financialTo?: number;
        projectStage?: ProjectStage | "unknown";
        attentionCategory?: AttentionCategory;
    }
): ProjectSummary[] {
    const {
        ministry,
        sector,
        state,
        agency,
        scheduleState,
        riskLevel,
        predictionStatus,
        progressFrom,
        progressTo,
        financialFrom,
        financialTo,
        projectStage,
        attentionCategory,
    } = filters;

    const hasFacetFilter =
        Boolean(ministry) ||
        Boolean(sector) ||
        Boolean(state) ||
        Boolean(agency) ||
        Boolean(scheduleState) ||
        Boolean(riskLevel) ||
        projectStage !== undefined ||
        attentionCategory !== undefined;

    const hasRangeFilter =
        predictionStatus !== undefined ||
        progressFrom !== undefined ||
        progressTo !== undefined ||
        financialFrom !== undefined ||
        financialTo !== undefined;

    if (!hasFacetFilter && !hasRangeFilter) {
        return projects;
    }

    return projects.filter((project) => {
        if (!matchesFacet(project.ministry, ministry)) {
            return false;
        }

        if (!matchesFacet(project.sector, sector)) {
            return false;
        }

        if (!matchesFacet(project.state, state)) {
            return false;
        }

        if (!matchesFacet(project.agency, agency)) {
            return false;
        }

        // Schedule-state and risk-level filters act on the ML prediction.
        // Projects without a prediction never match these filters.
        if (scheduleState) {
            if (
                project.predictionStatus !==
                    "predicted" ||
                project.scheduleState !== scheduleState
            ) {
                return false;
            }
        }

        if (riskLevel) {
            if (
                project.predictionStatus !==
                    "predicted" ||
                project.riskLevel !== riskLevel
            ) {
                return false;
            }
        }

        // Prediction availability. When the ML service is unreachable every
        // project has a null status, which still counts as "unavailable"
        // from a product perspective.
        if (predictionStatus === "predicted") {
            if (project.predictionStatus !== "predicted") {
                return false;
            }
        } else if (predictionStatus === "unavailable") {
            if (project.predictionStatus === "predicted") {
                return false;
            }
        }

        if (
            !inRange(
                project.physicalProgress,
                progressFrom,
                progressTo
            )
        ) {
            return false;
        }

        if (
            !inRange(
                financialProgress(project),
                financialFrom,
                financialTo
            )
        ) {
            return false;
        }

        if (
            projectStage === "unknown" &&
            project.projectStage !== null
        ) {
            return false;
        }

        if (
            projectStage !== undefined &&
            projectStage !== "unknown" &&
            project.projectStage !== projectStage
        ) {
            return false;
        }

        if (
            attentionCategory !== undefined &&
            project.attentionCategory !== attentionCategory
        ) {
            return false;
        }

        return true;
    });
}

/**
 * Number comparator that always sorts null/missing values last.
 */
function numericCompare(
    a: number | null,
    b: number | null,
    descending: boolean
): number {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;

    return descending ? b - a : a - b;
}

function applySort(
    projects: ProjectSummary[],
    sort?: string
): void {
    switch (sort) {
        case "name":
            projects.sort((a, b) =>
                a.projectName.localeCompare(b.projectName)
            );
            break;

        case "progress":
            projects.sort((a, b) =>
                numericCompare(
                    a.physicalProgress,
                    b.physicalProgress,
                    true
                )
            );
            break;

        case "financial":
            projects.sort((a, b) =>
                numericCompare(
                    financialProgress(a),
                    financialProgress(b),
                    true
                )
            );
            break;

        case "cost":
            projects.sort((a, b) =>
                numericCompare(
                    a.originalCost,
                    b.originalCost,
                    true
                )
            );
            break;

        case "deadline":
            // Most urgent first: fewest days remaining (overdue = negative
            // days appear first).
            projects.sort((a, b) =>
                numericCompare(
                    a.remainingDays,
                    b.remainingDays,
                    false
                )
            );
            break;

        case "risk":
        default:
            // Projects with a prediction first, ordered by revision
            // probability (highest first). Honest "revised deadline"
            // outlook, not a failure risk score.
            projects.sort((a, b) => {
                const aPredicted =
                    a.predictionStatus === "predicted";
                const bPredicted =
                    b.predictionStatus === "predicted";

                if (aPredicted !== bPredicted) {
                    return aPredicted ? -1 : 1;
                }

                if (aPredicted && bPredicted) {
                    const delta =
                        (b.probability ?? 0) -
                        (a.probability ?? 0);

                    if (delta !== 0) return delta;
                }

                return a.projectCode.localeCompare(
                    b.projectCode
                );
            });
            break;
    }
}

// ============================================================================
// Facets & Portfolio Stats
// ============================================================================

function countFacet(
    projects: ProjectSummary[],
    pick: (project: ProjectSummary) => string | null
): FacetValue[] {
    const counts = new Map<string, number>();

    for (const project of projects) {
        const value = (pick(project) ?? "")
            .trim();

        if (!value) continue;

        counts.set(
            value,
            (counts.get(value) ?? 0) + 1
        );
    }

    return Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value));
}

/**
 * Returns distinct filter values backed by real data, including current
 * ML prediction coverage for schedule-state and risk-level filters.
 */
export async function getProjectFacets(): Promise<ProjectFacets> {
    const catalog = await loadProjectCatalog();

    const riskIndex = await getRiskIndex();

    enrichWithRisk(
        catalog,
        riskIndex?.byCode
    );

    const predicted = catalog.filter(
        (project) =>
            project.predictionStatus === "predicted"
    );

    const scheduleStates = countFacet(
        predicted,
        (project) => project.scheduleState
    );

    const riskLevels = countFacet(
        predicted,
        (project) => project.riskLevel
    );

    return {
        ministries: countFacet(
            catalog,
            (project) => project.ministry
        ),
        sectors: countFacet(
            catalog,
            (project) => project.sector
        ),
        states: countFacet(
            catalog,
            (project) => project.state
        ),
        agencies: countFacet(
            catalog,
            (project) => project.agency
        ),
        scheduleStates,
        riskLevels,
        predictionSummary: {
            total: catalog.length,
            predicted: predicted.length,
            unavailable:
                catalog.length - predicted.length,
        },
        projectStages: countFacet(
            catalog,
            (project) => project.projectStage
        ),
        attentionCategories: countFacet(
            catalog,
            (project) => project.attentionCategory
        ),
    };
}

/**
 * Returns portfolio-level aggregates for the national situation overview.
 */
export async function getPortfolioStats(): Promise<PortfolioStats> {
    const catalog = await loadProjectCatalog();

    const riskIndex = await getRiskIndex();

    enrichWithRisk(
        catalog,
        riskIndex?.byCode
    );

    const predicted = catalog.filter(
        (project) =>
            project.predictionStatus === "predicted"
    );

    const countRisk = (level: RiskLevel) =>
        predicted.filter(
            (project) => project.riskLevel === level
        ).length;

    return {
        totalProjects: catalog.length,
        predictedCount: predicted.length,
        unavailableCount:
            catalog.length - predicted.length,
        highRiskCount: countRisk("high"),
        mediumRiskCount: countRisk("medium"),
        lowRiskCount: countRisk("low"),
        latestReportMonths: countFacet(
            catalog,
            (project) => project.reportMonth
        )
            .sort((a, b) =>
                b.value.localeCompare(a.value)
            )
            .slice(0, 6),
    };
}

/**
 * Severity boost for the attention ranking by schedule condition. These are
 * additive signals on TOP of the model probability — they never change the
 * ML prediction, only how the UI orders the "Projects Requiring Attention"
 * surface.
 */
const ATTENTION_SCHEDULE_SEVERITY: Partial<
    Record<ScheduleState, number>
> = {
    overdue_incomplete: 0.12,
    regressing: 0.12,
    stalled: 0.09,
    behind: 0.06,
    insufficient_observed_velocity: 0.03,
};

/**
 * Ranks a single category's projects for display.
 *
 * For intervention_required, projects with the most severe schedule
 * condition are surfaced first (stuck/overdue/regressing > behind > other),
 * then by model deadline-revision probability within a tier — so a cost-only
 * overrun on an otherwise healthy project never outranks a stalled one.
 * All other categories are ordered by model probability (highest first);
 * category members without a prediction fall to the end. This is a *display*
 * ordering within an already-determined category — it never changes which
 * category a project belongs to.
 */
function sortCategory(
    projects: ProjectSummary[]
): ProjectSummary[] {
    return projects.slice().sort((a, b) => {
        const aSeverity =
            a.attentionCategory === "intervention_required"
                ? interventionTier(a.scheduleState)
                : 0;
        const bSeverity =
            b.attentionCategory === "intervention_required"
                ? interventionTier(b.scheduleState)
                : 0;

        if (aSeverity !== bSeverity) {
            return bSeverity - aSeverity;
        }

        const aPred = a.predictionStatus === "predicted";
        const bPred = b.predictionStatus === "predicted";

        if (aPred !== bPred) return aPred ? -1 : 1;

        if (aPred && bPred) {
            const delta = (b.probability ?? 0) - (a.probability ?? 0);
            if (delta !== 0) return delta;
        }

        return a.projectCode.localeCompare(b.projectCode);
    });
}

/**
 * Display severity tier for the intervention surface.
 * 4: stuck / overdue / regressing · 3: stalled · 2: behind · 1: other.
 */
function interventionTier(scheduleState: ScheduleState | null): number {
    switch (scheduleState) {
        case "overdue_incomplete":
        case "regressing":
            return 4;
        case "stalled":
            return 3;
        case "behind":
            return 2;
        default:
            return 1;
    }
}

/**
 * Newline-free, copy-safe one-line summary per category, rendered on the
 * attention surface to explain why projects landed there.
 */
const ATTENTION_CATEGORY_SUMMARY: Record<
    AttentionCategory,
    string
> = {
    intervention_required:
        "Overdue, stalled, or regressing schedules; a cost increase above 5% over the sanctioned original estimate; or observed execution lagging the required pace by 2+ points/month with at least 5% of work remaining. An officer should act.",
    monitor:
        "Medium or high model deadline-revision outlook, running behind schedule, approaching the completion deadline, insufficient observed velocity, or a 30+ point gap between physical and financial progress. Keep watching.",
    closure_watch:
        "At or above 97% physical progress and otherwise healthy. Finalization stage — confirm closure, not track execution.",
};

/**
 * Returns the portfolio projects that deserve a human review, split into the
 * three product categories (INTERVENTION REQUIRED / MONITOR / CLOSURE WATCH).
 *
 * Category membership is entirely orthogonal to the model's deadline-revision
 * probability (see {@link determineAttentionCategory}); the model prediction
 * is unchanged.
 *
 * @returns Categorized attention groups (empty categories omitted) plus a
 *          total count of projects that received a category.
 */
export async function getAttentionProjects(): Promise<AttentionResponse> {
    const catalog = await loadProjectCatalog();

    const riskIndex = await getRiskIndex();

    enrichWithRisk(
        catalog,
        riskIndex?.byCode
    );

    const grouped = new Map<AttentionCategory, ProjectSummary[]>();

    for (const project of catalog) {
        if (project.attentionCategory === null) continue;

        let bucket = grouped.get(project.attentionCategory);
        if (!bucket) {
            bucket = [];
            grouped.set(project.attentionCategory, bucket);
        }
        bucket.push(project);
    }

    const categories: AttentionCategoryGroup[] = [];

    const ORDER: AttentionCategory[] = [
        "intervention_required",
        "monitor",
        "closure_watch",
    ];

    for (const key of ORDER) {
        const bucket = grouped.get(key);
        if (!bucket || bucket.length === 0) continue;

        categories.push({
            key,
            summary: ATTENTION_CATEGORY_SUMMARY[key],
            count: bucket.length,
            data: sortCategory(bucket),
        });
    }

    const total = categories.reduce(
        (sum, group) => sum + group.count,
        0
    );

    return { categories, total };
}

/**
 * Retrieves a single project by its projectCode, including its observed
 * monthly history (used by the detail page's trajectory / what-changed /
 * confidence sections).
 *
 * @param projectCode - The unique PAIMANA project code.
 * @returns The project detail (latest summary + history) or null if not found.
 */
export async function getProjectByCode(
    projectCode: string
): Promise<ProjectDetail | null> {
    const catalog = await loadProjectCatalog();

    const project =
        catalog.find(
            (project) =>
                project.projectCode === projectCode
        ) ?? null;

    if (!project) {
        return null;
    }

    const riskIndex = await getRiskIndex();

    enrichWithRisk(
        [project],
        riskIndex?.byCode
    );

    const history = getProjectHistory(projectCode);

    return { project, history };
}

/**
 * Retrieves a paginated list of projects.
 *
 * @param params - Pagination, search, filter, and sort parameters.
 * @returns A page of projects plus pagination metadata.
 */
export async function listProjects(params: {
    page?: number;
    limit?: number;
    search?: string;
    ministry?: string;
    sector?: string;
    state?: string;
    agency?: string;
    scheduleState?: string;
    riskLevel?: string;
    predictionStatus?: "predicted" | "unavailable";
    progressFrom?: number;
    progressTo?: number;
    financialFrom?: number;
    financialTo?: number;
    projectStage?: ProjectStage | "unknown";
    attentionCategory?: AttentionCategory;
    sort?: string;
}): Promise<ProjectCatalogResponse> {
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const limit = Math.min(
        200,
        Math.max(1, Math.floor(params.limit ?? 50))
    );

    const filtered = await getFilteredProjects(
        params.search
    );

    const riskIndex = await getRiskIndex();

    enrichWithRisk(
        filtered,
        riskIndex?.byCode
    );

    const matched = applyFilters(filtered, params);

    // Clone before sorting so the shared catalog cache is never reordered.
    const sorted = matched.slice();

    applySort(sorted, params.sort);

    const totalProjects = sorted.length;
    const totalPages = Math.ceil(totalProjects / limit);
    const safePage = Math.min(page, Math.max(1, totalPages));

    const start = (safePage - 1) * limit;

    return {
        data: sorted.slice(start, start + limit),
        pagination: {
            page: safePage,
            limit,
            totalProjects,
            totalPages,
        },
    };
}
