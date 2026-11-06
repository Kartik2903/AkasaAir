import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';

// Controlled by the URL value, but typing is debounced before it propagates.
// Parent should pass key={value} if it needs to reset the text from outside (e.g. 'Clear filters').
export function SearchInput({ value = '', onChange, placeholder = 'Search', label = 'Search' }) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text, 350);
  useEffect(() => { if (debounced !== value) onChange(debounced); }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative w-full sm:w-72">
      <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <Input type="search" aria-label={label} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} className="pl-9" />
    </div>
  );
}
