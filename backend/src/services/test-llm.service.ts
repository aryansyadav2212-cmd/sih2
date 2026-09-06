import { generateRecommendation } from "./llm.service";

const input = {
    project: {
        projectCode: "P00260",
        projectName: "Test Project",
        agency: "Test Agency",
        state: "Test State",
    },

    prediction: {
        probability: 0.682,
        riskLevel: "high" as const,
        target: "deadline_revision_next_month" as const,
    },

    context: {
        currentProgress: 98.5,
        remainingProgress: 1.5,
        deadlineDate: "2026-07-31",
        remainingDays: 31,
        observedVelocity: 0,
        requiredVelocity: 1.4728,
        scheduleState: "stalled" as const,
    },

    reasons: [
        {
            group: "time_pressure" as const,
            direction: "increases" as const,
            message: "Only 31 days remain before the current completion deadline.",
        },
        {
            group: "progress_execution" as const,
            direction: "increases" as const,
            message: "Recent reported progress is currently stalled.",
        },
    ],

    externalEvidence: [],
};

try {
    const result = await generateRecommendation(input);

    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    console.error("LLM test failed:", error);
}