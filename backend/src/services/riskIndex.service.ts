/**
 * Risk Index Service Module
 *
 * Provides a lightweight, cached per-project ML risk assessment used by the
 * Project Explorer filters and the "Projects Requiring Attention" surfaces.
 *
 * A single model call is made per project at its most recent observation
 * month. This is strictly the ML prediction endpoint — external evidence and
 * LLM recommendation generation are deliberately NOT invoked here, so the
 * project list never triggers the expensive intelligence pipeline.
 *
 * The index is computed lazily on first use, cached in memory, and rebuilt
 * automatically when the underlying observations snapshot changes.
 */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const ML_SERVICE_URL =
    process.env.ML_SERVICE_URL ?? "http://127.0.0.1:8000";

/** Request timeout for a single ML prediction call. */
const ML_REQUEST_TIMEOUT_MS = 15_000;

/** Seconds to skip a re-attempt after the ML service is unreachable. */
const ML_UNAVAILABLE_COOLDOWN_MS = 30_000;

/** Maximum number of concurrent ML prediction requests. */
const CONCURRENCY = 16;

// ============================================================================
// Types
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
 * Per-project risk assessment derived from the ML service.
 */
export interface ProjectRisk {
    projectCode: string;
    /** Month the prediction was computed for (project's latest observation). */
    predictionMonth: string | null;
    riskLevel: RiskLevel | null;
    probability: number | null;
    scheduleState: ScheduleState | null;
    remainingDays: number | null;
    deadlineDate: string | null;
    status: "predicted" | "unavailable";
    reasonCode: string | null;
    /**
     * Recent observed progress velocity (percentage points/month) reported by
     * the ML context. Null when the history does not support an estimate.
     * Surfaced unchanged from the model context — used only for the
     * product-level attention classification, never to alter predictions.
     */
    observedVelocity: number | null;
    /** Required progress velocity to meet the deadline. Null when overdue. */
    requiredVelocity: number | null;
}

interface RiskIndexResult {
    byCode: Map<string, ProjectRisk>;
    /** Total number of projects with a computed prediction. */
    predictedCount: number;
    mlAvailable: boolean;
}

// ============================================================================
// Raw historical observation helpers (kept local to avoid circular deps)
// ============================================================================

interface HistoricalObservation {
    projectCode?: string | null;
    reportMonth?: string | null;
}

async function loadLatestByCode(): Promise<
    Map<string, HistoricalObservation>
> {
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

        if (!projectCode) continue;

        const existing = latestByCode.get(projectCode);

        if (
            !existing ||
            (observation.reportMonth ?? "") >
                (existing.reportMonth ?? "")
        ) {
            latestByCode.set(
                projectCode,
                observation
            );
        }
    }

    return latestByCode;
}

// ============================================================================
// Caching
// ============================================================================

let riskIndexCache: RiskIndexResult | null = null;
let riskIndexInflight: Promise<RiskIndexResult | null> | null = null;
let lastSeenMtime: number | null = null;

/** Timestamp of the last failed full-index build (ML unreachable). */
let lastFailureAt: number | null = null;
let mlUnavailable = false;

/**
 * Returns the public risk map for the current social snapshot.
 * Returns null when the ML service cannot be reached so callers can degrade
 * gracefully (list still works, risk fields simply stay empty).
 */
export async function getRiskIndex(): Promise<{
    byCode: Map<string, ProjectRisk>;
    predictedCount: number;
    mlAvailable: boolean;
} | null> {
    const mtime = await getDataMtime();

    if (
        lastSeenMtime !== null &&
        mtime !== lastSeenMtime
    ) {
        riskIndexCache = null;
        riskIndexInflight = null;
    }

    lastSeenMtime = mtime;

    if (riskIndexCache) {
        return riskIndexCache;
    }

    if (
        lastFailureAt &&
        Date.now() - lastFailureAt <
            ML_UNAVAILABLE_COOLDOWN_MS
    ) {
        return null;
    }

    if (riskIndexInflight) {
        return riskIndexInflight;
    }

    const build = buildRiskIndex().catch((error) => {
        const isUnavailable = (
            error instanceof Error &&
            error.message === "ML_SERVICE_UNAVAILABLE"
        );

        if (isUnavailable) {
            mlUnavailable = true;
            lastFailureAt = Date.now();
            return null;
        }

        throw error;
    });

    riskIndexInflight = build;

    const result = await build;

    riskIndexInflight = null;

    return result;
}

async function getDataMtime(): Promise<number> {
    try {
        const stats = await stat(
            HISTORICAL_DATA_PATH
        );

        return stats.mtimeMs;
    } catch {
        return 0;
    }
}

// ============================================================================
// ML prediction calls
// ============================================================================

interface MLContext {
    scheduleState?: string | null;
    remainingDays?: number | null;
    deadlineDate?: string | null;
    observedVelocity?: number | null;
    requiredVelocity?: number | null;
}

interface MLPrediction {
    riskLevel?: string | null;
    probability?: number | null;
}

interface MLResponse {
    prediction?: MLPrediction;
    context?: MLContext;
}

/**
 * Request a single ML prediction. Resolves to null when the response is
 * intentionally unavailable (missing data), and throws ML_SERVICE_UNAVAILABLE
 * when the ML service itself cannot be reached.
 */
async function fetchProjectRisk(
    projectCode: string,
    predictionMonth: string
): Promise<{
    status: "predicted" | "unavailable";
    reasonCode: string | null;
    riskLevel?: RiskLevel;
    probability?: number | null;
    scheduleState?: ScheduleState;
    remainingDays?: number | null;
    deadlineDate?: string | null;
    observedVelocity?: number | null;
    requiredVelocity?: number | null;
} | null> {
    let response: Response;

    try {
        response = await fetch(
            `${ML_SERVICE_URL}/predict`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    projectCode,
                    predictionMonth,
                }),
                signal: AbortSignal.timeout(
                    ML_REQUEST_TIMEOUT_MS
                ),
            }
        );
    } catch {
        throw new Error(
            "ML_SERVICE_UNAVAILABLE"
        );
    }

    if (response.status === 404) {
        return {
            status: "unavailable",
            reasonCode: "RESOURCE_NOT_FOUND",
        };
    }

    if (response.status === 422 || response.status === 400) {
        const reasonCode = await extractMLReasonCode(
            response
        );

        return {
            status: "unavailable",
            reasonCode,
        };
    }

    if (response.status === 503 || response.status === 429) {
        return {
            status: "unavailable",
            reasonCode:
                response.status === 429
                    ? "RATE_LIMIT_EXCEEDED"
                    : "SERVICE_UNAVAILABLE",
        };
    }

    if (!response.ok) {
        return {
            status: "unavailable",
            reasonCode: "PREDICTION_ERROR",
        };
    }

    let data: unknown;

    try {
        data = await response.json();
    } catch {
        return {
            status: "unavailable",
            reasonCode: "INVALID_RESPONSE",
        };
    }

    const body = data as MLResponse;

    if (
        typeof body.prediction?.riskLevel !== "string" ||
        typeof body.prediction?.probability !== "number" ||
        typeof body.context?.scheduleState !== "string"
    ) {
        return {
            status: "unavailable",
            reasonCode: "INVALID_RESPONSE",
        };
    }

    return {
        status: "predicted",
        reasonCode: null,
        riskLevel: body.prediction.riskLevel as RiskLevel,
        probability: body.prediction.probability,
        scheduleState:
            body.context.scheduleState as ScheduleState,
        remainingDays:
            body.context.remainingDays ?? null,
        deadlineDate:
            body.context.deadlineDate ?? null,
        observedVelocity:
            typeof body.context?.observedVelocity === "number"
                ? body.context.observedVelocity
                : null,
        requiredVelocity:
            typeof body.context?.requiredVelocity === "number"
                ? body.context.requiredVelocity
                : null,
    };
}

async function extractMLReasonCode(
    response: Response
): Promise<string> {
    try {
        const payload = (await response.json()) as {
            detail?: unknown;
        };

        const detail = payload.detail;

        if (
            detail &&
            typeof detail === "object" &&
            "code" in detail &&
            typeof (detail as { code?: unknown }).code ===
                "string"
        ) {
            return (
                detail as { code: string }
            ).code;
        }
    } catch {
        // fall through
    }

    return "INSUFFICIENT_DATA";
}

// ============================================================================
// Full index construction
// ============================================================================

async function buildRiskIndex(): Promise<RiskIndexResult> {
    const latestByCode = await loadLatestByCode();

    const codes = Array.from(latestByCode.keys());

    const byCode = new Map<string, ProjectRisk>();

    let predictedCount = 0;

    for (let start = 0; start < codes.length; start += CONCURRENCY) {
        const chunk = codes.slice(
            start,
            start + CONCURRENCY
        );

        const results = await Promise.all(
            chunk.map(async (projectCode) => {
                const observation =
                    latestByCode.get(
                        projectCode
                    );

                const month =
                    observation?.reportMonth ?? null;

                if (!month) {
                    return {
                        projectCode,
                        predictionMonth: null,
                        riskLevel: null,
                        probability: null,
                        scheduleState: null,
                        remainingDays: null,
                        deadlineDate: null,
                        observedVelocity: null,
                        requiredVelocity: null,
                        status: "unavailable" as const,
                        reasonCode:
                            "NO_OBSERVATION_MONTH" as const,
                    };
                }

                const prediction =
                    await fetchProjectRisk(
                        projectCode,
                        month
                    );

                if (!prediction) {
                    return {
                        projectCode,
                        predictionMonth: month,
                        riskLevel: null,
                        probability: null,
                        scheduleState: null,
                        remainingDays: null,
                        deadlineDate: null,
                        observedVelocity: null,
                        requiredVelocity: null,
                        status: "unavailable" as const,
                        reasonCode:
                            "INVALID_RESPONSE" as const,
                    };
                }

                return {
                    projectCode,
                    predictionMonth: month,
                    riskLevel:
                        prediction.status === "predicted"
                            ? prediction.riskLevel ?? null
                            : null,
                    probability:
                        prediction.status === "predicted"
                            ? prediction.probability ?? null
                            : null,
                    scheduleState:
                        prediction.status === "predicted"
                            ? prediction.scheduleState ?? null
                            : null,
                    remainingDays:
                        prediction.status === "predicted"
                            ? prediction.remainingDays ?? null
                            : null,
                    deadlineDate:
                        prediction.status === "predicted"
                            ? prediction.deadlineDate ?? null
                            : null,
                    observedVelocity:
                        prediction.status === "predicted"
                            ? prediction.observedVelocity ?? null
                            : null,
                    requiredVelocity:
                        prediction.status === "predicted"
                            ? prediction.requiredVelocity ?? null
                            : null,
                    status: prediction.status,
                    reasonCode: prediction.reasonCode,
                } as ProjectRisk;
            })
        );

        for (const result of results) {
            byCode.set(
                result.projectCode,
                result
            );

            if (result.status === "predicted") {
                predictedCount += 1;
            }
        }
    }

    const index: RiskIndexResult = {
        byCode,
        predictedCount,
        mlAvailable: !mlUnavailable,
    };

    riskIndexCache = index;

    return index;
}