/**
 * Prediction Intelligence Routes Module
 * 
 * This module defines the Express routes for the project prediction intelligence
 * endpoint. It handles request validation, error handling, and response formatting
 * for the ML service prediction API.
 */

import { Router } from "express";
import { z } from "zod";
import { getProjectIntelligence } from "../services/intelligence.service";

// ============================================================================
// Router Configuration
// ============================================================================

const router = Router();

// ============================================================================
// Request Validation Schema
// ============================================================================

/**
 * Schema for validating prediction request payload.
 * Ensures the prediction month is in the correct format (YYYY-MM).
 */
const PredictionRequestSchema = z.object({
    /** The month for which the prediction is requested (YYYY-MM format) */
    predictionMonth: z.string().regex(
        /^\d{4}-(0[1-9]|1[0-2])$/,
        "predictionMonth must be in YYYY-MM format"
    ),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * POST /:projectCode/intelligence
 * 
 * Endpoint that generates a prediction intelligence report for a given project.
 * 
 * The endpoint performs the following:
 * 1. Validates the project code parameter
 * 2. Validates the request body against the schema
 * 3. Calls the ML service to get the prediction
 * 4. Returns the prediction response or appropriate error
 * 
 * @route POST /:projectCode/intelligence
 * @param projectCode - The unique identifier for the project
 * @param req.body.predictionMonth - The month for prediction (YYYY-MM)
 * @returns Prediction response or error object
 * 
 * @example
 * ```typescript
 * // Request
 * POST /PROJ-123/intelligence
 * {
 *   "predictionMonth": "2024-03"
 * }
 * 
 * // Success Response (200)
 * {
 *   "project": {
 *     "projectCode": "PROJ-123",
 *     "projectName": "Highway Construction",
 *     "agency": "Department of Transportation",
 *     "state": "California"
 *   },
 *   "prediction": {
 *     "probability": 0.682,
 *     "riskLevel": "high",
 *     "target": "deadline_revision_next_month"
 *   },
 *   "context": {
 *     "currentProgress": 98.5,
 *     "remainingProgress": 1.5,
 *     "deadlineDate": "2024-03-15",
 *     "remainingDays": 31,
 *     "observedVelocity": 0.0,
 *     "requiredVelocity": 1.4728,
 *     "scheduleState": "stalled"
 *   },
 *   "reasons": [
 *     {
 *       "group": "time_pressure",
 *       "direction": "increases",
 *       "message": "Only 31 days remain before the current completion deadline."
 *     }
 *   ]
 * }
 * ```
 */
router.post("/:projectCode/intelligence", async (req, res) => {
    // ------------------------------------------------------------------------
    // Step 1: Validate Project Code Parameter
    // ------------------------------------------------------------------------

    const { projectCode } = req.params;

    if (!projectCode || projectCode.trim() === "") {
        return res.status(400).json({
            error: "Project code is required",
            code: "MISSING_PROJECT_CODE",
        });
    }

    // ------------------------------------------------------------------------
    // Step 2: Validate Request Body
    // ------------------------------------------------------------------------

    const validation = PredictionRequestSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            error: "Invalid request",
            code: "INVALID_REQUEST",
            details: validation.error.flatten(),
        });
    }

    // ------------------------------------------------------------------------
    // Step 3: Get Prediction from ML Service
    // ------------------------------------------------------------------------

    try {
        const intelligence = await getProjectIntelligence(
            projectCode,
            validation.data.predictionMonth
        );

        return res.status(200).json(intelligence);
    } catch (error) {
        // Log the error for monitoring and debugging
        console.error(`Prediction request failed for project ${projectCode}:`, error);

        // --------------------------------------------------------------------
        // Step 4: Handle Specific Error Cases
        // --------------------------------------------------------------------

        // 4.1: Project or observation not found (404)
        if (
            error instanceof Error &&
            error.message === "Project or observation not found"
        ) {
            return res.status(404).json({
                error: error.message,
                code: "RESOURCE_NOT_FOUND",
            });
        }

        // 4.2: Invalid prediction request (400)
        if (
            error instanceof Error &&
            error.message === "Invalid prediction request"
        ) {
            return res.status(400).json({
                error: error.message,
                code: "INVALID_PREDICTION_REQUEST",
            });
        }

        if (
            error instanceof Error &&
            error.name === "MLServiceError" &&
            "status" in error &&
            "code" in error &&
            (error as unknown as { status?: unknown }).status === 422 &&
            (error as unknown as { code?: unknown }).code ===
                "MISSING_COMPLETION_DEADLINE"
        ) {
            return res.status(422).json({
                error: "Prediction unavailable",
                code: "MISSING_COMPLETION_DEADLINE",
                message: error.message,
            });
        }

        // 4.3: ML service unavailable (503)
        if (
            error instanceof Error &&
            error.message === "ML service is unavailable"
        ) {
            return res.status(503).json({
                error: error.message,
                code: "SERVICE_UNAVAILABLE",
            });
        }

        // 4.4: ML service response validation failed (500)
        if (
            error instanceof Error &&
            error.message === "ML service returned an invalid response"
        ) {
            return res.status(500).json({
                error: "Failed to process ML service response",
                code: "INVALID_RESPONSE",
            });
        }

        // 4.5: Rate limiting (429)
        if (
            error instanceof Error &&
            error.message === "ML service rate limit exceeded"
        ) {
            return res.status(429).json({
                error: "Too many requests, please try again later",
                code: "RATE_LIMIT_EXCEEDED",
            });
        }

        // 4.6: Generic internal server error (500)
        return res.status(500).json({
            error: "Failed to generate project intelligence",
            code: "INTERNAL_SERVER_ERROR",
            // In development, you might want to include the error message
            ...(process.env.NODE_ENV === "development" && {
                details: error instanceof Error ? error.message : "Unknown error",
            }),
        });
    }
});

// ============================================================================
// Export Router
// ============================================================================

export default router;

// ============================================================================
// Optional: Additional Routes
// ============================================================================

/**
 * GET /:projectCode/intelligence/health
 * 
 * Health check endpoint for the prediction service.
 * Useful for monitoring and status checks.
 */
router.get("/:projectCode/intelligence/health", async (req, res) => {
    try {
        const { projectCode } = req.params;

        // Basic validation
        if (!projectCode) {
            return res.status(400).json({
                status: "error",
                message: "Project code is required",
            });
        }

        // You could add additional health checks here
        // For example, checking if the ML service is available

        return res.status(200).json({
            status: "healthy",
            projectCode,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return res.status(500).json({
            status: "unhealthy",
            error: "Health check failed",
        });
    }
});

/**
 * GET /intelligence/schema
 * 
 * Returns the request schema for documentation purposes.
 * Useful for API documentation and client development.
 */
router.get("/intelligence/schema", async (req, res) => {
    return res.status(200).json({
        schema: {
            predictionMonth: {
                type: "string",
                format: "YYYY-MM",
                pattern: "^\\d{4}-(0[1-9]|1[0-2])$",
                description: "The month for which the prediction is requested",
                example: "2024-03",
                required: true,
            },
        },
        response: {
            project: {
                projectCode: "string",
                projectName: "string",
                agency: "string",
                state: "string",
            },
            prediction: {
                probability: "number (0-1)",
                riskLevel: "enum ['low', 'medium', 'high']",
                target: "string",
            },
            context: {
                currentProgress: "number (0-100)",
                remainingProgress: "number (0-100)",
                deadlineDate: "string (YYYY-MM-DD)",
                remainingDays: "number",
                observedVelocity: "number",
                requiredVelocity: "number",
                scheduleState: "enum [completed, no_target, overdue_incomplete, insufficient_observed_velocity, stalled, regressing, on_track, behind]",
            },
            reasons: "array of reason objects (max 5)",
        },
    });
});
