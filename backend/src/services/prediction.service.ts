/**
 * ML Service Client Module
 * 
 * This module provides functionality to interact with the ML prediction service
 * for project deadline revision predictions. It handles the HTTP communication,
 * request validation, and response parsing with proper error handling.
 */

import {
    PredictionResponseSchema,
    type PredictionResponse,
} from "../schemas/prediction.schema";

// ============================================================================
// Configuration
// ============================================================================

/**
 * The base URL for the ML service.
 * Defaults to http://127.0.0.1:8000 if not set in environment variables.
 */
const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? "http://127.0.0.1:8000";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Request payload for the ML prediction endpoint.
 */
interface PredictionRequest {
    /** The unique identifier for the project */
    projectCode: string;
    /** The month for which the prediction is requested (format: YYYY-MM) */
    predictionMonth: string;
}

class MLServiceError extends Error {
    status: number;
    code?: string;

    constructor(
        message: string,
        status: number,
        code?: string
    ) {
        super(message);
        this.name = "MLServiceError";
        this.status = status;
        this.code = code;
    }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Fetches a prediction from the ML service for a given project and month.
 * 
 * This function communicates with the ML service to get a prediction about
 * whether a project will require a deadline revision in the specified month.
 * It handles all error cases and validates the response structure.
 * 
 * @param projectCode - The unique identifier for the project
 * @param predictionMonth - The month for prediction in YYYY-MM format
 * @returns A promise that resolves to the validated prediction response
 * 
 * @throws {Error} If the ML service is unavailable (network error)
 * @throws {Error} If the project or observation is not found (404)
 * @throws {Error} If the request is invalid (400)
 * @throws {Error} If the ML service returns an error (other status codes)
 * @throws {Error} If the response is not valid JSON
 * @throws {Error} If the response doesn't match the expected schema
 * 
 * @example
 * ```typescript
 * try {
 *   const prediction = await getProjectPrediction('PROJ-123', '2024-03');
 *   console.log(prediction.prediction.probability); // 0.682
 * } catch (error) {
 *   console.error('Failed to get prediction:', error.message);
 * }
 * ```
 */
export async function getProjectPrediction(
    projectCode: string,
    predictionMonth: string
): Promise<PredictionResponse> {
    // Validate input parameters
    if (!projectCode || projectCode.trim() === '') {
        throw new Error("Project code is required");
    }

    if (!predictionMonth || !/^\d{4}-\d{2}$/.test(predictionMonth)) {
        throw new Error("Prediction month must be in YYYY-MM format");
    }

    const requestBody: PredictionRequest = {
        projectCode,
        predictionMonth,
    };

    let response: Response;

    // Send request to ML service
    try {
        response = await fetch(`${ML_SERVICE_URL}/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });
    } catch (error) {
        // Network errors or connection issues
        throw new Error("ML service is unavailable");
    }

    // Handle HTTP status codes
    if (!response.ok) {
        let payload: unknown = null;

        try {
            payload = await response.json();
        } catch {
            payload = null;
        }

        const detail =
            payload &&
                typeof payload === "object" &&
                "detail" in payload
                ? (payload as { detail?: unknown }).detail
                : undefined;

        if (response.status === 422) {
            // Unprocessable entity: the ML service intentionally cannot
            // construct a prediction for this project/month. Preserve the
            // structured code when present so the API can tell "missing
            // data" apart from "invalid request".
            let code = "INSUFFICIENT_DATA";
            let message = "Prediction unavailable";

            if (
                detail &&
                typeof detail === "object" &&
                "code" in detail &&
                typeof (detail as { code?: unknown }).code ===
                    "string"
            ) {
                code = (detail as { code: string }).code;
                message =
                    "message" in detail &&
                    typeof (
                        detail as { message?: unknown }
                    ).message === "string"
                        ? (detail as { message: string }).message
                        : message;
            } else if (typeof detail === "string") {
                message = detail;
            }

            throw new MLServiceError(message, 422, code);
        }

        switch (response.status) {
            case 404:
                throw new Error("Project or observation not found");
            case 400:
                throw new Error("Invalid prediction request");
            case 429:
                throw new Error("ML service rate limit exceeded");
            case 503:
                throw new Error("ML service is temporarily unavailable");
            default:
                throw new Error(`ML service returned an error (${response.status})`);
        }
    }

    // Parse JSON response
    let data: unknown;

    try {
        data = await response.json();
    } catch (error) {
        throw new Error("ML service returned invalid JSON");
    }

    // Validate response structure
    const result = PredictionResponseSchema.safeParse(data);

    if (!result.success) {
        // Log the validation errors for debugging
        console.error("Response validation failed:", result.error.issues);
        throw new Error("ML service returned an invalid response");
    }

    return result.data;
}

// ============================================================================
// Utility Functions (Optional)
// ============================================================================

/**
 * Checks if the ML service is healthy and accessible.
 * 
 * @returns A promise that resolves to true if the service is healthy
 * 
 * @example
 * ```typescript
 * const isHealthy = await checkMLServiceHealth();
 * if (!isHealthy) {
 *   // Handle service unavailability
 * }
 * ```
 */
export async function checkMLServiceHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${ML_SERVICE_URL}/health`, {
            method: "GET",
            signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Gets the current status of the ML service.
 * 
 * @returns A promise that resolves to an object containing service status information
 */
export async function getMLServiceStatus(): Promise<{
    healthy: boolean;
    version?: string;
    timestamp?: string;
}> {
    try {
        const response = await fetch(`${ML_SERVICE_URL}/health`, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            return { healthy: false };
        }

        const data = await response.json();

        return {
            healthy: true,
            version: data.version,
            timestamp: data.timestamp,
        };
    } catch (error) {
        return { healthy: false };
    }
}
