/**
 * LLM Service Module
 *
 * This module provides functionality to interact with OpenAI
 * for generating project intelligence recommendations. It handles
 * communication with the OpenAI Responses API, retry logic,
 * error classification, and response validation.
 *
 * The service follows a structured flow:
 * 1. Validates the input request
 * 2. Sends the request to OpenAI with retry logic
 * 3. Parses and validates the response
 * 4. Returns the validated recommendation
 */

import OpenAI from "openai";
import {
    LLMRequestSchema,
    LLMResponseSchema,
    type LLMRequest,
    type LLMResponse,
} from "../schemas/llm.schema";
import { LLM_SYSTEM_PROMPT } from "../prompts/llm.system";

// ============================================================================
// Configuration
// ============================================================================

/**
 * OpenAI API key from environment variables.
 * Required for authentication with the OpenAI API.
 */
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
}

/**
 * OpenAI API client instance.
 * Configured with the API key for making requests.
 */
const ai = new OpenAI({
    apiKey,
});

/**
 * OpenAI model to use for generation.
 *
 * Set OPENAI_MODEL in the environment to override the default.
 * Available models: gpt-4, gpt-4-turbo, gpt-3.5-turbo, etc.
 */
const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";

/**
 * Maximum number of retry attempts for retryable failures.
 *
 * MAX_RETRIES = 2 means:
 * - initial request (attempt 0)
 * - retry #1 (attempt 1)
 * - retry #2 (attempt 2)
 *
 * Total possible requests = 3.
 */
const MAX_RETRIES = 2;

/**
 * Initial delay in milliseconds for retry backoff.
 * The delay doubles with each retry attempt.
 */
const INITIAL_RETRY_DELAY_MS = 1000;

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Custom error class for LLM service failures.
 *
 * The status and code fields allow the API layer to distinguish
 * between authentication errors, invalid requests, rate limits,
 * temporary provider failures, and unexpected failures.
 *
 * @example
 * ```typescript
 * try {
 *   await generateRecommendation(request);
 * } catch (error) {
 *   if (error instanceof LLMServiceError) {
 *     switch (error.code) {
 *       case "RATE_LIMIT_EXCEEDED":
 *         // Handle rate limiting
 *         break;
 *       case "OPENAI_AUTHENTICATION_FAILED":
 *         // Handle authentication issues
 *         break;
 *       case "OPENAI_SERVICE_UNAVAILABLE":
 *         // Handle service unavailability
 *         break;
 *     }
 *   }
 * }
 * ```
 */
export class LLMServiceError extends Error {
    /** HTTP status code if available */
    status?: number;

    /** Provider-specific or application error code */
    code?: string;

    constructor(
        message: string,
        status?: number,
        code?: string
    ) {
        super(message);

        this.name = "LLMServiceError";
        this.status = status;
        this.code = code;
    }
}

// ============================================================================
// Private Helper Functions - Error Extraction
// ============================================================================

/**
 * Extracts an HTTP status code from an unknown error.
 *
 * @param error - The error to inspect
 * @returns The status code if found, undefined otherwise
 *
 * @internal
 */
function getErrorStatus(
    error: unknown
): number | undefined {
    if (
        typeof error !== "object" ||
        error === null ||
        !("status" in error)
    ) {
        return undefined;
    }

    const status =
        (error as { status?: unknown }).status;

    return typeof status === "number"
        ? status
        : undefined;
}

/**
 * Extracts an OpenAI error code when available.
 *
 * @param error - The error to inspect
 * @returns The error code if found, undefined otherwise
 *
 * @internal
 */
function getErrorCode(
    error: unknown
): string | undefined {
    if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error)
    ) {
        return undefined;
    }

    const code =
        (error as { code?: unknown }).code;

    return typeof code === "string"
        ? code
        : undefined;
}

// ============================================================================
// Private Helper Functions - Error Classification
// ============================================================================

/**
 * Determines whether an error should be retried.
 *
 * Retry only temporary provider/server failures:
 * - 500 Internal server error
 * - 502 Bad gateway
 * - 503 Service unavailable
 * - 504 Gateway timeout
 *
 * We deliberately do not retry:
 * - 400 Invalid requests
 * - 401 Authentication failures
 * - 403 Permission failures
 * - 404 Invalid endpoint/resource
 * - 429 Rate limit/quota
 *
 * Retrying those errors is unlikely to solve the underlying problem.
 *
 * @param error - The error to check
 * @returns True if the error is retryable, false otherwise
 *
 * @internal
 */
function isRetryableError(
    error: unknown
): boolean {
    const status = getErrorStatus(error);

    return (
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504
    );
}

/**
 * Calculates retry delay using exponential backoff.
 *
 * Attempt 0 → 1000 ms
 * Attempt 1 → 2000 ms
 * Attempt 2 → 4000 ms
 *
 * @param attempt - The current retry attempt number (0-indexed)
 * @returns The delay in milliseconds
 *
 * @internal
 */
function getRetryDelay(
    attempt: number
): number {
    return (
        INITIAL_RETRY_DELAY_MS *
        Math.pow(2, attempt)
    );
}

/**
 * Logs detailed OpenAI error information for debugging.
 *
 * @param error - The error to log
 *
 * @internal
 */
function logOpenAIError(
    error: unknown
): void {
    // Log basic error information
    if (error instanceof Error) {
        console.error(
            "OpenAI request failed:"
        );

        console.error(
            "Message:",
            error.message
        );

        console.error(
            "Name:",
            error.name
        );

        console.error(
            "Stack:",
            error.stack
        );
    } else {
        console.error(
            "OpenAI request failed with non-Error value:"
        );

        console.error(error);
    }

    // Log additional error metadata if available
    if (
        typeof error === "object" &&
        error !== null
    ) {
        const errorObject =
            error as {
                status?: unknown;
                code?: unknown;
                type?: unknown;
                message?: unknown;
            };

        console.error(
            "OpenAI error status:",
            errorObject.status
        );

        console.error(
            "OpenAI error code:",
            errorObject.code
        );

        console.error(
            "OpenAI error type:",
            errorObject.type
        );

        console.error(
            "OpenAI error object:",
            JSON.stringify(
                error,
                Object.getOwnPropertyNames(error),
                2
            )
        );
    }
}

/**
 * Converts an OpenAI error into an application-level error.
 *
 * This keeps provider-specific error handling inside the LLM service
 * rather than forcing the Express route to understand OpenAI's
 * internal error structure.
 *
 * @param error - The OpenAI error to classify
 * @returns A classified LLMServiceError
 *
 * @internal
 */
function classifyOpenAIError(
    error: unknown
): LLMServiceError {
    const status =
        getErrorStatus(error);

    const providerCode =
        getErrorCode(error);

    // ------------------------------------------------------------------------
    // Rate limit / quota (429)
    // ------------------------------------------------------------------------

    if (status === 429) {
        return new LLMServiceError(
            "OpenAI quota or rate limit exceeded",
            429,
            "RATE_LIMIT_EXCEEDED"
        );
    }

    // ------------------------------------------------------------------------
    // Authentication (401)
    // ------------------------------------------------------------------------

    if (status === 401) {
        return new LLMServiceError(
            "OpenAI authentication failed",
            401,
            "OPENAI_AUTHENTICATION_FAILED"
        );
    }

    // ------------------------------------------------------------------------
    // Permission (403)
    // ------------------------------------------------------------------------

    if (status === 403) {
        return new LLMServiceError(
            "OpenAI request was not authorized",
            403,
            "OPENAI_PERMISSION_DENIED"
        );
    }

    // ------------------------------------------------------------------------
    // Invalid request (400)
    // ------------------------------------------------------------------------

    if (status === 400) {
        return new LLMServiceError(
            "OpenAI rejected the request",
            400,
            providerCode ?? "INVALID_OPENAI_REQUEST"
        );
    }

    // ------------------------------------------------------------------------
    // Resource / endpoint not found (404)
    // ------------------------------------------------------------------------

    if (status === 404) {
        return new LLMServiceError(
            "OpenAI resource was not found",
            404,
            "OPENAI_RESOURCE_NOT_FOUND"
        );
    }

    // ------------------------------------------------------------------------
    // Temporary provider failure (5xx)
    // ------------------------------------------------------------------------

    if (
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504
    ) {
        return new LLMServiceError(
            "OpenAI service is temporarily unavailable",
            503,
            "OPENAI_SERVICE_UNAVAILABLE"
        );
    }

    // ------------------------------------------------------------------------
    // Network / unknown failure
    // ------------------------------------------------------------------------

    return new LLMServiceError(
        "Unable to reach OpenAI service",
        503,
        "OPENAI_CONNECTION_FAILED"
    );
}

// ============================================================================
// Private Helper Functions - API Interaction
// ============================================================================

/**
 * Generates a response from OpenAI with retry logic.
 *
 * The model receives:
 * - System instructions through the `instructions` field
 * - Validated project intelligence data through `input`
 *
 * The model is instructed to return JSON matching the
 * LLM response schema.
 *
 * @param input - Validated LLM request
 * @returns Raw OpenAI response
 * @throws {LLMServiceError} If OpenAI is unavailable or quota is exceeded
 *
 * @internal
 */
async function generateOpenAIResponse(
    input: LLMRequest
) {
    for (
        let attempt = 0;
        attempt <= MAX_RETRIES;
        attempt++
    ) {
        try {
            // Attempt to generate content with OpenAI
            return await ai.responses.create({
                model,

                instructions:
                    LLM_SYSTEM_PROMPT,

                input: `Return the result as valid JSON.

${JSON.stringify(input)}`,

                text: {
                    format: {
                        type: "json_object",
                    },
                },
            });
        } catch (error) {
            const isLastAttempt =
                attempt === MAX_RETRIES;

            // Log the error for debugging
            logOpenAIError(error);

            const status =
                getErrorStatus(error);

            // ----------------------------------------------------------------
            // 429: Do not retry (quota/rate limit)
            // ----------------------------------------------------------------

            if (status === 429) {
                throw classifyOpenAIError(
                    error
                );
            }

            // ----------------------------------------------------------------
            // Non-retryable error or last attempt
            // ----------------------------------------------------------------

            if (
                !isRetryableError(error) ||
                isLastAttempt
            ) {
                throw classifyOpenAIError(
                    error
                );
            }

            // ----------------------------------------------------------------
            // Retry temporary provider failure
            // ----------------------------------------------------------------

            const delay =
                getRetryDelay(attempt);

            console.warn(
                `OpenAI request failed with status ${status}. ` +
                `Retrying in ${delay}ms...`
            );

            await new Promise(
                (resolve) =>
                    setTimeout(
                        resolve,
                        delay
                    )
            );
        }
    }

    // Defensive fallback (should never be reached)
    throw new LLMServiceError(
        "OpenAI request failed after retries",
        503,
        "OPENAI_RETRIES_EXHAUSTED"
    );
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generates a recommendation using the LLM service.
 *
 * This function serves as the main entry point for the LLM service:
 * 1. Validates the input request against the Zod schema
 * 2. Sends the validated request to OpenAI with retry logic
 * 3. Extracts the generated text from the response
 * 4. Parses the JSON response
 * 5. Validates the response against the Zod schema
 * 6. Returns the validated recommendation
 *
 * The function ensures type safety throughout the pipeline and provides
 * clear error messages for different failure scenarios.
 *
 * @param input - LLM request containing prediction data, context, reasons, and external evidence
 * @returns Validated LLM response with recommendation and analysis
 *
 * @throws {ZodError} If input validation fails
 * @throws {LLMServiceError} If OpenAI is unavailable, quota is exceeded, or response is invalid
 *
 * @example
 * ```typescript
 * // Basic usage
 * try {
 *   const recommendation = await generateRecommendation({
 *     project: { projectCode: "PROJ-123", ... },
 *     prediction: { probability: 0.682, riskLevel: "high", ... },
 *     context: { ... },
 *     reasons: [ ... ],
 *     externalEvidence: [ ... ]
 *   });
 *
 *   console.log("Summary:", recommendation.summary);
 *   console.log("Actions:", recommendation.recommendedActions);
 * } catch (error) {
 *   if (error instanceof LLMServiceError) {
 *     switch (error.code) {
 *       case "RATE_LIMIT_EXCEEDED":
 *         console.error("Quota exceeded, please try later");
 *         break;
 *       case "OPENAI_AUTHENTICATION_FAILED":
 *         console.error("Authentication failed, check API key");
 *         break;
 *       case "OPENAI_SERVICE_UNAVAILABLE":
 *         console.error("Service unavailable, retrying...");
 *         break;
 *       default:
 *         console.error("LLM service error:", error.message);
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With timeout handling
 * const recommendation = await Promise.race([
 *   generateRecommendation(request),
 *   new Promise((_, reject) =>
 *     setTimeout(() => reject(new Error("Request timeout")), 30000)
 *   )
 * ]);
 * ```
 *
 * @example
 * ```typescript
 * // Error handling for different failure modes
 * try {
 *   const recommendation = await generateRecommendation(request);
 *   return recommendation;
 * } catch (error) {
 *   if (error instanceof LLMServiceError) {
 *     // Handle service errors with specific status codes
 *     if (error.status === 429) {
 *       throw new PaymentRequiredError("LLM service quota exceeded");
 *     }
 *     if (error.status === 401) {
 *       throw new AuthenticationError("OpenAI authentication failed");
 *     }
 *     if (error.status >= 500) {
 *       throw new ServiceUnavailableError("Recommendation service unavailable");
 *     }
 *   }
 *   if (error instanceof ZodError) {
 *     // Handle validation errors
 *     throw new BadRequestError("Invalid request format");
 *   }
 *   // Handle unexpected errors
 *   throw new InternalServerError("Failed to generate recommendation");
 * }
 * ```
 */
export async function generateRecommendation(
    input: LLMRequest
): Promise<LLMResponse> {

    // ------------------------------------------------------------------------
    // Step 1: Validate Input Request
    // ------------------------------------------------------------------------
    // Validate the request before sending it to OpenAI
    // This ensures all required fields are present and correctly formatted
    const validatedInput =
        LLMRequestSchema.parse(input);

    // ------------------------------------------------------------------------
    // Step 2: Generate OpenAI Response
    // ------------------------------------------------------------------------
    // Send the validated request to OpenAI with retry logic
    // This may throw if the service is unavailable or quota is exceeded
    const response =
        await generateOpenAIResponse(
            validatedInput
        );

    // ------------------------------------------------------------------------
    // Step 3: Extract Response Text
    // ------------------------------------------------------------------------
    // Ensure the response contains text
    const responseText =
        response.output_text;

    if (!responseText) {
        throw new LLMServiceError(
            "OpenAI returned an empty response",
            502,
            "EMPTY_OPENAI_RESPONSE"
        );
    }

    // ------------------------------------------------------------------------
    // Step 4: Parse JSON Response
    // ------------------------------------------------------------------------
    // Parse the JSON response from OpenAI
    let parsedResponse: unknown;

    try {
        parsedResponse =
            JSON.parse(responseText);
    } catch {
        throw new LLMServiceError(
            "OpenAI returned invalid JSON",
            502,
            "INVALID_OPENAI_JSON"
        );
    }

    // ------------------------------------------------------------------------
    // Step 5: Validate Response Structure
    // ------------------------------------------------------------------------
    // Validate OpenAI's response before returning it to the rest of the backend
    // This ensures the response matches the expected schema
    try {
        return LLMResponseSchema.parse(
            parsedResponse
        );
    } catch {
        throw new LLMServiceError(
            "OpenAI returned a response that does not match the expected schema",
            502,
            "INVALID_OPENAI_RESPONSE_SCHEMA"
        );
    }
}