/**
 * Presentation labels — the human-language "translation layer" for the
 * decision-support views.
 *
 * These maps convert backend enum values and model vocabulary into wording
 * aimed at an infrastructure officer. They are pure presentation: no backend
 * field is invented, and the underlying values still flow through unchanged.
 */

import type {
  AttentionCategory,
  ProjectStage,
  ProjectSummary,
  ReasonGroup,
  RiskLevel,
  ScheduleState,
  StallStatus,
} from '../api/types';

/**
 * Schedule status labels — "Schedule State → Schedule Status".
 */
export const scheduleStateLabel: Record<ScheduleState, string> = {
  completed: 'Completed',
  no_target: 'No Target',
  overdue_incomplete: 'Overdue',
  insufficient_observed_velocity: 'Insufficient Data',
  stalled: 'Stalled',
  regressing: 'Regressing',
  on_track: 'On Track',
  behind: 'Behind Schedule',
};

export function scheduleStateLabelFor(
  state: ScheduleState | null | undefined
): string | null {
  if (!state) return null;
  return scheduleStateLabel[state] ?? null;
}

/**
 * Model likelihood bands ("risk level"), always framed as a deadline-change
 * outlook rather than a failure label.
 */
export const riskLevelLabel: Record<RiskLevel, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function riskLevelLabelFor(
  level: RiskLevel | null | undefined
): string | null {
  if (!level) return null;
  return riskLevelLabel[level] ?? null;
}

/**
 * Full band label for a deadline-revision outlook — "High Revision Outlook".
 * Used for badges and summary strips in place of the word "risk".
 */
export function outlookBandLabel(
  level: RiskLevel | null | undefined
): string | null {
  if (!level) return null;
  switch (level) {
    case 'high':
      return 'High Revision Outlook';
    case 'medium':
      return 'Medium Revision Outlook';
    case 'low':
      return 'Low Revision Outlook';
    default:
      return null;
  }
}

/**
 * Short flag variant of the band, e.g. "HIGH" → "HIGH REVISION OUTLOOK".
 * For compact contexts like table cells and badges.
 */
export function outlookBandFlag(
  level: RiskLevel | null | undefined
): string | null {
  if (!level) return null;
  switch (level) {
    case 'high':
      return 'HIGH REVISION OUTLOOK';
    case 'medium':
      return 'MEDIUM REVISION OUTLOOK';
    case 'low':
      return 'LOW REVISION OUTLOOK';
    default:
      return null;
  }
}

/**
 * Product lifecycle stage labels.
 */
export const projectStageLabel: Record<
  Exclude<ProjectStage, null>,
  string
> = {
  closure_watch: 'Closure Watch',
  normal_execution: 'Normal Execution',
};

export function projectStageLabelFor(
  stage: ProjectStage | null | undefined
): string | null {
  if (!stage) return null;
  return projectStageLabel[stage] ?? null;
}

/**
 * Attention category labels, kept short for badges and list rows.
 */
export const attentionCategoryLabel: Record<
  Exclude<AttentionCategory, null>,
  string
> = {
  intervention_required: 'INTERVENTION REQUIRED',
  monitor: 'MONITOR',
  closure_watch: 'CLOSURE WATCH',
};

/**
 * Concise category summaries for the home page (Section 13 wording).
 */
export const attentionCategorySummary: Record<
  Exclude<AttentionCategory, null>,
  string
> = {
  intervention_required:
    'Projects showing signals that may require active review.',
  closure_watch:
    'Projects that are 97%+ complete and approaching project closure.',
  monitor:
    'Projects showing signals worth tracking but not currently requiring active intervention.',
};

/**
 * Model reason groups → plain labels for the "What's driving the outlook?"
 * cards. Keep human-first: officer faces outcome language, not ML feature
 * names. The underlying Reason.group values are not changed.
 */
export const reasonGroupLabel: Record<ReasonGroup, string> = {
  time_pressure: 'TIME REMAINING',
  progress_execution: 'PROJECT COMPLETION',
  financial: 'FINANCIAL PROGRESS',
  data_quality: 'DATA QUALITY',
};

/**
 * Round a progress fraction for display: whole numbers stay integer, close
 * values keep one decimal (so 99.9% never reads as a rounded 100%).
 */
export function formatProgressPercent(value: number): string {
  const tenth = Math.round(value * 10) / 10;
  return tenth % 1 === 0 ? `${tenth.toFixed(0)}%` : `${tenth.toFixed(1)}%`;
}

/**
 * One plain sentence for the LAYER-1 deadline outlook. Always framed as a
 * forecast about the reported completion deadline, never as a failure verdict.
 */
export function deadlineOutlookSentence(
  level: RiskLevel | null | undefined,
  probability: number | null | undefined
): string {
  if (level == null || probability == null) {
    return 'The model estimate is currently unavailable for this project.';
  }
  const label = riskLevelLabelFor(level) ?? 'moderate';
  const pct = (probability * 100).toFixed(0);
  return `The model estimates a ${label.toLowerCase()} likelihood (${pct}%) that the reported completion deadline will be revised next month.`;
}

/**
 * One concise, officer-facing operational reason for a project within a given
 * attention category. Derived from the reported schedule state, execution
 * pace, and deadline outlook — raw ML terminology is intentionally avoided.
 */
export function attentionReason(
  project: ProjectSummary,
  category: Exclude<AttentionCategory, null>
): string {
  const schedule = scheduleStateLabelFor(project.scheduleState);
  const progress =
    project.physicalProgress !== null
      ? `${project.physicalProgress.toFixed(0)}%`
      : null;

  if (category === 'intervention_required') {
    if (project.scheduleState === 'overdue_incomplete') {
      return 'The reported completion deadline has passed while work remains incomplete.';
    }
    if (project.scheduleState === 'stalled') {
      return progress
        ? `Reported progress is ${progress} and no recent physical progress has been reported.`
        : 'No recent physical progress has been reported.';
    }
    if (project.scheduleState === 'regressing') {
      return 'Reported physical progress has declined.';
    }
    if (
      project.observedVelocity !== null &&
      project.requiredVelocity !== null &&
      project.requiredVelocity - project.observedVelocity >= 2
    ) {
      return 'Execution is falling behind the pace needed to meet the current deadline.';
    }
    if (
      project.revisedCost !== null &&
      project.originalCost !== null &&
      project.originalCost > 0 &&
      ((project.revisedCost - project.originalCost) / project.originalCost) * 100 >= 5
    ) {
      return 'Reported project cost has increased significantly.';
    }
    return 'Signals indicate unresolved execution or spending matters that may require review.';
  }

  if (category === 'closure_watch') {
    return progress
      ? `${progress} complete and approaching project closure.`
      : 'Approaching project closure.';
  }

  // monitor
  const outlook = riskLevelLabelFor(project.riskLevel);
  if (outlook && project.probability !== null) {
    return `Deadline revision outlook is ${outlook.toLowerCase()} (${(project.probability * 100).toFixed(0)}%), but no immediate intervention signal is detected.`;
  }
  if (project.scheduleState === 'behind') {
    return 'Running behind the pace needed to meet the deadline.';
  }
  if (schedule) {
    return `Currently ${schedule.toLowerCase()}; no intervention signal yet.`;
  }
  return 'Signals worth tracking, but no immediate intervention is required.';
}

/**
 * Short priority label derived from the product attention category.
 * Used by the All Projects table's priority column and the priority buckets.
 * Purely presentational — the category itself is determined server-side.
 */
export function priorityLabelFor(category: AttentionCategory): string {
  switch (category) {
    case 'intervention_required':
      return 'HIGH PRIORITY';
    case 'monitor':
      return 'MONITOR';
    case 'closure_watch':
      return 'CLOSURE';
    default:
      return 'ROUTINE';
  }
}

/**
 * Frontend-derived assessment confidence banding based on real observation
 * counts returned by the backend. Purely presentational — the thresholds
 * are editorial choices, not backend logic.
 */
export function assessmentConfidence(
  points: number | null,
  consecutive: number | null,
): { level: 'NONE' | 'LIMITED' | 'MODERATE' | 'SOLID'; detail: string } {
  if (points === null || points === 0) {
    return {
      level: 'NONE',
      detail: 'Insufficient observation record for this project.',
    };
  }

  if (points === 1 || (consecutive ?? 0) === 0) {
    return {
      level: 'LIMITED',
      detail: 'Sparse or discontinuous evidence — interpretation should be cautious.',
    };
  }

  if (points >= 3 && (consecutive ?? 0) >= 2) {
    return {
      level: 'SOLID',
      detail: 'Continuous evidence available — assessment grounded in repeated observations.',
    };
  }

  return {
    level: 'MODERATE',
    detail: 'Moderate evidence coverage — some observation gaps may exist.',
  };
}

/**
 * Short label for a "YYYY-MM" report month, e.g. "APR '26".
 * Returns the raw string if it is malformed.
 */
export function monthShortLabel(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);

  if (!match) return month;

  const MONTHS = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ];

  const m = MONTHS[Number(match[2]) - 1];

  return m ? `${m} '${match[1].slice(2)}` : month;
}

/**
 * Stall status labels for the project status section.
 */
export const stallStatusLabel: Record<StallStatus, string> = {
  active: 'Active',
  slowing: 'Slowing',
  stalled: 'Stalled',
  insufficient_data: 'Insufficient Data',
};

export function stallStatusLabelFor(
  status: StallStatus | null | undefined
): string | null {
  if (!status) return null;
  return stallStatusLabel[status] ?? null;
}

/**
 * Progress gap label map for UI classification.
 */
export const progressGapLabelMap: Record<string, string> = {
  FINANCIAL_LAG: 'Financial Lag',
  FINANCIAL_LEAD: 'Financial Lead',
  ALIGNED: 'Aligned',
};

/**
 * Deadline revision trend labels.
 */
export const revisionTrendLabel: Record<string, string> = {
  rising: 'Rising',
  stable: 'Stable',
  falling: 'Falling',
  insufficient_history: 'Insufficient History',
};

/**
 * Classify progress gap magnitude for a REVIEW SIGNAL tag.
 * Returns true when the gap exceeds 10 percentage points.
 */
export function isSignificantProgressGap(
  gap: number | null | undefined
): boolean {
  if (gap === null || gap === undefined) return false;
  return Math.abs(gap) >= 10;
}