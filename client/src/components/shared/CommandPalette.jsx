import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as D from '@radix-ui/react-dialog';
import { Search, Moon, CornerDownLeft } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

// Ctrl/Cmd+K. Jump to any page the current role can open.
export function CommandPalette({ open, onOpenChange, onToggleTheme, nav = [] }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const text = useDebounce(q.trim(), 100);

  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); onOpenChange(true); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpenChange]);

  const items = useMemo(() => {
    const go = (to) => () => navigate(to);
    const base = [
      ...nav.map((n) => ({ label: `Go to ${n.label}`, icon: n.icon, run: go(n.to) })),
      { label: 'Go to Notifications', icon: Search, run: go('/notifications') },
      { label: 'Toggle dark mode', icon: Moon, run: onToggleTheme },
    ];
    return text ? base.filter((i) => i.label.toLowerCase().includes(text.toLowerCase())) : base;
  }, [text, navigate, onToggleTheme, nav]);

  const run = (item) => { onOpenChange(false); setQ(''); item?.run(); };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter') run(items[active]);
  };

  return (
    <D.Root open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQ(''); }}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <D.Content className="fixed left-1/2 top-[15vh] z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-md border border-line bg-surface shadow-card">
          <D.Title className="sr-only">Command palette</D.Title>
          <D.Description className="sr-only">Type to search commands, use arrow keys and Enter</D.Description>
          <div className="flex items-center gap-2 border-b border-line px-4">
            <Search size={16} className="text-muted" aria-hidden />
            <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKeyDown}
              placeholder="Type a command or page name" aria-label="Command" className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted" />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto p-2">
            {items.map((item, i) => (
              <li key={item.label} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => run(item)}
                className={cn('flex h-10 cursor-pointer items-center gap-3 rounded-md px-3 text-sm', i === active && 'bg-surface-2')}>
                <item.icon size={16} aria-hidden className="text-muted" /> <span className="flex-1">{item.label}</span>
                {i === active && <CornerDownLeft size={14} aria-hidden className="text-muted" />}
              </li>
            ))}
            {!items.length && <li className="px-3 py-6 text-center text-sm text-muted">No matching commands</li>}
          </ul>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
