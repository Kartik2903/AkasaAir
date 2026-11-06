import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export function Breadcrumbs() {
  const parts = useLocation().pathname.split('/').filter(Boolean);
  const label = (p) => (/^[0-9a-f-]{36}$/.test(p) ? 'Details' : p.replace(/-/g, ' '));
  if (!parts.length) return <span className="font-semibold">Dashboard</span>;
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <Link to="/" className="text-muted hover:text-ink">Home</Link>
      {parts.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          <ChevronRight size={14} aria-hidden className="text-muted" />
          {i === parts.length - 1 ? <span className="font-semibold capitalize" aria-current="page">{label(p)}</span> : <Link to={`/${parts.slice(0, i + 1).join('/')}`} className="capitalize text-muted hover:text-ink">{label(p)}</Link>}
        </span>
      ))}
    </nav>
  );
}
