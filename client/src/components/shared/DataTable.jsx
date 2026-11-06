import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from './states';
import { cn } from '@/lib/utils';

/**
 * columns: [{ key, header, sortable?, cell?(row), className? }]
 * Handles loading skeleton, error and empty states so feature pages only pass data.
 */
export function DataTable({ columns, rows, loading, error, onRetry, empty, sort, onSort, rowKey = (r) => r.id }) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!loading && rows?.length === 0) return empty;

  const ariaSort = (c) => (sort?.by === c.key ? (sort.order === 'asc' ? 'ascending' : 'descending') : c.sortable ? 'none' : undefined);
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line text-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" aria-sort={ariaSort(c)} className={cn('px-4 py-3 font-semibold', c.className)}>
                {c.sortable ? (
                  <button className="-ml-1 inline-flex h-9 items-center gap-1 px-1 hover:text-ink cursor-pointer" onClick={() => onSort(c.key)}>
                    {c.header}
                    {sort?.by === c.key ? (sort.order === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ChevronsUpDown size={14} className="opacity-50" />}
                  </button>
                ) : c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && !rows?.length
            ? Array.from({ length: 6 }, (_, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {columns.map((c) => <td key={c.key} className="px-4 py-3.5"><Skeleton className="h-4 w-4/5" /></td>)}
                </tr>
              ))
            : rows.map((r) => (
                <tr key={rowKey(r)} className="border-b border-line fade duration-150 last:border-0 hover:bg-surface-2">
                  {columns.map((c) => <td key={c.key} className={cn('px-4 py-3', c.className)}>{c.cell ? c.cell(r) : r[c.key]}</td>)}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
