import { formatProgressPercent, scheduleStateLabelFor } from '../../utils/labels';
import type { ProjectSummary } from '../../api/types';
import './ProjectRowMetrics.css';

export type ProjectRowMetricsProps = {
  project: ProjectSummary;
  metricError?: boolean;
};

/**
 * Shared three-metric stack for list rows (Complete / Schedule / Revision
 * Outlook). Used by HomePage sample rows and CategoryPage lists so the
 * officer-facing vocabulary stays identical everywhere.
 */
export default function ProjectRowMetrics({
  project,
  metricError = false,
}: ProjectRowMetricsProps) {
  return (
    <div className="row-metrics">
      <div className="row-metric">
        <span className="row-metric__value font-body-md">
          {project.physicalProgress !== null
            ? formatProgressPercent(project.physicalProgress)
            : '—'}
        </span>
        <span className="row-metric__label font-metadata">Complete</span>
      </div>
      <div className="row-metric">
        <span className={`row-metric__value font-body-md ${metricError ? 'metric-value--error' : ''}`}>
          {scheduleStateLabelFor(project.scheduleState) ?? '—'}
        </span>
        <span className="row-metric__label font-metadata">Schedule</span>
      </div>
      <div className="row-metric">
        <span className="row-metric__value font-body-md">
          {project.predictionStatus === 'predicted' && project.probability !== null
            ? `${(project.probability * 100).toFixed(0)}%`
            : '—'}
        </span>
        <span className="row-metric__label font-metadata">Revision Outlook</span>
      </div>
    </div>
  );
}