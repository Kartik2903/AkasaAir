import { useId } from 'react';
import { Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
const MAX = 5 * 1024 * 1024;

// Client-side limits are a convenience only: the server re-validates size and the real file signature.
export function FilePicker({ files, onChange, error }) {
  const id = useId();
  const add = (list) => {
    const picked = [...list];
    const tooBig = picked.find((f) => f.size > MAX);
    if (tooBig) return onChange(files, `"${tooBig.name}" is larger than 5 MB`);
    onChange([...files, ...picked].slice(0, 5));
  };
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">Supporting documents</label>
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-field bg-surface px-3 py-3 text-sm text-muted transition-colors duration-150 hover:bg-surface-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
        <Paperclip size={16} aria-hidden /> Choose PDF, JPG or PNG files (5 MB each, up to 5)
        <input id={id} type="file" multiple accept={ACCEPT} className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </label>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-1.5 text-sm">
              <span className="truncate">{f.name}</span>
              <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((_, j) => j !== i))}><X size={14} /></Button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  );
}
