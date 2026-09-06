import { useEffect, useState } from 'react';
import { fetchProjectByCode } from '../api/projectService';
import type { ProjectSummary } from '../api/types';

interface UseProjectState {
  project: ProjectSummary | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads a single project by its projectCode.
 */
export function useProject(projectCode: string | undefined) {
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectCode) {
      setProject(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchProjectByCode(projectCode)
      .then((res) => {
        if (cancelled) return;
        setProject(res.project);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProject(null);
        setLoading(false);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load project'
        );
      });

    return () => {
      cancelled = true;
    };
  }, [projectCode]);

  return { project, loading, error } as UseProjectState;
}
