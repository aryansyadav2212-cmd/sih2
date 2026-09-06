import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import { useProjects } from '../../hooks/useProjects';
import { useProjectFacets } from '../../hooks/useProjectFacets';
import { usePortfolioStats } from '../../hooks/usePortfolioStats';
import {
  riskLevelLabelFor,
  scheduleStateLabelFor,
} from '../../utils/labels';
import type {
  ProjectFilters,
  ProjectSort,
  ProjectSummary,
  ScheduleState,
  AttentionCategory,
} from '../../api/types';
import './ProjectsPage.css';

const PAGE_SIZE = 50;

const scheduleColour = (s: ScheduleState | null): string => {
  switch (s) {
    case 'behind':
    case 'overdue_incomplete':
    case 'regressing':
      return 'schedule--error';
    case 'on_track':
    case 'completed':
      return 'schedule--ok';
    case 'stalled':
      return 'schedule--warning';
    default:
      return 'schedule--neutral';
  }
};

/**
 * Formats a cost value (₹ crore).
 * Returns a formatted string or null when the value is missing.
 */
function formatCost(value: number | null): string | null {
  if (value === null || Number.isNaN(value)) return null;
  if (value >= 10000) return `₹${(value / 1000).toFixed(1)}K Cr`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K Cr`;
  return `₹${value.toFixed(1)} Cr`;
}

/**
 * Financial progress derived from cumulative expenditure vs original cost.
 * Presentation only — not a model prediction. Returns null when data is
 * missing or the denominator is zero.
 */
function financialProgress(p: ProjectSummary): number | null {
  if (
    p.cumulativeExpenditure === null ||
    p.originalCost === null ||
    p.originalCost === 0
  ) {
    return null;
  }
  const ratio = (p.cumulativeExpenditure / p.originalCost) * 100;
  return Math.min(100, Math.max(0, ratio));
}

function useDebounced(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

interface FilterSelectProps {
  label: string;
  value: string | undefined;
  options: { value: string; count: number }[];
  onSelect: (value: string | undefined) => void;
}

type FilterKey =
  | 'ministry'
  | 'sector'
  | 'state'
  | 'agency'
  | 'scheduleState'
  | 'riskLevel'
  | 'predictionStatus'
  | 'projectStage'
  | 'attentionCategory';

/**
 * A single filter dropdown. Rendered as an editorial <select>, backed by
 * distinct values counted on the server from real observation data.
 */
function FilterSelect({
  label,
  value,
  options,
  onSelect,
}: FilterSelectProps) {
  return (
    <label className="filter-select font-metadata">
      <span className="filter-select__label">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onSelect(e.target.value || undefined)}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.value} ({o.count})
          </option>
        ))}
      </select>
    </label>
  );
}

const SORT_OPTIONS: { value: ProjectSort; label: string }[] = [
  { value: 'risk', label: 'Revision Outlook (Highest First)' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'progress', label: 'Completion (High First)' },
  { value: 'financial', label: 'Financial Progress (High First)' },
  { value: 'cost', label: 'Original Cost (High First)' },
  { value: 'deadline', label: 'Time Remaining (Most Urgent First)' },
];

export default function ProjectsPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ProjectSort>('risk');
  const [ministry, setMinistry] = useState<string | undefined>();
  const [sector, setSector] = useState<string | undefined>();
  const [state, setState] = useState<string | undefined>();
  const [agency, setAgency] = useState<string | undefined>();
  const [scheduleState, setScheduleState] = useState<string | undefined>();
  const [riskLevel, setRiskLevel] = useState<string | undefined>(() => {
    const fromUrl = searchParams.get('riskLevel');
    return fromUrl === 'high' || fromUrl === 'medium' || fromUrl === 'low'
      ? fromUrl
      : undefined;
  });
  const [predictionStatus, setPredictionStatus] = useState<string | undefined>();
  const [projectStage, setProjectStage] = useState<
    'closure_watch' | 'normal_execution' | 'unknown' | undefined
  >(() => {
    const fromUrl = searchParams.get('projectStage');
    return fromUrl === 'closure_watch' ||
      fromUrl === 'normal_execution' ||
      fromUrl === 'unknown'
      ? fromUrl
      : undefined;
  });
  const [attentionCategory, setAttentionCategory] = useState<
    Exclude<AttentionCategory, null> | undefined
  >(() => {
    const fromUrl = searchParams.get('attentionCategory');
    return fromUrl === 'intervention_required' ||
      fromUrl === 'monitor' ||
      fromUrl === 'closure_watch'
      ? fromUrl
      : undefined;
  });
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const debouncedSearch = useDebounced(search);

  const { facets } = useProjectFacets();
  const { stats } = usePortfolioStats();

  const invalidPredictionStatus =
    predictionStatus !== 'predicted' && predictionStatus !== 'unavailable';

  const filters: ProjectFilters = {
    ministry,
    sector,
    state,
    agency,
    scheduleState,
    riskLevel: riskLevel as 'low' | 'medium' | 'high' | undefined,
    predictionStatus: invalidPredictionStatus ? undefined : predictionStatus,
    projectStage,
    attentionCategory,
  };

  const { projects, totalProjects, loading, error } = useProjects({
    page,
    search: debouncedSearch,
    filters,
    limit: PAGE_SIZE,
    sort,
  });

  const totalPages = Math.max(1, Math.ceil(totalProjects / PAGE_SIZE));

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(
      filterCount([
        ministry,
        sector,
        state,
        agency,
        scheduleState,
        riskLevel,
        predictionStatus,
        projectStage,
        attentionCategory,
      ])
    );

  const hasGeoFilters = Boolean(
      filterCount([ministry, sector, state, agency])
    );

  const summary = facets?.predictionSummary;
  const highCount =
    facets?.riskLevels.find((r) => r.value === 'high')?.count ?? null;
  const interventionCount =
    facets?.attentionCategories.find((c) => c.value === 'intervention_required')?.count ?? null;
  const latestMonth = stats?.latestReportMonths[0]?.value ?? null;

  const clearFilters = () => {
    setMinistry(undefined);
    setSector(undefined);
    setState(undefined);
    setAgency(undefined);
    setScheduleState(undefined);
    setRiskLevel(undefined);
    setPredictionStatus(undefined);
    setProjectStage(undefined);
    setAttentionCategory(undefined);
    setSearch('');
    setPage(1);
  };

  const setFilter = (
    key: FilterKey,
    value: string | undefined
  ) => {
    const setters: Record<FilterKey, (value: string | undefined) => void> = {
      ministry: setMinistry,
      sector: setSector,
      state: setState,
      agency: setAgency,
      scheduleState: setScheduleState,
      riskLevel: setRiskLevel,
      predictionStatus: setPredictionStatus,
      projectStage: (v) =>
        setProjectStage(
          v as 'closure_watch' | 'normal_execution' | 'unknown' | undefined
        ),
      attentionCategory: (v) =>
        setAttentionCategory(v as Exclude<AttentionCategory, null> | undefined),
    };
    setters[key](value);
    setPage(1);
  };

  return (
    <>
      <Navbar variant="solid" />

      <main className="projects-main">
        {/* Dark intro band (~30% dark anchor) */}
        <header className="projects-band">
          <div className="projects-band__inner px-page">
            <div className="projects-band__kicker font-label-caps">
              TRACE · NATIONAL PROJECT PORTFOLIO
            </div>
            <h1 className="projects-band__title font-display-lg">PROJECTS</h1>
            <p className="projects-band__sub font-body-lg">
              {totalProjects.toLocaleString()} infrastructure projects under review
            </p>
            <div className="projects-band__meta font-label-caps">
              <span>PAIMANA HISTORICAL CATALOG</span>
              {hasActiveFilters && (
                <>
                  <span>·</span>
                  <span>FILTERED</span>
                </>
              )}
              {latestMonth && (
                <>
                  <span>·</span>
                  <span>LATEST REPORT {latestMonth}</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Portfolio summary (real backend aggregates) */}
        <div className="portfolio-strip px-page">
          {[
            { label: 'All Projects', value: (summary?.total ?? totalProjects).toLocaleString(), color: '' },
            { label: 'TRACE Outlook Available', value: summary?.predicted?.toLocaleString() ?? '—', color: '' },
            { label: 'High Revision Outlook', value: highCount?.toLocaleString() ?? '—', color: 'error' },
            { label: 'Requires Review', value: interventionCount?.toLocaleString() ?? '—', color: '' },
          ].map((s, i) => (
            <div key={i} className="portfolio-strip__item">
              <div className={`portfolio-strip__label font-label-caps ${s.color === 'error' ? 'color-error' : ''}`}>
                {s.label}
              </div>
              <div className={`portfolio-strip__value font-headline-md ${s.color === 'error' ? 'color-error' : ''}`}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="controls px-page">
          <div className="controls__group controls__group--search">
            <span className="controls__group-label font-label-caps">Search</span>
            <div className="controls__search-wrap">
              <span className="material-symbols-outlined controls__search-icon">search</span>
              <input
                type="text"
                className="controls__search font-body-md"
                placeholder="Search by name, code, agency, ministry, state..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="controls__group controls__group--action">
            <label className="filter-select filter-select--sort font-metadata">
              <span className="filter-select__label">Sort</span>
              <select value={sort} onChange={(e) => { setSort(e.target.value as ProjectSort); setPage(1); }}>
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="filter-btn font-label-caps"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              title="Clear all filters, search, and sort"
            >
              <span className="material-symbols-outlined">filter_alt_off</span>
              Clear
            </button>
          </div>
        </div>

        {/* Filter Bar (priority: attention, stage, schedule, outlook, coverage) */}
        <div className="filter-bar-wrap px-page">
          <div className="filter-bar__header">
            <span className="controls__group-label font-label-caps">Filters</span>
            <span className="filter-bar__hint font-metadata">
              Attention · Stage · Schedule · Outlook · Prediction
            </span>
          </div>
          <div className="filter-bar">
            <FilterSelect
              label="Attention"
              value={attentionCategory}
              options={facets?.attentionCategories ?? []}
              onSelect={(v) => setFilter('attentionCategory', v)}
            />
            <FilterSelect
              label="Project Stage"
              value={projectStage}
              options={facets?.projectStages ?? []}
              onSelect={(v) => setFilter('projectStage', v)}
            />
            <FilterSelect
              label="Schedule"
              value={scheduleState}
              options={facets?.scheduleStates ?? []}
              onSelect={(v) => setFilter('scheduleState', v)}
            />
            <FilterSelect
              label="Deadline Revision Outlook"
              value={riskLevel}
              options={facets?.riskLevels ?? []}
              onSelect={(v) => setFilter('riskLevel', v)}
            />
            <FilterSelect
              label="Prediction Availability"
              value={predictionStatus}
              options={[
                { value: 'predicted', count: summary?.predicted ?? 0 },
                { value: 'unavailable', count: summary?.unavailable ?? 0 },
              ]}
              onSelect={(v) => setFilter('predictionStatus', v)}
            />
            <button
              className={`more-filters font-label-caps ${hasGeoFilters ? 'more-filters--active' : ''}`}
              onClick={() => setShowMoreFilters((s) => !s)}
              aria-expanded={showMoreFilters}
            >
              <span className="material-symbols-outlined">
                {showMoreFilters ? 'expand_less' : 'expand_more'}
              </span>
              Ministry / Sector / State / Agency
            </button>
          </div>
        </div>

        {/* Grouped geography / agency filters (kept for the full portfolio view) */}
        {showMoreFilters && (
          <div className="filter-bar filter-bar--more px-page font-metadata">
            <FilterSelect
              label="Ministry"
              value={ministry}
              options={facets?.ministries ?? []}
              onSelect={(v) => setFilter('ministry', v)}
            />
            <FilterSelect
              label="Sector"
              value={sector}
              options={facets?.sectors ?? []}
              onSelect={(v) => setFilter('sector', v)}
            />
            <FilterSelect
              label="State"
              value={state}
              options={facets?.states ?? []}
              onSelect={(v) => setFilter('state', v)}
            />
            <FilterSelect
              label="Agency"
              value={agency}
              options={facets?.agencies ?? []}
              onSelect={(v) => setFilter('agency', v)}
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="table-wrap px-page">
            <p className="controls-loading font-body-md">Loading projects...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="table-wrap px-page">
            <p className="controls-error font-body-md">⚠ {error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && projects.length === 0 && (
          <div className="table-wrap px-page">
            <p className="controls-loading font-body-md">
              No projects match the selected filters.
              {hasActiveFilters && (
                <button className="pagination__btn controls-empty-action" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </p>
            {hasActiveFilters && (
              <p className="font-metadata color-secondary" style={{ marginTop: -12 }}>
                Projects with no reported deadline-revision data are excluded from "predicted" results, but remain searchable.
              </p>
            )}
          </div>
        )}

        {/* Table */}
        {!loading && !error && projects.length > 0 && (
          <div className="table-wrap px-page">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="font-label-caps">Project</th>
                  <th className="font-label-caps">Ministry · Agency</th>
                  <th className="font-label-caps">Original Cost</th>
                  <th className="font-label-caps">Completion</th>
                  <th className="font-label-caps">Financial Progress</th>
                  <th className="font-label-caps">Schedule</th>
                  <th className="font-label-caps">Project Stage</th>
                  <th className="font-label-caps">Deadline Revision Outlook</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => {
                  const fin = financialProgress(p);
                  const schedule = scheduleStateLabelFor(p.scheduleState);
                  const outlook = riskLevelLabelFor(p.riskLevel);
                  const predicted = p.predictionStatus === 'predicted';
                  const unavailableReason =
                    p.predictionStatus === 'unavailable' && p.predictionReason
                      ? p.predictionReason
                      : p.predictionStatus === null
                        ? 'Prediction service unreachable right now'
                        : undefined;
                  return (
                    <tr key={p.projectCode}>
                      <td>
                        <Link to={`/projects/${encodeURIComponent(p.projectCode)}`} className="table-project-link font-body-md">
                          {p.projectName}
                        </Link>
                        <div className="font-metadata color-secondary" style={{ marginTop: 4 }}>
                          #{p.projectCode}
                        </div>
                      </td>
                      <td>
                        <div className="font-body-md" style={{ fontSize: '14px' }}>{p.ministry ?? '—'}</div>
                        <div className="font-metadata color-secondary">{p.sector ?? '—'}</div>
                        {p.agency && (
                          <div className="font-metadata" style={{ color: 'var(--color-on-surface-variant)', marginTop: 2 }}>
                            {p.agency}
                          </div>
                        )}
                      </td>
                      <td className="font-metadata">{formatCost(p.originalCost) ?? '—'}</td>
                      <td className="font-body-md">{p.physicalProgress !== null ? `${p.physicalProgress}%` : '—'}</td>
                      <td className="font-body-md">{fin !== null ? `${fin.toFixed(1)}%` : '—'}</td>
                      <td>
                        {schedule ? (
                          <span className={`schedule-badge font-body-md ${scheduleColour(p.scheduleState)}`}>
                            {schedule}
                          </span>
                        ) : (
                          <span
                            className="font-metadata color-secondary"
                            title={unavailableReason}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        {p.projectStage === 'closure_watch' ? (
                          <span className="stage-badge stage-badge--closure font-label-caps">
                            Closure Watch
                          </span>
                        ) : (
                          <span className="font-metadata color-secondary">
                            {p.projectStage === 'normal_execution'
                              ? 'Normal Execution'
                              : '—'}
                          </span>
                        )}
                      </td>
                      <td>
                        {predicted ? (
                          <span
                            className="outlook-cell"
                            title={`Estimated ${p.probability !== null ? (p.probability * 100).toFixed(1) : '—'}% likelihood that the reported completion deadline will be revised next month`}
                          >
                            <span className="outlook-cell__pct font-body-md">
                              {p.probability !== null ? `${(p.probability * 100).toFixed(1)}%` : '—'}
                            </span>
                            {outlook && (
                              <span className={`risk-level risk-level--${p.riskLevel} font-label-caps`}>
                                {outlook}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span
                            className="font-metadata color-secondary"
                            title={unavailableReason}
                          >
                            Unavailable
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="pagination font-metadata">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalProjects)} of {totalProjects.toLocaleString()} projects
              </span>
              <div className="pagination__btns">
                <button className="pagination__btn" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                <span className="pagination__current">Page {page} of {totalPages}</span>
                <button className="pagination__btn" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

function filterCount(values: Array<string | undefined>): number {
  return values.filter((v) => Boolean(v)).length;
}