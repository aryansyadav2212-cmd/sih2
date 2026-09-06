import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import ProjectRowMetrics from '../../components/ProjectRowMetrics/ProjectRowMetrics';
import { useAttentionProjects } from '../../hooks/useAttentionProjects';
import { usePortfolioStats } from '../../hooks/usePortfolioStats';
import { attentionReason } from '../../utils/labels';
import type {
  AttentionCategory,
} from '../../api/types';
import './HomePage.css';

const attentionLabel: Record<Exclude<AttentionCategory, null>, string> = {
  intervention_required: 'INTERVENTION REQUIRED',
  monitor: 'MONITOR',
  closure_watch: 'CLOSURE WATCH',
};

const categoryRoute: Record<Exclude<AttentionCategory, null>, string> = {
  intervention_required: '/projects/intervention',
  monitor: '/projects/monitor',
  closure_watch: '/projects/closure',
};

const categoryCardMeta: Record<
  Exclude<AttentionCategory, null>,
  { title: string; intro: string; accent: string; blurb: string }
> = {
  intervention_required: {
    title: 'INTERVENTION REQUIRED',
    intro: 'Projects needing active review',
    accent: 'red',
    blurb: 'Projects where available evidence suggests active review may be required.',
  },
  closure_watch: {
    title: 'CLOSURE WATCH',
    intro: 'Projects nearing completion',
    accent: 'green',
    blurb: 'Projects at 97%+ reported completion approaching project closure.',
  },
  monitor: {
    title: 'MONITOR',
    intro: 'Projects requiring continued observation',
    accent: 'amber',
    blurb: 'Projects with signals worth tracking but no immediate intervention trigger.',
  },
};

export default function HomePage() {
  const { stats, loading: statsLoading } = usePortfolioStats();
  const {
    categories: attentionCategories,
    total: attentionTotal,
    loading: attentionLoading,
    error: attentionError,
  } = useAttentionProjects();

  return (
    <>
      {/* HERO — TRACE identity */}
      <section className="hero">
        <div className="hero__bg" />
        <div className="hero__overlay" />
        <Navbar variant="transparent" />

        <div className="hero__content px-page container-max">
          <div className="hero__copy">
            <div className="hero__kicker font-label-caps">
              TRACE · INFRASTRUCTURE INTELLIGENCE
            </div>
            <h1 className="hero__title font-display-lg">
              From Project Monitoring to Project Intelligence
            </h1>
            <p className="hero__subtitle font-body-lg">
              Transform infrastructure monitoring data into early warnings,
              explainable signals, and actionable decisions.
            </p>
            <div className="hero__meta font-metadata">
              <span>{stats ? `${stats.totalProjects.toLocaleString()} PROJECTS ANALYZED` : '—'}</span>
              <span>·</span>
              <span>PAIMANA MONITORING DATA</span>
            </div>
            <Link to="/projects" className="hero__cta font-label-caps text-link-hover">
              EXPLORE PROJECTS
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      <main className="home-main container-max">
        {/* NATIONAL OVERVIEW — real backend aggregates */}
        <section id="overview" className="stats-section px-page py-section">
          <div className="industrial-line-top stats-section__header">
            <h2 className="font-label-caps section-label">National Situation Overview</h2>
            <p className="section-note font-metadata">
              TRACE analyzes PAIMANA infrastructure monitoring data.
            </p>
          </div>
          <div className="stats-grid">
            <div className="stat-card industrial-line">
              <div className="stat-card__value font-display-lg">
                {statsLoading ? '…' : stats?.totalProjects.toLocaleString() ?? '—'}
              </div>
              <div className="stat-card__label font-label-caps">Project Portfolio</div>
            </div>
            <div className="stat-card industrial-line">
              <div className="stat-card__value font-display-lg">
                {statsLoading ? '…' : stats?.predictedCount.toLocaleString() ?? '—'}
              </div>
              <div className="stat-card__label font-label-caps">Outlook Available</div>
            </div>
            <div className="stat-card industrial-line">
              <div className="stat-card__value font-display-lg stat-card__value--error">
                {statsLoading ? '…' : stats?.highRiskCount.toLocaleString() ?? '—'}
              </div>
              <div className="stat-card__label font-label-caps">High Revision Outlook</div>
            </div>
            <div className="stat-card industrial-line">
              <div className="stat-card__value font-display-lg">
                {statsLoading ? '…' : stats?.unavailableCount.toLocaleString() ?? '—'}
              </div>
              <div className="stat-card__label font-label-caps">Outlook Unavailable</div>
            </div>
          </div>
        </section>

        {/* OPERATIONAL WORK QUEUES — three category cards */}
        <section className="queues-section px-page py-section">
          <div className="queues-section__header industrial-line-top">
            <h2 className="font-headline-lg queues-section__title">OPERATIONAL WORK QUEUES</h2>
            <div className="queues-section__meta font-metadata">
              <span>{attentionTotal.toLocaleString()} PROJECTS FLAGGED FOR REVIEW</span>
              <span>·</span>
              <span>THREE CLEAR ACTIONS</span>
            </div>
          </div>

          {attentionLoading && (
            <div className="font-body-md" style={{ color: 'var(--color-on-surface-variant)', padding: '24px 0' }}>
              Loading projects...
            </div>
          )}
          {!attentionLoading && attentionError && (
            <div className="font-body-md" style={{ color: 'var(--color-error)', padding: '24px 0' }}>
              {attentionError}
            </div>
          )}

          <div className="queues-grid">
            {(Object.keys(attentionLabel) as Exclude<AttentionCategory, null>[]).map((key) => {
              const meta = categoryCardMeta[key];
              const group = attentionCategories.find((g) => g.key === key);
              const uri = categoryRoute[key];
              return (
                <Link to={uri} key={key} className={`queue-card queue-card--${meta.accent}`}>
                  <h3 className="queue-card__title font-label-caps">{meta.title}</h3>
                  <div className="queue-card__count-row">
                    <span className="queue-card__count font-display-lg">
                      {group?.count.toLocaleString() ?? '—'}
                    </span>
                    <span className="queue-card__count-unit font-label-caps">
                      projects
                    </span>
                  </div>
                  <p className="queue-card__blurb font-body-md">{meta.blurb}</p>
                  <span className="queue-card__view font-label-caps">
                    View Projects <span className="material-symbols-outlined">arrow_forward</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* SAMPLE PROJECTS PER CATEGORY */}
        {!attentionLoading && !attentionError && (
          <section className="attention-section px-page py-section">
            {attentionCategories.map((group) => {
              const key = group.key;
              const meta = categoryCardMeta[key];
              return (
                <div key={key} className={`attention-group industrial-line-top attention-group--${meta.accent}`}>
                  <div className="attention-group__header">
                    <h3 className="attention-group__title font-label-caps">{attentionLabel[key]}</h3>
                    <div className="attention-group__meta font-metadata">
                      <span>{group.count.toLocaleString()} PROJECTS</span>
                      <Link to={categoryRoute[key]} className="text-link-hover">
                        View All
                      </Link>
                    </div>
                  </div>
                  <div className="project-list">
                    {group.data.slice(0, 4).map((project) => {
                      return (
                        <Link
                          to={`/projects/${encodeURIComponent(project.projectCode)}`}
                          key={project.projectCode}
                          className="project-row industrial-line"
                        >
                          <div className="project-row__grid">
                            <div className="project-row__num font-metadata">{project.projectCode}</div>
                            <div className="project-row__info">
                              <h4 className="project-row__name">{project.projectName.toUpperCase()}</h4>
                              <div className="project-row__sector font-label-caps">
                                {[project.ministry, project.state].filter(Boolean).join(' · ') || 'Infrastructure'}
                              </div>
                              <p className="project-row__reason font-body-md">
                                {attentionReason(project, key)}
                              </p>
                            </div>
                            <ProjectRowMetrics project={project} metricError={key === 'intervention_required'} />
                            <div className="project-row__arrow">
                              <span className="material-symbols-outlined">arrow_forward</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <Link to={categoryRoute[key]} className="attention-group__more font-metadata text-link-hover">
                    View all {group.count.toLocaleString()} projects
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                </div>
              );
            })}
          </section>
        )}

        {/* EARLY WARNING — model outlook framing */}
        <section className="warning-section px-page py-section">
          <div className="industrial-line-top warning-section__header">
            <h2 className="font-label-caps section-label">TRACE OUTLOOK</h2>
          </div>
          <div className="warning-list">
            <div className="warning-item">
              <div className="warning-dot warning-dot--warning" />
              <div>
                <div className="warning-text font-body-md">
                  TRACE estimates the likelihood that each project will revise
                  its recorded completion deadline within the next month. This
                  deadline revision outlook is separate from — and should not be
                  conflated with — whether a project requires intervention.
                </div>
                <div className="warning-meta font-metadata">
                  <span>MODEL FORECAST</span>
                  <span>·</span>
                  <span>DEADLINE REVISION OUTLOOK</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* EXPLORE CTA */}
        <section className="explore-section px-page">
          <Link to="/projects" className="explore-link font-display-lg">
            EXPLORE THE NATIONAL PROJECT PORTFOLIO
            <span className="material-symbols-outlined explore-link__icon">arrow_forward</span>
          </Link>
        </section>
      </main>

      <Footer />
    </>
  );
}