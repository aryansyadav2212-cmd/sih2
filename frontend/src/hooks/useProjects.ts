import { useCallback, useEffect, useState } from 'react';
import { fetchProjects } from '../api/projectService';
import type { ProjectSummary, ProjectFilters } from '../api/types';

interface UseProjectsState {
  projects: ProjectSummary[];
  totalProjects: number;
  loading: boolean;
  error: string | null;
  /** True when the first list with these params has not returned yet. */
}

export interface UseProjectsOptions {
  page: number;
  search: string;
  filters?: ProjectFilters;
  limit?: number;
  sort?: string;
}

/**
 * Loads the paginated project list from the backend.
 *
 * Re-fetches whenever the page, search term, sort, or any filter changes.
 * Handles loading and error states for the Project Explorer.
 */
export function useProjects(options: UseProjectsOptions) {
  const {
    page,
    search,
    filters,
    limit = 50,
    sort,
  } = options;

  const {
    ministry,
    sector,
    state: stateFilter,
    agency,
    scheduleState,
    riskLevel,
    predictionStatus,
    progressFrom,
    progressTo,
    financialFrom,
    financialTo,
    projectStage,
    attentionCategory,
  } = filters ?? {};

  const [state, setState] = useState<UseProjectsState>({
    projects: [],
    totalProjects: 0,
    loading: false,
    error: null,
  });

  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = useCallback(() => {
    setRefreshIndex((i) => i + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setState((s) => ({ ...s, loading: true, error: null }));

    fetchProjects({
      page,
      limit,
      search,
      sort,
      ministry,
      sector,
      state: stateFilter,
      agency,
      scheduleState,
      riskLevel,
      predictionStatus,
      progressFrom,
      progressTo,
      financialFrom,
      financialTo,
      projectStage,
      attentionCategory,
    })
      .then((res) => {
        if (cancelled) return;
        setState({
          projects: res.data,
          totalProjects: res.pagination.totalProjects,
          loading: false,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          projects: [],
          totalProjects: 0,
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : 'Failed to load projects',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    page,
    search,
    limit,
    sort,
    ministry,
    sector,
    stateFilter,
    agency,
    scheduleState,
    riskLevel,
    predictionStatus,
    progressFrom,
    progressTo,
    financialFrom,
    financialTo,
    projectStage,
    attentionCategory,
    refreshIndex,
  ]);

  return { ...state, refresh };
}