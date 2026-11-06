import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDecision } from './hooks';

const COPY = {
  approve: { title: 'Approve this request?', hint: 'Optional note for the employee', confirm: 'Approve', required: false, variant: 'default' },
  reject: { title: 'Reject this request', hint: 'Explain the decision (required)', confirm: 'Reject request', required: true, variant: 'danger' },
  'request-info': { title: 'Request more information', hint: 'What does the employee need to provide? (required)', confirm: 'Send request', required: true, variant: 'default' },
};

export function DecisionDialog({ leaveId, action, onClose }) {
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);
  const mutation = useDecision(leaveId);
  const copy = COPY[action ?? 'approve'];

  const short = copy.required && comment.trim().length < 5;
  const submit = (e) => {
    e.preventDefault(); setTouched(true);
    if (short) return;
    mutation.mutate({ action, comment: comment.trim() || undefined }, { onSuccess: onClose });
  };

  return (
    <Dialog open={!!action} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={copy.title}>
        <form onSubmit={submit} noValidate>
          <label htmlFor="decision-comment" className="mb-1.5 block text-sm font-semibold">{copy.hint}</label>
          <textarea id="decision-comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} aria-invalid={touched && short}
            className="w-full rounded-md border border-field bg-surface px-3 py-2 text-sm aria-[invalid=true]:border-bad" />
          {touched && short && <p role="alert" className="mt-1 text-xs text-bad">Please write at least 5 characters.</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant={copy.variant} disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : copy.confirm}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
