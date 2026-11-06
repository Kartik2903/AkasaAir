import { useId } from 'react';
import { cloneElement } from 'react';

// Wraps any input: label, error text, aria wiring. Pass the RHF `register(...)` props to the child.
export function FormField({ label, error, hint, children }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      {cloneElement(children, { id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-err` : undefined })}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  );
}
