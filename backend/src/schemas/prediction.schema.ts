/**

* Prediction Response Schema Module
*
* This module defines the Zod schemas for validating ML service prediction
* responses. It provides type-safe validation for project data, prediction
* results, contextual information, and explanatory reasons.
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

* Schema for validating the prediction output.
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

    /** Number of days remaining until the deadline */
    remainingDays: z.number()
        .int("Remaining days must be an integer"),

    /** Recent observed progress velocity (percentage points per month) */
    observedVelocity: z.number()
        .nonnegative("Observed velocity cannot be negative"),

    /** Required progress velocity to meet the deadline */
    requiredVelocity: z.number()
        .nonnegative("Required velocity cannot be negative"),

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
// Complete Response Schema
// ============================================================================

/**

* Schema for validating the complete ML service prediction response.
*
* This is the main schema that validates the entire response structure
* from the ML service endpoint.
  */
export const PredictionResponseSchema = z.object({
    /** Project metadata */
    project: ProjectSchema,

    /** Prediction results */
    prediction: PredictionSchema,

    /** Project context and feature values */
    context: ContextSchema,

    /** Explanatory reasons for the prediction (max 5) */
    reasons: z.array(ReasonSchema)
        .max(5, "Cannot exceed 5 reasons"),
});

// ============================================================================
// Type Definitions
// ============================================================================

/**

* TypeScript type inferred from the PredictionResponseSchema.
  */
export type PredictionResponse = z.infer<
    typeof PredictionResponseSchema

>;

// ============================================================================
// Optional: Schema Extensions and Utilities
// ============================================================================

/**

* Partial response schema for validation without reasons.
  */
export const PredictionResponseWithoutReasonsSchema = z.object({
    project: ProjectSchema,
    prediction: PredictionSchema,
    context: ContextSchema,
});

/**

* Type for response without reasons.
  */
export type PredictionResponseWithoutReasons = z.infer<
    typeof PredictionResponseWithoutReasonsSchema

>;

/**

* Schema for validating just the reasons array.
  */
export const ReasonsSchema = z.array(ReasonSchema).max(5);

/**

* Type for just the reasons array.
  */
export type Reasons = z.infer<typeof ReasonsSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**

* Validates a response and returns a typed result.
*
* @param data - The unknown data to validate
* @returns The validated PredictionResponse
* @throws ZodError if validation fails
  */
export function validatePredictionResponse(
    data: unknown
): PredictionResponse {
    return PredictionResponseSchema.parse(data);
}

/**

* Safely validates a response without throwing.
*
* @param data - The unknown data to validate
* @returns A result object with success flag and either data or error
  */
export function safeValidatePredictionResponse(
    data: unknown
): {
    success: boolean;
    data?: PredictionResponse;
    error?: z.ZodError;
} {
    const result = PredictionResponseSchema.safeParse(data);

    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined,
    };
}
