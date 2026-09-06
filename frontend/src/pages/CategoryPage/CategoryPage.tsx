import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import ProjectRowMetrics from '../../components/ProjectRowMetrics/ProjectRowMetrics';
import { useAttentionProjects } from '../../hooks/useAttentionProjects';
import { usePortfolioStats } from '../../hooks/usePortfolioStats';
import { attentionReason } from '../../utils/labels';
import type {
  ProjectSummary,
  AttentionCategory,
} from '../../api/types';
import './CategoryPage.css';

type CategoryKey = 'intervention' | 'closure' | 'monitor';

interface CategoryMeta {
  attentionKey: Exclude<AttentionCategory, null>;
  title: string;
  shortHeading: string;
  description: string;
  navLabel: string;
  module: 'intervention' | 'closure' | 'monitor';
  accent: 'red' | 'green' | 'amber';
}

const CATEGORY_META: Record<CategoryKey, CategoryMeta> = {
  intervention: {
    attentionKey: 'intervention_required',
    title: 'INTERVENTION REQUIRED',
    shortHeading: 'ACT NOW',
    description:
      'Projects where available evidence suggests active review or intervention may be required.',
    navLabel: 'Intervention Required',
    module: 'intervention',
    accent: 'red',
  },
  closure: {
    attentionKey: 'closure_watch',
    title: 'CLOSURE WATCH',
    shortHeading: 'FINAL-STAGE FOLLOW-UP',
    description:
      'Projects in the final stage of completion that may require closure follow-up rather than intervention.',
    navLabel: 'Closure Watch',
    module: 'closure',
    accent: 'green',
  },
  monitor: {
    attentionKey: 'monitor',
    title: 'MONITOR',
    shortHeading: 'KEEP WATCH',
    description:
      'Projects that do not currently require intervention but should remain under routine monitoring.',
    navLabel: 'Monitor',
    module: 'monitor',
    accent: 'amber',
  },
};

const CATEGORY_LINKS: CategoryKey[] = [
  'intervention',
  'closure',
  'monitor',
];

/**
 * Summary metrics per category. Only presentational metrics already available
 * from the backend are shown — nothing is invented.
 */
function buildSummaryMetrics(
  category: CategoryKey,
  projects: ProjectSummary[]
): { label: string; value: number | string }[] {
  if (category === 'intervention') {
    return [
      { label: 'Projects', value: projects.length },
      {
        label: 'High Outlook',
        value: projects.filter(
          (p) => p.riskLevel === 'high' && p.predictionStatus === 'predicted'
        ).length,
      },
      {
        label: 'Overdue',
        value: projects.filter((p) => p.scheduleState === 'overdue_incomplete').length,
      },
      {
        label: 'Stalled',
        value: projects.filter((p) => p.scheduleState === 'stalled').length,
      },
    ];
  }

  if (category === 'closure') {
    const complete100 = projects.filter(
      (p) => p.physicalProgress !== null && p.physicalProgress >= 100
    ).length;
    const onTrack = projects.filter(
      (p) => p.scheduleState === 'on_track' || p.scheduleState === 'completed'
    ).length;
    return [
      { label: 'Projects', value: projects.length },
      { label: '97%+ Complete', value: projects.length },
      { label: '100% Complete', value: complete100 },
      { label: 'On Track', value: onTrack },
    ];
  }

  // monitor
  const midHigh = projects.filter(
    (p) =>
      p.predictionStatus === 'predicted' &&
      (p.riskLevel === 'medium' || p.riskLevel === 'high')
  ).length;
  const behind = projects.filter((p) => p.scheduleState === 'behind').length;
  return [
    { label: 'Projects', value: projects.length },
    { label: 'Medium/High Outlook', value: midHigh },
    { label: 'Behind Schedule', value: behind },
    { label: 'Approaching Deadline', value: projects.filter((p) => p.remainingDays !== null && p.remainingDays > 0 && p.remainingDays <= 60).length },
  ];
}

export default function CategoryPage({
  category,
}: {
  category: CategoryKey;
}) {
  const meta = CATEGORY_META[category];
  const { categories, loading, error } = useAttentionProjects();
  const { stats } = usePortfolioStats();

  const group = categories.find((g) => g.key === meta.attentionKey);
  const projects = group?.data ?? [];
  const count = group?.count ?? 0;

  const latestMonth = stats?.latestReportMonths[0]?.value ?? null;
  const summaryMetrics = buildSummaryMetrics(category, projects);

  return (
    <>
      <Navbar variant="solid" />

      <main className={`category-main category-main--${meta.accent}`}>
        {/* Dark category hero */}
        <section className="category-hero">
          <div className="category-hero__inner px-page">
            <div className="category-hero__kicker font-label-caps">
              TRACE · OPERATIONAL WORK QUEUE
            </div>
            <div className="category-hero__title-row">
              <h1 className="category-hero__title font-display-lg">
                {meta.title}
              </h1>
              <span className={`category-hero__module font-label-caps category-module--${meta.accent}`}>
                {meta.shortHeading}
              </span>
            </div>
            <p className="category-hero__desc font-body-lg">
              {meta.description}
            </p>
            <div className="category-hero__meta font-label-caps">
              <span>{count.toLocaleString()} PROJECTS</span>
              {latestMonth && (
                <>
                  <span>·</span>
                  <span>LATEST REPORT {latestMonth}</span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Category navigation — move between the three work queues */}
        <nav className="category-nav px-page">
          {CATEGORY_LINKS.map((linkKey) => {
            const linkMeta = CATEGORY_META[linkKey];
            const linkGroup = categories.find((g) => g.key === linkMeta.attentionKey);
            const active = linkKey === category;
            return (
              <Link
                key={linkKey}
                to={`/projects/${linkKey}`}
                className={`category-nav__item category-nav__item--${linkMeta.accent} ${active ? 'category-nav__item--active' : ''}`}
              >
                <span className="category-nav__label font-label-caps">{linkMeta.navLabel}</span>
                <span className="category-nav__count font-headline-md">
                  {linkGroup?.count ?? 0}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="category-body px-page">
          {/* Light summary strip */}
          <section className="category-summary">
            {summaryMetrics.map((m) => (
              <div key={m.label} className="category-summary__item industrial-line">
                <div className="category-summary__value font-display-lg">
                  {m.value.toLocaleString()}
                </div>
                <div className="category-summary__label font-label-caps">{m.label}</div>
              </div>
            ))}
          </section>

          {loading && (
            <p className="font-body-md category-empty">
              Loading projects...
            </p>
          )}
          {!loading && error && (
            <p className="font-body-md category-empty color-error">{error}</p>
          )}
          {!loading && !error && projects.length === 0 && (
            <p className="font-body-md category-empty">
              No projects are currently in this work queue.
            </p>
          )}

          {/* Project cards */}
          {!loading && !error && projects.length > 0 && (
            <div className="category-list">
              {projects.map((p) => {
                return (
                  <Link
                    key={p.projectCode}
                    to={`/projects/${encodeURIComponent(p.projectCode)}`}
                    className="category-row industrial-line"
                  >
                    <div className="category-row__grid">
                      <div className="category-row__id font-metadata">
                        {p.projectCode}
                      </div>
                      <div className="category-row__main">
                        <h3 className="category-row__name">
                          {p.projectName.toUpperCase()}
                        </h3>
                        <div className="category-row__org font-label-caps">
                          {[p.ministry, p.agency, p.state].filter(Boolean).join(' · ') || 'Infrastructure'}
                        </div>
                        <p className="category-row__reason font-body-md">
                          {attentionReason(p, meta.attentionKey)}
                        </p>
                      </div>
                      <ProjectRowMetrics project={p} metricError={category === 'intervention'} />
                      <div className="category-row__arrow">
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}