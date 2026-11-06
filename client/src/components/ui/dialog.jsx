import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = D.Root;

export function DialogContent({ className, children, title, description, ...props }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink/40" />
      <D.Content
        className={cn('fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-line bg-surface p-6 shadow-card', className)}
        {...props}
      >
        <D.Title className="text-lg">{title}</D.Title>
        {description ? <D.Description className="mt-1 text-sm text-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
        <div className="mt-5">{children}</div>
        <D.Close aria-label="Close" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink cursor-pointer">
          <X size={18} />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}
