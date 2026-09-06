/**

* LLM Schema Definitions Module
*
* This module defines the Zod schemas for validating LLM requests and responses
* used in the project intelligence pipeline. It provides type-safe validation
* for all data flowing between the LLM service and the rest of the application.
*
* The schemas cover:
* * Project information
* * ML prediction results
* * Project context and metrics
* * Explanatory reasons
* * External evidence
* * LLM-generated recommendations
    */

import { z } from "zod";

// ============================================================================
// Project Information Schema
// ============================================================================

/**

* Schema for validating project metadata.
  */
const ProjectSchema = z.object({
    /** Unique identifier for the project */
    projectCode: z.string().min(1, "Project code is required"),

    /** Human-readable name of the project */
    projectName: z.string().min(1, "Project name is required"),

    /** Agency responsible for the project */
    agency: z.string().min(1, "Agency name is required"),

    /** State where the project is located */
    state: z.string().min(1, "State name is required"),
});

// ============================================================================
// Prediction Result Schema
// ============================================================================

/**

* Schema for validating the ML prediction output.
  */
const PredictionSchema = z.object({
    /** Probability of deadline revision (0.0 to 1.0) */
    probability: z.number()
        .min(0, "Probability cannot be less than 0")
        .max(1, "Probability cannot exceed 1"),

    /** Categorized risk level based on probability threshold */
    riskLevel: z.enum(["low", "medium", "high"], {
        error: "Risk level must be low, medium, or high",
    }),

    /** The specific outcome being predicted */
    target: z.literal("deadline_revision_next_month", {
        error: "Target must be 'deadline_revision_next_month'",
    }),
});

// ============================================================================
// Project Context Schema
// ============================================================================

/**

* Schema for validating project context data.
  */
const ContextSchema = z.object({
    /** Current completion percentage (0-100) */
    currentProgress: z.number()
        .min(0, "Progress cannot be less than 0%")
        .max(100, "Progress cannot exceed 100%"),

    /** Remaining work percentage (0-100) */
    remainingProgress: z.number()
        .min(0, "Remaining progress cannot be less than 0%")
        .max(100, "Remaining progress cannot exceed 100%"),

    /** Scheduled completion date (YYYY-MM-DD format) */
    deadlineDate: z.string()
        .date("Deadline date must be a valid date in YYYY-MM-DD format"),

    /**
  
    * Number of days remaining until the deadline.
    * Can be negative for overdue projects.
      */
    remainingDays: z.number(),

    /**
  
    * Recent observed progress velocity.
    * Can be zero or negative depending on the project's observed trajectory.
      */
    observedVelocity: z.number(),

    /**
  
    * Required progress velocity to meet the deadline.
      */
    requiredVelocity: z.number(),

    /** Current schedule status category */
    scheduleState: z.enum([
        "completed",
        "no_target",
        "overdue_incomplete",
        "insufficient_observed_velocity",
        "stalled",
        "regressing",
        "on_track",
        "behind",
    ], {
        error: "Schedule state must be one of: completed, no_target, overdue_incomplete, insufficient_observed_velocity, stalled, regressing, on_track, behind",
    }),
});

// ============================================================================
// Explanation Reason Schema
// ============================================================================

/**

* Schema for validating explanatory reasons.
  */
const ReasonSchema = z.object({
    /** The category of the explanation */
    group: z.enum([
        "time_pressure",
        "progress_execution",
        "financial",
        "data_quality",
    ], {
        error: "Group must be one of: time_pressure, progress_execution, financial, data_quality",
    }),

    /** Direction of the impact on the prediction */
    direction: z.enum(["increases", "decreases"], {
        error: "Direction must be either 'increases' or 'decreases'",
    }),

    /** Human-readable explanation message */
    message: z.string()
        .min(1, "Reason message cannot be empty"),
});

// ============================================================================
// External Evidence Schema
// ============================================================================

/**

* Schema for validating external evidence retrieved from the web.
  */
const ExternalEvidenceSchema = z.object({
    /** Title of the evidence article or source */
    title: z.string().min(1, "Evidence title is required"),

    /** Source domain or organization name */
    source: z.string().min(1, "Evidence source is required"),

    /** URL to the evidence source */
    url: z.string().url("Evidence URL must be a valid URL"),

    /** Publication date in YYYY-MM-DD format */
    date: z.string().date(
        "Evidence date must be a valid date in YYYY-MM-DD format"
    ),

    /** The main claim or finding from the evidence */
    claim: z.string().min(1, "Evidence claim is required"),

    /** Quality assessment of the evidence source */
    quality: z.enum(["high", "medium"], {
        error: "Evidence quality must be 'high' or 'medium'",
    }),
});

// ============================================================================
// LLM Request Schema
// ============================================================================

/**

* Schema for validating the LLM request payload.
  */
export const LLMRequestSchema = z.object({
    /** Project metadata */
    project: ProjectSchema,

    /** ML prediction results */
    prediction: PredictionSchema,

    /** Project context and metrics */
    context: ContextSchema,

    /** Explanatory reasons (max 5) */
    reasons: z.array(ReasonSchema)
        .max(5, "Cannot exceed 5 reasons"),

    /** External evidence from various sources */
    externalEvidence: z.array(ExternalEvidenceSchema),
});

// ============================================================================
// LLM Response Schema
// ============================================================================

/**

* Schema for validating the LLM response.
  */
export const LLMResponseSchema = z.object({
    /** High-level summary of the project situation */
    summary: z.string()
        .min(1, "Summary is required"),

    /** Key reasons for the assessment (1-3 items) */
    keyReasons: z
        .array(z.string().min(1, "Key reason cannot be empty"))
        .min(1, "At least one key reason is required")
        .max(3, "Cannot exceed 3 key reasons"),

    /** Recommended actions (1-4 items) */
    recommendedActions: z
        .array(z.string().min(1, "Recommended action cannot be empty"))
        .min(1, "At least one recommended action is required")
        .max(4, "Cannot exceed 4 recommended actions"),

    /** Items that need verification (max 3) */
    verificationNeeded: z
        .array(z.string().min(1, "Verification item cannot be empty"))
        .max(3, "Cannot exceed 3 verification items"),
});

// ============================================================================
// Type Definitions
// ============================================================================

/**

* TypeScript type for the LLM request.
  */
export type LLMRequest = z.infer<typeof LLMRequestSchema>;

/**

* TypeScript type for the LLM response.
  */
export type LLMResponse = z.infer<typeof LLMResponseSchema>;

// ============================================================================
// Optional: Schema Extensions and Utilities
// ============================================================================

/**

* Partial LLM request schema for validation without evidence.
  */
export const LLMRequestWithoutEvidenceSchema = LLMRequestSchema.omit({
    externalEvidence: true,
});

/**

* Partial LLM response schema for validation without recommendations.
  */
export const LLMResponseWithoutRecommendationsSchema = LLMResponseSchema.omit({
    recommendedActions: true,
});

// ============================================================================
// Validation Utilities
// ============================================================================

/**

* Validates a request and returns a typed result.
*
* @param data - The unknown data to validate
* @returns The validated LLMRequest
* @throws {ZodError} If validation fails
  */
export function validateLLMRequest(
    data: unknown
): LLMRequest {
    return LLMRequestSchema.parse(data);
}

/**

* Safely validates a request without throwing.
  */
export function safeValidateLLMRequest(
    data: unknown
): {
    success: boolean;
    data?: LLMRequest;
    error?: z.ZodError;
} {
    const result = LLMRequestSchema.safeParse(data);

    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined,
    };
}

/**

* Validates a response and returns a typed result.
*
* @param data - The unknown data to validate
* @returns The validated LLMResponse
* @throws {ZodError} If validation fails
  */
export function validateLLMResponse(
    data: unknown
): LLMResponse {
    return LLMResponseSchema.parse(data);
}

/**

* Safely validates a response without throwing.
  */
export function safeValidateLLMResponse(
    data: unknown
): {
    success: boolean;
    data?: LLMResponse;
    error?: z.ZodError;
} {
    const result = LLMResponseSchema.safeParse(data);

    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined,
    };
}
