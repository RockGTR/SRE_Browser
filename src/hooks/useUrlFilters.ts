import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useUrlFilters() {
  const [params, setParams] = useSearchParams();
  const get = useCallback((key: string, fallback = '') => params.get(key) ?? fallback, [params]);
  const set = useCallback((key: string, value: string) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (!value) next.delete(key); else next.set(key, value);
      return next;
    }, { replace: true });
  }, [setParams]);
  const reset = useCallback(() => setParams({}, { replace: true }), [setParams]);
  return { get, set, reset, params };
}
