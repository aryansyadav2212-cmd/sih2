import { Router } from "express";
import {
    listProjects,
    getProjectByCode,
    getProjectFacets,
    getPortfolioStats,
    getAttentionProjects,
} from "../services/projectCatalog.service";

const router = Router();

router.use((req, res, next) => {
    console.log("PROJECT ROUTER HIT:", req.method, req.originalUrl);
    next();
});

/**
 * GET /api/v1/projects
 *
 * Lists projects from the PAIMANA historical catalog, with optional
 * free-text search, structured filters, risk sorting, and pagination.
 *
 * Supported filters:
 *   - search (name, code, ministry, sector, agency, state)
 *   - ministry, sector, state, agency (raw observation fields)
 *   - scheduleState, riskLevel (from the ML prediction; only predicted
 *     projects match these)
 *   - predictionStatus (predicted | unavailable)
 *   - progressFrom/progressTo (physical progress % range)
 *   - financialFrom/financialTo (expenditure/original-cost % range)
 *   - projectStage: closure_watch | normal_execution | unknown
 *   - attentionCategory: intervention_required | monitor | closure_watch
 *   - sort: risk | name | progress | financial | cost | deadline
 */
router.get("/", async (req, res) => {
    try {
        const { page, limit, search } = req.query;

        const predictionStatus = stringParam(
            req.query.predictionStatus
        );

        const projectStage = stringParam(req.query.projectStage);

        const attentionCategory = stringParam(
            req.query.attentionCategory
        );

        const result = await listProjects({
            page: page ? parseInt(page as string, 10) : 1,
            limit: limit ? parseInt(limit as string, 10) : 50,
            search: typeof search === "string" ? search : undefined,
            ministry: stringParam(req.query.ministry),
            sector: stringParam(req.query.sector),
            state: stringParam(req.query.state),
            agency: stringParam(req.query.agency),
            scheduleState: stringParam(req.query.scheduleState),
            riskLevel: stringParam(req.query.riskLevel),
            predictionStatus:
                predictionStatus === "predicted" ||
                predictionStatus === "unavailable"
                    ? predictionStatus
                    : undefined,
            progressFrom: numberParam(req.query.progressFrom),
            progressTo: numberParam(req.query.progressTo),
            financialFrom: numberParam(req.query.financialFrom),
            financialTo: numberParam(req.query.financialTo),
            projectStage:
                projectStage === "closure_watch" ||
                projectStage === "normal_execution" ||
                projectStage === "unknown"
                    ? projectStage
                    : undefined,
            attentionCategory:
                attentionCategory ===
                    "intervention_required" ||
                attentionCategory === "monitor" ||
                attentionCategory === "closure_watch"
                    ? attentionCategory
                    : undefined,
            sort: stringParam(req.query.sort),
        });

        return res.json(result);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to fetch projects",
        });
    }
});

/**
 * GET /api/v1/projects/facets
 *
 * Returns distinct filter values backed by real data (ministry, sector,
 * state, agency) plus current ML prediction coverage and the schedule-state /
 * risk-level distributions used by the Explorer filter dropdowns.
 *
 * Registered before the /:projectCode route so it is not shadowed.
 */
router.get("/facets", async (_req, res) => {
    try {
        const facets = await getProjectFacets();

        return res.json(facets);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to fetch project filters",
        });
    }
});

/**
 * GET /api/v1/projects/stats
 *
 * Returns portfolio-level aggregates (total projects, prediction coverage,
 * risk distribution, latest report months) for the national overview.
 *
 * Registered before the /:projectCode route so it is not shadowed.
 */
router.get("/stats", async (_req, res) => {
    try {
        const stats = await getPortfolioStats();

        return res.json(stats);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to fetch portfolio statistics",
        });
    }
});

function stringParam(
    value: unknown
): string | undefined {
    return typeof value === "string"
        ? value.trim() || undefined
        : undefined;
}

function numberParam(
    value: unknown
): number | undefined {
    if (typeof value !== "string") return undefined;

    const parsed = parseFloat(value);

    return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * GET /api/v1/projects/attention
 *
 * Returns the portfolio projects that deserve a human review, split into
 * three product categories:
 *   - intervention_required: overdue/stalled/regressing, large velocity gap,
 *     or significant cost increase
 *   - monitor: medium/high model outlook, behind schedule, or approaching
 *     the deadline
 *   - closure_watch: >=97% physical progress and otherwise healthy
 *
 * Category membership is independent of the model's deadline-revision
 * probability (the model is unchanged).
 *
 * Registered before the /:projectCode route so it is not shadowed.
 */
router.get("/attention", async (_req, res) => {
    try {
        const result = await getAttentionProjects();

        return res.json(result);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to fetch projects requiring attention",
        });
    }
});

/**
 * GET /api/v1/projects/:projectCode
 *
 * Returns a single project by its PAIMANA projectCode, including its
 * observed monthly history and evidence counts (used by the detail page's
 * trajectory / what-changed / confidence sections).
 */
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const detail = await getProjectByCode(id);

        if (!detail) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        // Returned wrapped for compatibility with the prior
        // Prisma-backed response shape.
        return res.json({
            project: detail.project,
            history: detail.history,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to fetch project",
        });
    }
});

export default router
