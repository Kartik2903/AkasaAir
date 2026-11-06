import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

// List state (page/search/filters/sort) lives in the URL: shareable, back-button friendly.
export function useListParams(defaults = {}) {
  const [sp, setSp] = useSearchParams();
  const params = useMemo(() => {
    const p = { page: 1, limit: 10, ...defaults, ...Object.fromEntries(sp) };
    p.page = Number(p.page) || 1;
    return p;
  }, [sp, defaults]);

  const set = useCallback((patch, { resetPage = true } = {}) => {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries({ ...patch, ...(resetPage && !('page' in patch) && { page: 1 }) }).forEach(([k, v]) =>
        v === '' || v == null ? next.delete(k) : next.set(k, v));
      return next;
    }, { replace: true });
  }, [setSp]);

  return [params, set];
}
