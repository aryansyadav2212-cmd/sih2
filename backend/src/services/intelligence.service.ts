/**
 * Project Intelligence Service Module
 *
 * Orchestrates project intelligence generation by combining:
 * 1. ML prediction from the ML service
 * 2. External evidence retrieval from various data sources
 * 3. LLM-generated recommendations based on prediction and evidence
 *
 * This module serves as the main orchestrator for the intelligence feature,
 * bringing together multiple services to provide comprehensive project insights.
 *
 * The service follows a structured flow:
 * 1. Fetches the ML prediction for the project
 * 2. Retrieves relevant external evidence for the project
 * 3. Builds and validates the LLM request
 * 4. Generates a recommendation using the LLM service
 * 5. Combines all results into a unified response
 */

import {
    getProjectPrediction,
} from "./prediction.service";

import {
    findProjectEvidence,
} from "./evidence.service";

import {
    generateRecommendation,
} from "./llm.service";

import {
    LLMRequestSchema,
    type LLMRequest,
    type LLMResponse,
} from "../schemas/llm.schema";

import type {
    PredictionResponse,
} from "../schemas/prediction.schema";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Complete project intelligence response.
 *
 * Combines ML predictions, external evidence, and LLM-generated
 * recommendations to provide comprehensive project insights.
 *
 * @property project - Project metadata
 * @property prediction - ML prediction results
 * @property context - Project execution context used for prediction
 * @property reasons - Model-generated explanation of prediction
 * @property externalEvidence - External evidence retrieved for the project
 * @property recommendation - LLM-generated recommendation with analysis and actions
 */
export interface ProjectIntelligence {
    /** Project metadata */
    project: PredictionResponse["project"];

    /** ML prediction result */
    prediction: PredictionResponse["prediction"];

    /** Project context used for prediction */
    context: PredictionResponse["context"];

    /** Model explanation reasons */
    reasons: PredictionResponse["reasons"];

    /** External evidence retrieved for the project */
    externalEvidence: LLMRequest["externalEvidence"];

    /** LLM-generated recommendation */
    recommendation: LLMResponse;
}

// ============================================================================
// Private Helper Functions
// ============================================================================

/**
 * Builds and validates the LLM request from prediction and external evidence.
 *
 * This function transforms the prediction data and external evidence into
 * the format expected by the LLM service.
 *
 * @param prediction - The validated prediction response from the ML service
 * @param externalEvidence - Retrieved external evidence for the project
 * @returns A validated LLM request ready for processing
 * @throws {ZodError} If the request validation fails
 *
 * @internal
 */
function buildLLMRequest(
    prediction: PredictionResponse,
    externalEvidence: LLMRequest["externalEvidence"]
): LLMRequest {
    const request: LLMRequest = {
        // Project metadata
        project: prediction.project,

        // Prediction results
        prediction: prediction.prediction,

        // Contextual project data
        context: prediction.context,

        // Explanatory reasons
        reasons: prediction.reasons,

        // External evidence from various sources
        externalEvidence,
    };

    // Validate the request against the schema
    return LLMRequestSchema.parse(request);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Retrieves comprehensive project intelligence for a given project and month.
 *
 * This function orchestrates the entire intelligence generation process:
 * 1. Fetches the ML prediction for the project
 * 2. Retrieves relevant external evidence for the project
 * 3. Builds and validates the LLM request
 * 4. Generates a recommendation using the LLM service
 * 5. Combines all results into a unified response
 *
 * @param projectCode - The unique identifier for the project
 * @param predictionMonth - The month for prediction in YYYY-MM format
 * @returns A promise that resolves to the complete project intelligence
 */
export async function getProjectIntelligence(
    projectCode: string,
    predictionMonth: string
): Promise<ProjectIntelligence> {

    // ------------------------------------------------------------------------
    // Step 1: Get ML Prediction
    // ------------------------------------------------------------------------

    const prediction = await getProjectPrediction(
        projectCode,
        predictionMonth
    );

    // ------------------------------------------------------------------------
    // Step 2: Find External Evidence
    // ------------------------------------------------------------------------

    const externalEvidence = await findProjectEvidence(
        prediction.project
    );

    // ------------------------------------------------------------------------
    // Step 3: Build LLM Request
    // ------------------------------------------------------------------------

    const llmRequest = buildLLMRequest(
        prediction,
        externalEvidence
    );

    // ------------------------------------------------------------------------
    // Step 4: Generate LLM Recommendation
    // ------------------------------------------------------------------------

    const recommendation = await generateRecommendation(
        llmRequest
    );

    // ------------------------------------------------------------------------
    // Step 5: Return Complete Intelligence
    // ------------------------------------------------------------------------
    //
    // Flatten the ML prediction response so the public intelligence API
    // exposes project, prediction, context, and reasons at the top level.

    return {
        project: prediction.project,
        prediction: prediction.prediction,
        context: prediction.context,
        reasons: prediction.reasons,
        externalEvidence,
        recommendation,
    };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if the intelligence service is healthy.
 *
 * This function verifies that all dependent services are available
 * and responsive.
 *
 * @returns A promise that resolves to true if all services are healthy
 *
 * @remarks
 * This is currently a placeholder. Actual dependent-service health checks
 * should be implemented when a dedicated health endpoint is required.
 */
export async function checkIntelligenceServiceHealth(): Promise<boolean> {
    try {
        // In a real implementation, this would check all dependent services
        // ML service, Evidence service, and LLM service
        const healthChecks = await Promise.allSettled([]);

        return healthChecks.every(
            result => result.status === "fulfilled"
        );
    } catch {
        return false;
    }
}

/**
 * Generates a summary of the project intelligence for quick viewing.
 *
 * This function extracts the most important information from the
 * intelligence response for display in dashboards or notifications.
 *
 * @param intelligence - The full project intelligence response
 * @returns A summarized version with key metrics
 */
export function summarizeIntelligence(
    intelligence: ProjectIntelligence
): {
    projectCode: string;
    riskLevel: string;
    probability: number;
    topReason: string;
    recommendationSummary: string;
} {
    return {
        projectCode:
            intelligence.project.projectCode,

        riskLevel:
            intelligence.prediction.riskLevel,

        probability:
            intelligence.prediction.probability,

        topReason:
            intelligence.reasons[0]?.message ||
            "No reasons available",

        recommendationSummary:
            intelligence.recommendation.summary,
    };
}

/**
 * Generates a formatted text report from the project intelligence.
 *
 * The report includes:
 * - Project information
 * - ML prediction summary
 * - Prediction context
 * - Model reasons
 * - External evidence and source links
 * - LLM recommendation
 * - Key reasons from analysis
 * - Recommended actions
 * - Verification requirements
 *
 * @param intelligence - The full project intelligence response
 * @returns A formatted report string suitable for display or printing
 */
export function generateIntelligenceReport(
    intelligence: ProjectIntelligence
): string {

    const {
        project,
        prediction,
        context,
        reasons,
    } = intelligence;

    const {
        summary,
        keyReasons,
        recommendedActions,
        verificationNeeded,
    } = intelligence.recommendation;

    const lines = [
        "=".repeat(80),
        "PROJECT INTELLIGENCE REPORT",
        "=".repeat(80),
        "",

        `Project: ${project.projectName} (${project.projectCode})`,
        `Agency: ${project.agency}`,
        `State: ${project.state}`,
        "",

        "-".repeat(80),
        "PREDICTION SUMMARY",
        "-".repeat(80),

        `Risk Level: ${prediction.riskLevel.toUpperCase()}`,
        `Probability: ${(prediction.probability * 100).toFixed(1)}%`,
        `Target: ${prediction.target}`,
        "",

        "Context:",
        `  Progress: ${context.currentProgress}% complete`,
        `  Remaining Progress: ${context.remainingProgress}%`,
        `  Deadline: ${context.deadlineDate}`,
        `  Remaining Days: ${context.remainingDays}`,
        `  Schedule State: ${context.scheduleState}`,
        `  Observed Velocity: ${context.observedVelocity.toFixed(2)}`,
        `  Required Velocity: ${context.requiredVelocity.toFixed(2)}`,
        "",

        "-".repeat(80),
        "KEY REASONS",
        "-".repeat(80),

        ...reasons.map(
            (reason, index) =>
                `  ${index + 1}. [${reason.group}] ${reason.message}`
        ),

        "",

        "-".repeat(80),
        "EXTERNAL EVIDENCE",
        "-".repeat(80),

        ...(intelligence.externalEvidence.length > 0
            ? intelligence.externalEvidence.flatMap(
                (evidence, index) => [
                    `  ${index + 1}. ${evidence.title}`,
                    `     Source: ${evidence.source}`,
                    `     URL: ${evidence.url}`,
                    `     Date: ${evidence.date}`,
                    `     Claim: ${evidence.claim}`,
                    `     Quality: ${evidence.quality}`,
                    "",
                ]
            )
            : [
                "  No relevant external evidence found.",
                "",
            ]),

        "-".repeat(80),
        "RECOMMENDATION",
        "-".repeat(80),

        summary,
        "",

        "KEY REASONS FROM ANALYSIS:",
        ...keyReasons.map(
            (reason, index) =>
                `  ${index + 1}. ${reason}`
        ),
        "",

        "RECOMMENDED ACTIONS:",
        ...recommendedActions.map(
            (action, index) =>
                `  ${index + 1}. ${action}`
        ),
        "",

        "VERIFICATION NEEDED:",
        ...(verificationNeeded.length > 0
            ? verificationNeeded.map(
                (item, index) =>
                    `  ${index + 1}. ${item}`
            )
            : [
                "  None specified.",
            ]),

        "",
        "=".repeat(80),
    ];

    return lines.join("\n");
}