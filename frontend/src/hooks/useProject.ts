import { useEffect, useState } from 'react';
import { fetchProjectByCode } from '../api/projectService';
import type { ProjectHistory, ProjectSummary } from '../api/types';

interface UseProjectState {
  project: ProjectSummary | null;
  history: ProjectHistory | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads a single project by its projectCode, including its observed
 * monthly history (used by the detail page's trajectory / what-changed /
 * confidence sections).
 */
export function useProject(projectCode: string | undefined) {
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [history, setHistory] = useState<ProjectHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectCode) {
      setProject(null);
      setHistory(null);
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
        setHistory(res.history ?? null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProject(null);
        setHistory(null);
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

  return { project, history, loading, error } as UseProjectState;
}
