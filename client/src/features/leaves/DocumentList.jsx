import { FileText, Image, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { leaveApi } from '@/services/api';
import { formatDateTime } from '@/lib/utils';

const size = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// Downloads go through the authenticated API (cookie), never a public URL.
async function download(leaveId, doc) {
  try {
    const blob = await leaveApi.download(leaveId, doc.id);
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: doc.originalName });
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) { toast.error(e.message || 'Download failed'); }
}

export function DocumentList({ leaveId, documents }) {
  if (!documents.length) return <p className="text-sm text-muted">No documents attached.</p>;
  return (
    <ul className="divide-y divide-line rounded-md border border-line">
      {documents.map((d) => {
        const Icon = d.mimeType === 'application/pdf' ? FileText : Image;
        return (
          <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
            <Icon size={18} aria-hidden className="shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{d.originalName}</p>
              <p className="tnum text-xs text-muted">{size(d.fileSize)} · {d.uploadedBy.name} · {formatDateTime(d.createdAt)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => download(leaveId, d)} aria-label={`Download ${d.originalName}`}><Download size={15} aria-hidden /> Download</Button>
          </li>
        );
      })}
    </ul>
  );
}
