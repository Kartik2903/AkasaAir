import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function ConfirmDialog({ open, onClose, title, description, confirmLabel = 'Delete', onConfirm, loading }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={title} description={description}>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" disabled={loading} onClick={onConfirm}>{loading ? 'Working…' : confirmLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
