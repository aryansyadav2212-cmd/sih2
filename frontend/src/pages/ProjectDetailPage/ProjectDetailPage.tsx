import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import './ProjectDetailPage.css';

const signals = [
  { time: '10 MIN AGO', level: 'CRITICAL', levelClass: 'critical', text: 'Financial drawdown increased while physical progress remained unchanged.' },
  { time: '2 HOURS AGO', level: 'HIGH',     levelClass: 'high',     text: 'Contractor dispute reported with potential milestone impact.' },
  { time: '1 DAY AGO',   level: 'MEDIUM',   levelClass: 'medium',   text: 'Schedule variance exceeded the expected intervention threshold.' },
];

const metaItems = [
  { label: 'Project ID',           value: 'PRJ-RLW-0942', chip: true },
  { label: 'Ministry / Department', value: 'Ministry of Railways' },
  { label: 'Sector',               value: 'Transport & Logistics' },
  { label: 'Location',             value: 'Multiple States' },
  { label: 'Status',               value: 'Under Implementation' },
  { label: 'Last Updated',         value: 'April 2026' },
];

const keySignals = [
  { label: 'Schedule',            value: '18.4%', sub: 'Behind Expected', valueClass: 'error' },
  { label: 'Physical Progress',   value: '42.5%', sub: 'Current Status',  valueClass: '' },
  { label: 'Financial Progress',  value: '68.1%', sub: 'Current Status',  valueClass: '' },
  { label: 'Expected Completion', value: 'DEC 2027', sub: 'Revised Timeline', valueClass: '' },
];

export default function ProjectDetailPage() {
  return (
    <>
      <Navbar variant="solid" />

      <main className="detail-main">
        <div className="detail-content px-page">

          {/* Breadcrumb */}
          <div className="breadcrumb font-metadata">
            <Link to="/projects" className="breadcrumb__link">Projects</Link>
            <span className="material-symbols-outlined breadcrumb__sep">chevron_right</span>
            <span>Integrated Freight Corridor Phase II</span>
          </div>

          {/* ── PROJECT HEADER ── */}
          <section className="detail-header">
            <h1 className="detail-header__title font-display-lg">
              INTEGRATED FREIGHT CORRIDOR PHASE II
            </h1>

            <div className="detail-header__meta-grid">
              {metaItems.map(item => (
                <div key={item.label} className="meta-item">
                  <span className="meta-item__label font-label-caps">{item.label}</span>
                  {item.chip ? (
                    <span className="meta-item__chip font-metadata">{item.value}</span>
                  ) : (
                    <span className="meta-item__value font-body-md">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="detail-header__divider" />
          </section>

          {/* ── PROJECT CONDITION ── */}
          <section className="detail-section">
            <h2 className="section-heading font-headline-md">PROJECT CONDITION</h2>
            <div className="condition-row">
              {/* Score Block */}
              <div className="score-block">
                <div className="score-block__top">
                  <span className="font-label-caps score-block__risk-label">AI RISK SCORE</span>
                  <span className="score-block__badge font-label-caps">HIGH RISK</span>
                </div>
                <div className="score-block__number font-display-lg">
                  78 <span className="score-block__denom font-headline-md">/ 100</span>
                </div>
                <div className="score-bar">
                  <div className="score-bar__fill" style={{ width: '78%' }} />
                </div>
              </div>
              {/* Assessment */}
              <div className="condition-text font-body-lg">
                Project is currently showing a significant probability of schedule and execution risk based on
                progress deviation, milestone slippage and financial-physical imbalance.
              </div>
            </div>
          </section>

          {/* ── KEY PROJECT SIGNALS ── */}
          <section className="detail-section">
            <h2 className="section-heading font-headline-md">KEY PROJECT SIGNALS</h2>
            <div className="signals-grid">
              {keySignals.map(s => (
                <div key={s.label} className="signal-card">
                  <span className="signal-card__label font-label-caps">{s.label}</span>
                  <span className={`signal-card__value font-display-lg ${s.valueClass === 'error' ? 'color-error' : ''}`}>
                    {s.value}
                  </span>
                  <span className="signal-card__sub font-metadata">{s.sub}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── PROJECT PROGRESS INTELLIGENCE ── */}
          <section className="detail-section">
            <div className="section-heading-block">
              <h2 className="section-heading font-headline-md">PROJECT PROGRESS INTELLIGENCE</h2>
              <p className="section-subheading font-metadata">Planned execution compared with reported project progress.</p>
            </div>

            {/* Chart */}
            <div className="chart-container">
              {/* Legend */}
              <div className="chart-legend font-label-caps">
                <div className="chart-legend__item">
                  <div className="chart-legend__line chart-legend__line--planned" />
                  Planned
                </div>
                <div className="chart-legend__item">
                  <div className="chart-legend__line chart-legend__line--actual" />
                  Actual Physical
                </div>
                <div className="chart-legend__item">
                  <div className="chart-legend__line chart-legend__line--financial" />
                  Financial
                </div>
              </div>

              {/* SVG Chart */}
              <div className="chart-body">
                <svg
                  className="chart-svg"
                  viewBox="0 0 900 400"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Grid lines */}
                  {[80, 160, 240, 320].map(y => (
                    <line key={y} x1="0" y1={y} x2="900" y2={y} stroke="rgba(198,198,203,0.2)" strokeWidth="1" />
                  ))}
                  {/* Planned line (dashed) */}
                  <path d="M 0 380 L 900 40" fill="none" stroke="#545f72" strokeDasharray="6 6" strokeWidth="2" />
                  {/* Actual Physical */}
                  <path d="M 0 380 L 300 290 L 560 260" fill="none" stroke="#ba1a1a" strokeWidth="3" />
                  {/* Financial */}
                  <path d="M 0 380 L 300 250 L 560 160" fill="none" stroke="#ba1a1a" strokeWidth="3" opacity="0.45" />
                </svg>
                <div className="chart-x-labels font-metadata">
                  <span>JAN 2024</span>
                  <span>APR 2026</span>
                  <span>DEC 2027</span>
                </div>
              </div>

              {/* Progress Summary Strip */}
              <div className="progress-strip">
                {[
                  { label: 'Physical Progress',  value: '42.5%', sub: '(Expected: 60.9%)', color: '' },
                  { label: 'Financial Progress', value: '68.1%', sub: '',                  color: '' },
                  { label: 'Schedule Deviation', value: '18.4%', sub: '',                  color: 'error' },
                  { label: 'Estimated Delay',    value: '~7 Months', sub: '',              color: 'error' },
                ].map(item => (
                  <div key={item.label} className="progress-strip__item">
                    <span className="progress-strip__label font-label-caps">{item.label}</span>
                    <span className={`progress-strip__value font-headline-md ${item.color === 'error' ? 'color-error' : ''}`}>
                      {item.value}
                      {item.sub && <span className="progress-strip__sub font-metadata"> {item.sub}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── PROJECT INTELLIGENCE ── */}
          <section className="detail-section">
            <h2 className="section-heading font-headline-md">PROJECT INTELLIGENCE</h2>
            <div className="intelligence-card">
              <div className="intelligence-card__score-col">
                <div className="font-display-lg">78 <span className="font-headline-md intelligence-card__denom">/ 100</span></div>
                <div className="risk-badge font-label-caps">HIGH RISK</div>
              </div>
              <div className="intelligence-card__content">
                <p className="font-body-md intelligence-card__text">
                  Schedule slippage is currently the primary risk driver. Physical progress is significantly behind the
                  expected trajectory while financial expenditure remains comparatively high.
                </p>
                <div className="intelligence-card__factors">
                  <span className="font-label-caps intelligence-card__factors-label">Contributing Factors</span>
                  <div className="intelligence-card__tags font-label-caps">
                    <span>• SCHEDULE VARIANCE</span>
                    <span>• FINANCIAL / PHYSICAL IMBALANCE</span>
                    <span>• CONTRACTOR PERFORMANCE</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="intelligence-card__footer">
              <button className="inline-action font-label-caps">
                EXPLORE PROJECT INTELLIGENCE
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </section>

          {/* ── EARLY WARNING SIGNALS ── */}
          <section className="detail-section">
            <div className="section-heading-row">
              <h2 className="section-heading font-headline-md">EARLY WARNING SIGNALS</h2>
              <a href="#" className="inline-action font-label-caps">
                VIEW ALL SIGNALS
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
            <div className="signals-list">
              {signals.map((s, i) => (
                <div key={i} className="signal-row">
                  <div className="signal-row__time font-metadata">{s.time}</div>
                  <div className={`signal-row__level font-label-caps signal-level--${s.levelClass}`}>{s.level}</div>
                  <div className="signal-row__text font-body-md">{s.text}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── RECOMMENDED INTERVENTION ── */}
          <section className="detail-section">
            <h2 className="section-heading font-headline-md">RECOMMENDED INTERVENTION</h2>
            <div className="intervention-card">
              <div>
                <span className="font-label-caps color-error">PRIORITY: IMMEDIATE</span>
                <h3 className="intervention-card__title font-headline-md">Initiate contractor performance review</h3>
                <p className="intervention-card__body font-body-lg">
                  Schedule variance has exceeded the intervention threshold for two consecutive reporting periods.
                </p>
              </div>
              <div className="intervention-card__actions">
                <button className="action-btn font-label-caps">
                  VIEW EVIDENCE
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <button className="action-btn font-label-caps">
                  CREATE INTERVENTION
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </>
  );
}
