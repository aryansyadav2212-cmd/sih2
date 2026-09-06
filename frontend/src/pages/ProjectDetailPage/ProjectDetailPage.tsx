import { Link, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import { useProject } from '../../hooks/useProject';
import { useIntelligence } from '../../hooks/useIntelligence';
import {
  deadlineOutlookSentence,
  reasonGroupLabel,
  scheduleStateLabelFor,
} from '../../utils/labels';
import type {
  AttentionCategory,
  PredictionContext,
  ProjectIntelligence,
  ProjectSummary,
  Reason,
} from '../../api/types';
import './ProjectDetailPage.css';

/**
 * Maps the model probability band to a concise likelihood label.
 * Framed as "likelihood of deadline change", never as a failure risk.
 */
function riskPresentation(level: string | undefined): {
  label: string;
  className: string;
} {
  switch (level) {
    case 'high':
      return { label: 'HIGH', className: 'risk-level--high' };
    case 'medium':
      return { label: 'MEDIUM', className: 'risk-level--medium' };
    case 'low':
      return { label: 'LOW', className: 'risk-level--low' };
    default:
      return { label: '—', className: 'risk-level--na' };
  }
}

function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(1)}%`;
}

function formatDays(value: number): string {
  if (Number.isNaN(value)) return '—';
  return `${value} days`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Honest, code-specific message for a failed prediction. Distinguishes the
 * real causes: missing deadline data (a genuine gap in the observation),
 * an unreachable model, rate limiting, or an internal data validation bug.
 */
function predictionUnavailableMessage(
  code: string | null,
  fallback: string
): string {
  switch (code) {
    case 'MISSING_COMPLETION_DEADLINE':
      return 'Prediction unavailable: the latest observation for this project has no revised completion date, so the model cannot assess this outlook.';
    case 'INSUFFICIENT_DATA':
      return 'Prediction unavailable: the model does not currently have enough observation data to produce a forecast for this project.';
    case 'SERVICE_UNAVAILABLE':
      return 'Prediction unavailable right now: the model service could not be reached. Check back shortly.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Prediction temporarily unavailable: too many requests. Try again in a moment.';
    case 'INVALID_RESPONSE':
      return 'Prediction unavailable: the model returned data that could not be validated. This has been logged.';
    case 'RESOURCE_NOT_FOUND':
      return 'Prediction unavailable: no prediction data exists for this project and month.';
    default:
      return fallback;
  }
}

function HeaderMeta({
  project,
  reportMonth,
}: {
  project: ProjectSummary;
  reportMonth: string | null;
}) {
  const metaItems = [
    { label: 'Project ID', value: project.projectCode, chip: true },
    { label: 'Ministry / Department', value: project.ministry },
    { label: 'Sector', value: project.sector },
    { label: 'Location', value: project.state },
    { label: 'Implementing Agency', value: project.agency },
    { label: 'Latest Report', value: reportMonth },
  ];

  return (
    <div className="detail-header__meta-grid">
      {metaItems.map(item => (
        <div key={item.label} className="meta-item">
          <span className="meta-item__label font-label-caps">{item.label}</span>
          {item.chip ? (
            <span className="meta-item__chip font-metadata">
              {item.value ?? '—'}
            </span>
          ) : (
            <span className="meta-item__value font-body-md">
              {item.value ?? '—'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * LAYER 1 — reported project status. Plain reporting language only.
 */
function ProjectStatusBlock({
  context,
  financialRatio,
}: {
  context: PredictionContext;
  financialRatio: number | null;
}) {
  const stateLabel =
    scheduleStateLabelFor(context.scheduleState) ?? context.scheduleState;
  const healthy =
    context.scheduleState === 'on_track' || context.scheduleState === 'completed';

  const items = [
    {
      label: 'Completion',
      value: formatPercent(context.currentProgress),
      valueClass: '',
    },
    {
      label: 'Remaining Work',
      value: formatPercent(context.remainingProgress),
      valueClass: '',
    },
    {
      label: 'Financial Progress',
      value: financialRatio !== null ? `${(financialRatio * 100).toFixed(0)}%` : '—',
      valueClass: '',
    },
    {
      label: 'Schedule',
      value: stateLabel,
      valueClass: healthy ? 'ok' : 'error',
    },
    {
      label: 'Completion Deadline',
      value: formatDate(context.deadlineDate),
      valueClass: context.remainingDays < 0 ? 'error' : '',
    },
    {
      label: 'Time Remaining',
      value: formatDays(context.remainingDays),
      valueClass: context.remainingDays < 0 ? 'error' : '',
    },
  ];

  return (
    <div className="status-outlook__block">
      <div className="status-outlook__block-head font-label-caps">
        PROJECT STATUS
      </div>
      <p className="status-outlook__block-sub font-metadata">
        Reported from the latest PAIMANA observation.
      </p>
      <div className="status-list">
        {items.map(item => (
          <div key={item.label} className="status-row">
            <span className="status-row__label font-metadata">{item.label}</span>
            <span
              className={`status-row__value font-body-md ${item.valueClass === 'error' ? 'color-error' : ''} ${item.valueClass === 'ok' ? 'color-ok' : ''}`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * LAYER 1 — deadline outlook: one large likelihood figure plus a plain
 * sentence. Framed as a forecast about the recorded completion date, never
 * as a failure verdict. Rendered as the dark anchor panel.
 */
function DeadlineOutlookBlock({
  intelligence,
}: {
  intelligence: ProjectIntelligence;
}) {
  const { prediction } = intelligence;
  const risk = riskPresentation(prediction.riskLevel);
  const pct = (prediction.probability * 100).toFixed(0);

  return (
    <div className="trace-outlook">
      <div className="trace-outlook__head font-label-caps">TRACE OUTLOOK</div>
      <div className="trace-outlook__score">
        <span className="trace-outlook__number font-display-lg">{pct}</span>
        <span className="trace-outlook__denom font-headline-md">%</span>
      </div>
      <div className={`trace-outlook__band font-label-caps ${risk.className}`}>
        {risk.label} REVISION OUTLOOK
      </div>
      <p className="trace-outlook__sub font-body-lg">
        Estimated likelihood that the reported completion deadline will be
        revised next month.
      </p>
      <div className="score-bar">
        <div
          className={`score-bar__fill ${risk.className}`}
          style={{ width: `${prediction.probability * 100}%` }}
        />
      </div>
      <p className="trace-outlook__note font-body-md">
        {deadlineOutlookSentence(prediction.riskLevel, prediction.probability)}
      </p>
      <p className="trace-outlook__disclaimer font-metadata">
        A forecast about the recorded completion date — not an assessment of
        project quality or failure.
      </p>
    </div>
  );
}

/**
 * Closure Watch — shown only when the project is at 97%+ reported completion.
 * Acknowledges the final-stage state explicitly and, where the project also
 * requires intervention, surfaces that signal separately instead of pretending
 * everything is normal.
 */
function ClosureWatchNotice({
  progress,
  attention,
  financialProgress,
  scheduleState,
  remainingDays,
}: {
  progress: number;
  attention: AttentionCategory;
  financialProgress: number | null;
  scheduleState: string;
  remainingDays: number;
}) {
  const voiced = attention === 'intervention_required';

  const metrics = [
    { label: 'Physical Completion', value: `${progress.toFixed(0)}%` },
    {
      label: 'Financial Completion',
      value: financialProgress !== null ? `${financialProgress.toFixed(0)}%` : '—',
    },
    { label: 'Schedule', value: scheduleState },
    {
      label: 'Deadline',
      value: `${remainingDays} days remaining`,
    },
  ];

  return (
    <section className="detail-section">
      <div className={`closure-notice ${voiced ? 'closure-notice--attention' : ''}`}>
        <div className="closure-notice__tags">
          <span className="closure-notice__tag font-label-caps">
            CLOSURE WATCH · {progress.toFixed(0)}% COMPLETE
          </span>
          {voiced && (
            <span className="closure-notice__tag closure-notice__tag--attention font-label-caps">
              ATTENTION · INTERVENTION REQUIRED
            </span>
          )}
        </div>
        <p className="closure-notice__body font-body-md">
          This project is in its final stage. The remaining work may include
          final execution, commissioning, documentation, approvals, or
          administrative closure.
        </p>
        <div className="closure-metrics">
          {metrics.map((m) => (
            <div key={m.label} className="closure-metric">
              <span className="closure-metric__label font-label-caps">{m.label}</span>
              <span className="closure-metric__value font-headline-md">{m.value}</span>
            </div>
          ))}
        </div>
        {voiced && (
          <p className="closure-notice__note font-body-md">
            Despite being near completion, this project also shows signals that
            may require active review.
          </p>
        )}
      </div>
    </section>
  );
}

function ConditionSection({
  intelligence,
  financialRatio,
}: {
  intelligence: ProjectIntelligence;
  financialRatio: number | null;
}) {
  const { context } = intelligence;

  return (
    <section className="detail-section">
      {/* Dark TRACE OUTLOOK anchor */}
      <DeadlineOutlookBlock intelligence={intelligence} />

      {/* Light status block */}
      <div className="status-outlook__wrap">
        <h2 className="section-heading font-headline-md">PROJECT STATUS</h2>
        <ProjectStatusBlock context={context} financialRatio={financialRatio} />
      </div>
    </section>
  );
}

/**
 * LAYER 2 supporting surface — execution pace, framed for an officer.
 * Raw technical values belong in the "Technical Details" section.
 */
function ProgressIntelligenceSection({
  intelligence,
}: {
  intelligence: ProjectIntelligence;
}) {
  const { context } = intelligence;

  const observedVelocity =
    context.observedVelocity !== null && context.observedVelocity !== undefined
      ? `${context.observedVelocity.toFixed(1)}%/mo`
      : '—';
  const requiredVelocity =
    context.requiredVelocity !== null && context.requiredVelocity !== undefined
      ? `${context.requiredVelocity.toFixed(1)}%/mo`
      : '—';

  const velocityConflict =
    context.observedVelocity !== null &&
    context.observedVelocity !== undefined &&
    context.requiredVelocity !== null &&
    context.requiredVelocity !== undefined &&
    context.observedVelocity < context.requiredVelocity;

  const stateLabel =
    scheduleStateLabelFor(context.scheduleState) ?? context.scheduleState;

  const items = [
    {
      label: 'Recent Completion Pace',
      value: observedVelocity,
      sub: 'per month, from recent reports',
      color: '',
    },
    {
      label: 'Pace Needed for Deadline',
      value: requiredVelocity,
      sub:
        context.requiredVelocity === null
          ? 'Not computable past deadline'
          : 'per month to hold the deadline',
      color: velocityConflict ? 'error' : '',
    },
    {
      label: 'Schedule',
      value: stateLabel,
      sub: 'Latest assessment',
      color: context.scheduleState === 'on_track' ? 'ok' : 'error',
    },
    {
      label: 'Time Remaining',
      value: context.remainingDays !== null ? formatDays(context.remainingDays) : '—',
      sub: context.remainingDays !== null && context.remainingDays < 0 ? 'Past deadline' : 'Until deadline',
      color: context.remainingDays !== null && context.remainingDays < 0 ? 'error' : '',
    },
  ];

  return (
    <section className="detail-section">
      <div className="section-heading-block">
        <h2 className="section-heading font-headline-md">PROJECT PROGRESS</h2>
        <p className="section-subheading font-metadata">
          How the project&apos;s recent progress compares with the current deadline.
        </p>
      </div>

      <div className="progress-strip">
        {items.map(item => (
          <div key={item.label} className="progress-strip__item">
            <span className="progress-strip__label font-label-caps">{item.label}</span>
            <span className={`progress-strip__value font-headline-md ${item.color === 'error' ? 'color-error' : ''} ${item.color === 'ok' ? 'color-ok' : ''}`}>
              {item.value}
              {item.sub && <span className="progress-strip__sub font-metadata"> · {item.sub}</span>}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReasonsSection({ reasons }: { reasons: Reason[] }) {
  if (reasons.length === 0) {
    return (
      <section className="detail-section">
        <div className="section-heading-block">
          <h2 className="section-heading font-headline-md">WHAT&apos;S DRIVING THIS OUTLOOK</h2>
          <p className="section-subheading font-metadata">
            Signals associated with the outlook above.
          </p>
        </div>
        <p className="font-body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
          No contributing signals were reported for this project.
        </p>
      </section>
    );
  }

  return (
    <section className="detail-section">
      <div className="section-heading-block">
        <h2 className="section-heading font-headline-md">WHAT&apos;S DRIVING THIS OUTLOOK</h2>
        <p className="section-subheading font-metadata">
          Signals associated with deadline revision, not causes or instructions.
        </p>
      </div>
      <div className="reasons-list">
        {reasons.map((reason, index) => (
          <div key={index} className="reason-row">
            <div className="reason-row__num font-metadata">
              {String(index + 1).padStart(2, '0')}
            </div>
            <div className="reason-row__content">
              <div className="reason-row__group font-label-caps">
                {reasonGroupLabel[reason.group] ?? reason.group}
              </div>
              <div className="reason-row__message font-body-md">
                {reason.message}
              </div>
            </div>
            <div className={`reason-row__direction font-label-caps reason-direction--${reason.direction}`}>
              {reason.direction === 'increases' ? 'Increases likelihood' : 'Reduces likelihood'}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Prominent recommended action. Renders the backend LLM text as-is — no
 * invented guidance. Structured as RECOMMENDED ACTION → WHY THIS MATTERS.
 */
function RecommendationSection({
  intelligence,
}: {
  intelligence: ProjectIntelligence;
}) {
  const { recommendation, prediction } = intelligence;

  if (!recommendation) {
    return (
      <section className="detail-section">
        <h2 className="section-heading font-headline-md">RECOMMENDED ACTION</h2>
        <div className="intelligence-unavailable">
          <span className="intelligence-unavailable__tag font-label-caps">
            ⚑ RECOMMENDATION
          </span>
          <span className="font-body-md">
            The model prediction is available, but the written recommendation
            could not be generated at this time. Try again later.
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="detail-section">
      <h2 className="section-heading font-headline-md">RECOMMENDED ACTION</h2>
      <div className={`intervention-card intervention-card--${prediction.riskLevel}`}>
        <div>
          <span className="font-label-caps color-error">TRACE RECOMMENDATION</span>
          <h3 className="intervention-card__title font-headline-md">
            {recommendation.summary}
          </h3>

          {recommendation.keyReasons.length > 0 && (
            <div className="intervention-card__block">
              <span className="intelligence-card__factors-label font-label-caps">
                Why This Matters
              </span>
              <ul className="intervention-list font-body-md">
                {recommendation.keyReasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {recommendation.recommendedActions.length > 0 && (
            <div className="intervention-card__block">
              <span className="intelligence-card__factors-label font-label-caps">
                Suggested Next Steps
              </span>
              <ul className="intervention-list intervention-list--actions font-body-md">
                {recommendation.recommendedActions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>
          )}

          {recommendation.verificationNeeded.length > 0 && (
            <div className="intervention-card__block">
              <span className="intelligence-card__factors-label font-label-caps">
                Verification Needed
              </span>
              <ul className="intervention-list font-body-md">
                {recommendation.verificationNeeded.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Advanced model details — the raw technical figures behind the outlook.
 * Relegated to an expandable section so the decision-maker view stays clean.
 */
function AdvancedDetailsSection({
  intelligence,
  financialRatio,
}: {
  intelligence: ProjectIntelligence;
  financialRatio: number | null;
}) {
  const { prediction, context, reasons } = intelligence;

  const observed =
    context.observedVelocity !== null && context.observedVelocity !== undefined
      ? context.observedVelocity
      : null;
  const required =
    context.requiredVelocity !== null && context.requiredVelocity !== undefined
      ? context.requiredVelocity
      : null;
  const gap =
    observed !== null && required !== null
      ? required - observed
      : null;

  const trajectory =
    context.observedVelocity !== null && context.observedVelocity !== undefined
      ? context.observedVelocity < 0
        ? 'regressing'
        : context.observedVelocity === 0
          ? 'stable'
          : 'moving'
      : '—';

  const cells: { label: string; value: string }[] = [
    {
      label: 'Model',
      value: 'Gradient Boosting',
    },
    {
      label: 'Target',
      value: prediction.target ?? 'deadline_revision_next_month',
    },
    {
      label: 'Predicted Probability',
      value: `${(prediction.probability * 100).toFixed(4)}`,
    },
    {
      label: 'Risk Band',
      value: (prediction.riskLevel ?? '').toUpperCase(),
    },
    {
      label: 'Observed Velocity',
      value: observed !== null ? `${observed.toFixed(2)} pp/month` : '—',
    },
    {
      label: 'Required Velocity',
      value: required !== null ? `${required.toFixed(2)} pp/month` : '—',
    },
    {
      label: 'Velocity Gap',
      value: gap !== null ? `${gap.toFixed(2)} pp/month` : '—',
    },
    {
      label: 'Trajectory',
      value: trajectory,
    },
    {
      label: 'Schedule State',
      value: context.scheduleState,
    },
    {
      label: 'Expenditure Ratio',
      value: financialRatio !== null ? financialRatio.toFixed(3) : '—',
    },
    {
      label: 'Model Contribution',
      value:
        reasons.length > 0
          ? reasons.map(r => `${reasonGroupLabel[r.group] ?? r.group} · ${r.direction}`).join('  ')
          : 'None reported',
    },
    {
      label: 'Prediction Metadata',
      value: `Next month forecast · ${prediction.riskLevel ?? 'n/a'} band`,
    },
  ];

  return (
    <section className="detail-section">
      <details className="advanced-details">
        <summary className="font-label-caps">
          <span>Technical Details</span>
          <span className="advanced-details__hint font-metadata">Model figures behind this outlook</span>
          <span className="material-symbols-outlined advanced-details__icon">
            chevron_right
          </span>
        </summary>
        <div className="advanced-details__body">
          <p className="advanced-details__intro font-metadata">
            Technical values from the model&apos;s latest forecast, retained for
            review by analysts and technical teams.
          </p>
          <div className="advanced-details__grid">
            {cells.map(cell => (
              <div key={cell.label} className="advanced-details__cell">
                <span className="advanced-details__cell-label font-label-caps">
                  {cell.label}
                </span>
                <span className="advanced-details__cell-value font-body-md">
                  {cell.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}

function ExternalEvidenceSection({
  intelligence,
}: {
  intelligence: ProjectIntelligence;
}) {
  const evidence = intelligence.externalEvidence ?? [];

  if (evidence.length === 0) {
    return (
      <section className="detail-section">
        <h2 className="section-heading font-headline-md">EXTERNAL EVIDENCE</h2>
        <div className="evidence-empty font-body-md">
          No relevant external evidence found for this project.
        </div>
      </section>
    );
  }

  return (
    <section className="detail-section">
      <div className="section-heading-row">
        <h2 className="section-heading font-headline-md">EXTERNAL EVIDENCE</h2>
        <span className="font-metadata evidence-disclaimer">
          External sources · separate from PAIMANA data
        </span>
      </div>
      <div className="evidence-list">
        {evidence.map((item, index) => (
          <a
            key={index}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="evidence-item"
          >
            <div className="evidence-item__top">
              <span className={`evidence-quality evidence-quality--${item.quality} font-label-caps`}>
                {item.quality.toUpperCase()} QUALITY
              </span>
              <span className="font-metadata evidence-item__source">{item.source}</span>
            </div>
            <h3 className="evidence-item__title font-headline-md">{item.title}</h3>
            <p className="evidence-item__claim font-body-md">{item.claim}</p>
            <div className="font-metadata evidence-item__date">{formatDate(item.date)}</div>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function ProjectDetailPage() {
  const { projectCode } = useParams<{ projectCode: string }>();

  const { project, loading: projectLoading, error: projectError } =
    useProject(projectCode);

  const {
    data: intelligence,
    loading: intelligenceLoading,
    error: intelligenceError,
    errorCode: intelligenceErrorCode,
  } = useIntelligence(projectCode, project?.reportMonth ?? undefined);

  return (
    <>
      <Navbar variant="solid" />

      <main className="detail-main">
        <div className="detail-content px-page">

          {/* Breadcrumb */}
          <div className="breadcrumb font-metadata">
            <Link to="/projects" className="breadcrumb__link">Projects</Link>
            <span className="material-symbols-outlined breadcrumb__sep">chevron_right</span>
            <span>{project?.projectName ?? projectCode}</span>
          </div>

          {/* ── A · PROJECT HEADER ── */}
          <section className="detail-header">
            <h1 className="detail-header__title font-display-lg">
              {project?.projectName?.toUpperCase() ?? 'PROJECT'}
            </h1>

            {projectLoading && (
              <p className="font-body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
                Loading project...
              </p>
            )}

            {projectError && !projectLoading && (
              <div className="intelligence-unavailable">
                <span className="intelligence-unavailable__tag font-label-caps">⚑</span>
                <span className="font-body-md">{projectError}</span>
              </div>
            )}

            {project && !projectLoading && (
              <HeaderMeta project={project} reportMonth={project.reportMonth} />
            )}

            <div className="detail-header__divider" />
          </section>

          {!project && !projectLoading && !projectError && (
            <p className="font-body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
              Project not found.
            </p>
          )}

          {/* ── INTELLIGENCE LOADING ── */}
          {intelligenceLoading && project && (
            <section className="detail-section">
              <div className="intelligence-loading font-body-md">
                Analyzing project...
              </div>
            </section>
          )}

          {/* ── INTELLIGENCE UNAVAILABLE ── */}
          {!intelligenceLoading && intelligenceError && project && (
            <section className="detail-section">
              <div className="intelligence-unavailable">
                <span className="intelligence-unavailable__tag font-label-caps">⚑ PREDICTION</span>
                <span className="font-body-md">
                  {predictionUnavailableMessage(intelligenceErrorCode, intelligenceError)}
                </span>
              </div>
            </section>
          )}

          {/* ── NO REPORTING MONTH (cannot predict) ── */}
          {project &&
            !projectLoading &&
            !intelligenceLoading &&
            !intelligenceError &&
            !intelligence &&
            !project.reportMonth && (
              <section className="detail-section">
                <div className="intelligence-unavailable">
                  <span className="intelligence-unavailable__tag font-label-caps">⚑ PREDICTION</span>
                  <span className="font-body-md">
                    Prediction requires a reporting observation, which is unavailable for this project.
                  </span>
                </div>
              </section>
            )}

          {/* ── INTELLIGENCE CONTENT ── */}
          {intelligence && !intelligenceLoading && (
            <>
              {/* B + C · project status & deadline outlook */}
              <ConditionSection
                intelligence={intelligence}
                financialRatio={
                  project?.originalCost &&
                  project.cumulativeExpenditure !== null &&
                  project.originalCost > 0
                    ? project.cumulativeExpenditure / project.originalCost
                    : null
                }
              />

              {/* D · closure watch (only at 97%+ reported completion) */}
              {project?.projectStage === 'closure_watch' &&
                project.physicalProgress !== null && (
                  <ClosureWatchNotice
                    progress={project.physicalProgress}
                    attention={project.attentionCategory}
                    financialProgress={
                      project.originalCost &&
                      project.cumulativeExpenditure !== null &&
                      project.originalCost > 0
                        ? (project.cumulativeExpenditure / project.originalCost) * 100
                        : null
                    }
                    scheduleState={scheduleStateLabelFor(project.scheduleState) ?? '—'}
                    remainingDays={project.remainingDays ?? 0}
                  />
                )}

              {/* E · progress & schedule */}
              <ProgressIntelligenceSection intelligence={intelligence} />

              {/* F · what's driving the outlook */}
              <ReasonsSection reasons={intelligence.reasons} />

              {/* G · recommended action */}
              <RecommendationSection intelligence={intelligence} />

              {/* H · technical details (expandable) */}
              <AdvancedDetailsSection
                intelligence={intelligence}
                financialRatio={
                  project?.originalCost &&
                  project.cumulativeExpenditure !== null &&
                  project.originalCost > 0
                    ? project.cumulativeExpenditure / project.originalCost
                    : null
                }
              />

              <ExternalEvidenceSection intelligence={intelligence} />
            </>
          )}

        </div>
      </main>

      <Footer />
    </>
  );
}