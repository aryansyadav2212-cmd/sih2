import { useEffect, useState } from 'react';
import { fetchProjectFacets } from '../api/projectService';
import type { ProjectFacets } from '../api/types';

interface UseProjectFacetsState {
  facets: ProjectFacets | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads the filter values (ministry, sector, state, agency) and ML
 * prediction coverage for the Project Explorer filter bar.
 *
 * Loaded once; filter selections are applied server-side on the list request.
 */
export function useProjectFacets(): UseProjectFacetsState {
  const [facets, setFacets] = useState<ProjectFacets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchProjectFacets()
      .then((data) => {
        if (cancelled) return;
        setFacets(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoading(false);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load project filters'
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { facets, loading, error };
}