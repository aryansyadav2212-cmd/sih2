import { useEffect, useState } from 'react';
import { fetchPortfolioStats } from '../api/projectService';
import type { PortfolioStats } from '../api/types';

interface UsePortfolioStatsState {
  stats: PortfolioStats | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads portfolio-level aggregates for the national situation overview.
 */
export function usePortfolioStats(): UsePortfolioStatsState {
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchPortfolioStats()
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoading(false);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load portfolio statistics'
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading, error };
}