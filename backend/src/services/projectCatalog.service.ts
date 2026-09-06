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

    return catalog;
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
 * Retrieves a single project by its projectCode.
 *
 * @param projectCode - The unique PAIMANA project code.
 * @returns The project summary or null if not found.
 */
export async function getProjectByCode(
    projectCode: string
): Promise<ProjectSummary | null> {
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

    return project;
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
