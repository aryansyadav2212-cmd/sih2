import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import './ProjectsPage.css';

interface Project {
  name: string;
  ministry: string;
  sector: string;
  cost: string;
  physical: number;
  financial: number;
  schedule: 'On Track' | 'Delayed' | 'Behind';
  risk: 'critical' | 'high' | 'medium' | 'low';
  status: 'ACTIVE' | 'REVIEW' | 'COMPLETED';
  slug: string;
}

const projects: Project[] = [
  {
    name: 'Integrated Freight Corridor Phase II',
    ministry: 'Min. of Transport',
    sector: 'Logistics',
    cost: '₹45.2B',
    physical: 42,
    financial: 38,
    schedule: 'Behind',
    risk: 'critical',
    status: 'ACTIVE',
    slug: 'integrated-freight-corridor-phase-ii',
  },
  {
    name: 'National Water Grid Sub-System B',
    ministry: 'Min. of Water Resources',
    sector: 'Infrastructure',
    cost: '₹12.8B',
    physical: 88,
    financial: 91,
    schedule: 'On Track',
    risk: 'low',
    status: 'ACTIVE',
    slug: 'national-water-grid-sub-system-b',
  },
  {
    name: 'Eastern Seaboard Deepwater Port',
    ministry: 'Maritime Authority',
    sector: 'Trade',
    cost: '₹105.0B',
    physical: 15,
    financial: 12,
    schedule: 'Delayed',
    risk: 'high',
    status: 'REVIEW',
    slug: 'eastern-seaboard-deepwater-port',
  },
  {
    name: 'Urban Metro Line 4 Extension',
    ministry: 'Urban Dev. Dept.',
    sector: 'Transit',
    cost: '₹22.4B',
    physical: 65,
    financial: 60,
    schedule: 'On Track',
    risk: 'medium',
    status: 'ACTIVE',
    slug: 'urban-metro-line-4-extension',
  },
  {
    name: 'National Waterway Terminal 4',
    ministry: 'Min. of Shipping',
    sector: 'Logistics',
    cost: '₹38.7B',
    physical: 18,
    financial: 35,
    schedule: 'Delayed',
    risk: 'high',
    status: 'REVIEW',
    slug: 'national-waterway-terminal-4',
  },
  {
    name: 'Ultra Mega Power Project Zonal',
    ministry: 'Min. of Power',
    sector: 'Energy',
    cost: '₹89.0B',
    physical: 89,
    financial: 99,
    schedule: 'Behind',
    risk: 'critical',
    status: 'ACTIVE',
    slug: 'ultra-mega-power-project-zonal',
  },
];

const riskColor = (risk: Project['risk']) => {
  switch (risk) {
    case 'critical': return '#ba1a1a';
    case 'high':     return '#b07b1a';
    case 'medium':   return '#45474b';
    case 'low':      return '#2e7d32';
  }
};

const scheduleColor = (s: Project['schedule']) => {
  switch (s) {
    case 'Behind':   return 'schedule--error';
    case 'Delayed':  return 'schedule--warning';
    case 'On Track': return 'schedule--ok';
  }
};

export default function ProjectsPage() {
  const [search, setSearch] = useState('');

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.ministry.toLowerCase().includes(search.toLowerCase()) ||
    p.sector.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Navbar variant="solid" />

      <main className="projects-main">
        {/* Header */}
        <header className="projects-header px-page">
          <h1 className="projects-header__title font-display-lg">PROJECTS</h1>
          <p className="projects-header__sub font-body-lg">National infrastructure project portfolio</p>
          <div className="projects-header__meta font-metadata">
            <span>1,981 PROJECTS</span>
            <span>·</span>
            <span>17 MINISTRIES</span>
            <span>·</span>
            <span>22 SECTORS</span>
          </div>
        </header>

        {/* Portfolio Strip */}
        <div className="portfolio-strip px-page">
          {[
            { label: 'Total Projects',      value: '1,981', color: '' },
            { label: 'High Risk',           value: '86',    color: 'error' },
            { label: 'Active Warnings',     value: '142',   color: 'warning' },
            { label: 'Requiring Attention', value: '327',   color: '' },
          ].map((s, i) => (
            <div key={i} className="portfolio-strip__item">
              <div className={`portfolio-strip__label font-metadata ${s.color === 'error' ? 'color-error' : s.color === 'warning' ? 'color-warning' : ''}`}>
                {s.label}
              </div>
              <div className={`portfolio-strip__value font-headline-md ${s.color === 'error' ? 'color-error' : s.color === 'warning' ? 'color-warning' : ''}`}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="controls px-page">
          <div className="controls__search-wrap">
            <span className="material-symbols-outlined controls__search-icon">search</span>
            <input
              type="text"
              className="controls__search font-body-md"
              placeholder="Search infrastructure projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="controls__filters">
            {[
              { icon: 'filter_list', label: 'Risk' },
              { icon: 'domain',      label: 'Ministry' },
              { icon: 'category',    label: 'Sector' },
              { icon: 'rule',        label: 'Status' },
              { icon: 'map',         label: 'Region' },
            ].map(f => (
              <button key={f.label} className="filter-btn font-label-caps">
                <span className="material-symbols-outlined">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap px-page">
          <table className="data-table">
            <thead>
              <tr>
                <th className="font-label-caps">Project</th>
                <th className="font-label-caps">Ministry / Sector</th>
                <th className="font-label-caps">Original Cost</th>
                <th className="font-label-caps">Physical Prog.</th>
                <th className="font-label-caps">Financial Prog.</th>
                <th className="font-label-caps">Schedule</th>
                <th className="font-label-caps">Risk</th>
                <th className="font-label-caps">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.slug}>
                  <td>
                    <Link to={`/projects/${p.slug}`} className="table-project-link font-body-md">
                      {p.name}
                    </Link>
                  </td>
                  <td>
                    <div className="font-body-md" style={{ fontSize: '14px' }}>{p.ministry}</div>
                    <div className="font-metadata color-secondary">{p.sector}</div>
                  </td>
                  <td className="font-metadata">{p.cost}</td>
                  <td className="font-body-md">{p.physical}%</td>
                  <td className="font-body-md">{p.financial}%</td>
                  <td>
                    <span className={`schedule-badge font-body-md ${scheduleColor(p.schedule)}`}>
                      {p.schedule}
                    </span>
                  </td>
                  <td>
                    <div
                      className="risk-dot"
                      style={{ background: riskColor(p.risk) }}
                      title={p.risk}
                    />
                  </td>
                  <td>
                    <span className="status-chip font-label-caps">{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination font-metadata">
            <span>Showing 1–{filtered.length} of 1,981 projects</span>
            <div className="pagination__btns">
              <button className="pagination__btn" disabled>Prev</button>
              <button className="pagination__btn">Next</button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
