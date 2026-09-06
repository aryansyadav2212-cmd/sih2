import { useEffect, useState } from 'react';
import { fetchAttentionProjects } from '../api/projectService';
import type {
  AttentionResponse,
  AttentionCategoryGroup,
} from '../api/types';

interface UseAttentionProjectsState {
  categories: AttentionCategoryGroup[];
  total: number;
  loading: boolean;
  error: string | null;
}

/**
 * Loads the data-driven "Projects Requiring Attention" surface from the
 * backend, split into three product categories (INTERVENTION REQUIRED /
 * MONITOR / CLOSURE WATCH). Category membership is independent of the
 * model's deadline-revision probability (the model is unchanged).
 */
export function useAttentionProjects(): UseAttentionProjectsState {
  const [state, setState] = useState<UseAttentionProjectsState>({
    categories: [],
    total: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetchAttentionProjects()
      .then((res: AttentionResponse) => {
        if (cancelled) return;
        setState({
          categories: res.categories,
          total: res.total,
          loading: false,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          categories: [],
          total: 0,
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : 'Failed to load projects requiring attention',
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
