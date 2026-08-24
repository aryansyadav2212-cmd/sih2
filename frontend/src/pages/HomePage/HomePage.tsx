import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import './HomePage.css';

const attentionProjects = [
  {
    id: '01',
    name: 'INTEGRATED FREIGHT CORRIDOR PHASE II',
    sector: 'Railways · Transport',
    status: 'CRITICAL',
    statusType: 'critical' as const,
    physical: '42.5%',
    financial: '68.1%',
    slug: 'integrated-freight-corridor-phase-ii',
  },
  {
    id: '02',
    name: 'NATIONAL WATERWAY TERMINAL 4',
    sector: 'Shipping · Logistics',
    status: 'DELAYED',
    statusType: 'delayed' as const,
    physical: '18.2%',
    financial: '35.0%',
    slug: 'national-waterway-terminal-4',
  },
  {
    id: '03',
    name: 'ULTRA MEGA POWER PROJECT ZONAL',
    sector: 'Energy · Power',
    status: 'CRITICAL',
    statusType: 'critical' as const,
    physical: '89.5%',
    financial: '99.1%',
    slug: 'ultra-mega-power-project-zonal',
  },
];

const earlyWarnings = [
  {
    dot: 'critical',
    text: 'Unusual financial drawdown detected in PRJ-HWY-449. Pattern matches historic stalling precursors.',
    severity: 'CRITICAL',
    time: '10 MIN AGO',
  },
  {
    dot: 'warning',
    text: 'Land acquisition litigation filed against NWT-Phase3 site C. Projected delay: 14 months.',
    severity: 'WARNING',
    time: '2 HOURS AGO',
  },
];

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero__bg" />
        <div className="hero__overlay" />
        <Navbar variant="transparent" />

        <div className="hero__content px-page container-max">
          <div className="hero__copy">
            <h1 className="hero__title font-display-lg">
              NATIONAL INFRASTRUCTURE INTELLIGENCE
            </h1>
            <p className="hero__subtitle font-body-lg">
              AI-powered monitoring and early warning for India's critical infrastructure portfolio.
              Real-time sovereign scale analytics.
            </p>
            <div className="hero__meta font-metadata">
              <span>1,981 PROJECTS</span>
              <span>·</span>
              <span>22 SECTORS</span>
              <span>·</span>
              <span>17 MINISTRIES</span>
            </div>
            <Link to="/projects" className="hero__cta font-label-caps text-link-hover">
              EXPLORE PROJECTS
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      <main className="home-main container-max">
        {/* NATIONAL SITUATION */}
        <section className="stats-section px-page py-section">
          <div className="industrial-line-top stats-section__header">
            <h2 className="font-label-caps section-label">National Situation Overview</h2>
          </div>
          <div className="stats-grid">
            {[
              { value: '1,981', label: 'Projects Monitored', color: '' },
              { value: '327',   label: 'Require Attention',  color: '' },
              { value: '86',    label: 'High Risk',          color: 'error' },
              { value: '142',   label: 'Active Warnings',    color: '' },
            ].map(stat => (
              <div key={stat.label} className="stat-card industrial-line">
                <div className={`stat-card__value font-display-lg ${stat.color === 'error' ? 'stat-card__value--error' : ''}`}>
                  {stat.value}
                </div>
                <div className="stat-card__label font-label-caps">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* PROJECTS REQUIRING ATTENTION */}
        <section className="attention-section px-page py-section">
          <div className="attention-section__header industrial-line-top">
            <h2 className="font-headline-lg attention-section__title">PROJECTS REQUIRING ATTENTION</h2>
            <Link to="/projects" className="attention-section__view-all font-metadata text-link-hover">
              View All Portfolio
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>

          <div className="project-list">
            {attentionProjects.map(project => (
              <Link
                to={`/projects/${project.slug}`}
                key={project.id}
                className="project-row industrial-line"
              >
                <div className="project-row__grid">
                  <div className="project-row__num font-metadata">{project.id}</div>
                  <div className="project-row__info">
                    <h3 className="project-row__name">{project.name}</h3>
                    <div className="project-row__sector font-label-caps">{project.sector}</div>
                  </div>
                  <div className="project-row__status">
                    <span className={`status-badge status-badge--${project.statusType} font-metadata`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="project-row__progress">
                    <div className="progress-row font-metadata">
                      <span>Physical Progress</span><span>{project.physical}</span>
                    </div>
                    <div className="progress-row font-metadata">
                      <span>Financial Progress</span><span>{project.financial}</span>
                    </div>
                  </div>
                  <div className="project-row__arrow">
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* EARLY WARNING */}
        <section className="warning-section px-page py-section">
          <div className="industrial-line-top warning-section__header">
            <h2 className="font-label-caps section-label">EARLY WARNING SIGNALS</h2>
          </div>
          <div className="warning-list">
            {earlyWarnings.map((w, i) => (
              <div key={i} className={`warning-item warning-item--${w.dot}`}>
                <div className={`warning-dot warning-dot--${w.dot}`} />
                <div>
                  <div className="warning-text font-body-md">{w.text}</div>
                  <div className="warning-meta font-metadata">
                    <span>{w.severity}</span>
                    <span>·</span>
                    <span>{w.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ASK PAIMANA */}
        <section className="ask-section px-page py-section">
          <div className="industrial-line-top ask-section__header">
            <h2 className="font-label-caps section-label">ASK PAIMANA</h2>
          </div>
          <div className="ask-section__inner">
            <h3 className="ask-section__quote font-display-lg">
              "Which infrastructure projects require intervention this month?"
            </h3>
            <div className="ask-input-wrap">
              <input
                type="text"
                className="ask-input font-body-md"
                placeholder="Query the national intelligence model..."
              />
              <button className="ask-submit">
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
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
