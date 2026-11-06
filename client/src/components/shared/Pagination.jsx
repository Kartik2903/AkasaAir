import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Pagination({ meta, onPage }) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
      <p className="tnum text-muted">{from}–{to} of {meta.total}</p>
      <div className="flex items-center gap-2">
        <span className="tnum text-muted">Page {meta.page} of {meta.totalPages}</span>
        <Button variant="outline" size="icon" aria-label="Previous page" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}><ChevronLeft size={16} /></Button>
        <Button variant="outline" size="icon" aria-label="Next page" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}><ChevronRight size={16} /></Button>
      </div>
    </nav>
  );
}
