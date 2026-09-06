import { apiRequest } from './client';
import type {
  ProjectFilters,
  ProjectListResponse,
  ProjectDetailResponse,
  ProjectFacets,
  PortfolioStats,
  ProjectSort,
  AttentionResponse,
} from './types';

/**
 * Fetches a paginated list of projects, optionally filtered by free-text
 * search, structured filters (ministry, sector, state, agency, schedule
 * state, risk level, prediction availability, progress/financial ranges)
 * and a presentation sort.
 */
export function fetchProjects(params?: {
  page?: number;
  limit?: number;
  search?: string;
  sort?: ProjectSort | string;
} & ProjectFilters): Promise<ProjectListResponse> {
  const query = new URLSearchParams();

  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.sort) query.set('sort', params.sort);
  if (params?.ministry) query.set('ministry', params.ministry);
  if (params?.sector) query.set('sector', params.sector);
  if (params?.state) query.set('state', params.state);
  if (params?.agency) query.set('agency', params.agency);
  if (params?.scheduleState) query.set('scheduleState', params.scheduleState);
  if (params?.riskLevel) query.set('riskLevel', params.riskLevel);
  if (params?.predictionStatus)
    query.set('predictionStatus', params.predictionStatus);
  if (params?.progressFrom !== undefined)
    query.set('progressFrom', String(params.progressFrom));
  if (params?.progressTo !== undefined)
    query.set('progressTo', String(params.progressTo));
  if (params?.financialFrom !== undefined)
    query.set('financialFrom', String(params.financialFrom));
  if (params?.financialTo !== undefined)
    query.set('financialTo', String(params.financialTo));
  if (params?.projectStage)
    query.set('projectStage', params.projectStage);
  if (params?.attentionCategory)
    query.set('attentionCategory', params.attentionCategory);

  const qs = query.toString();

  return apiRequest<ProjectListResponse>(
    `/projects${qs ? `?${qs}` : ''}`
  );
}

/**
 * Fetches the "Projects Requiring Attention" surface, split into the three
 * product categories (INTERVENTION REQUIRED / MONITOR / CLOSURE WATCH).
 * Category membership is independent of the model's deadline-revision
 * probability (the model is unchanged).
 */
export function fetchAttentionProjects(): Promise<AttentionResponse> {
  return apiRequest<AttentionResponse>(`/projects/attention`);
}

/**
 * Fetches the distinct filter values (ministry, sector, state, agency) plus
 * ML prediction coverage for the Explorer filter dropdowns.
 */
export function fetchProjectFacets(): Promise<ProjectFacets> {
  return apiRequest<ProjectFacets>(`/projects/facets`);
}

/**
 * Fetches portfolio-level aggregates for the national situation overview.
 */
export function fetchPortfolioStats(): Promise<PortfolioStats> {
  return apiRequest<PortfolioStats>(`/projects/stats`);
}

/**
 * Fetches a single project by its PAIMANA projectCode.
 */
export function fetchProjectByCode(
  projectCode: string
): Promise<ProjectDetailResponse> {
  return apiRequest<ProjectDetailResponse>(
    `/projects/${encodeURIComponent(projectCode)}`
  );
}