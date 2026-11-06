import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilePicker } from './FilePicker';
import { useCreateLeave, usePreview } from './hooks';
import { toIsoDay } from '@/lib/utils';

const schema = z.object({
  fromDate: z.string().min(1, 'Choose a start date'),
  toDate: z.string().min(1, 'Choose an end date'),
  reason: z.string().trim().min(5, 'Give a short reason (5+ characters)').max(500),
});

// The panel only displays what the server's /leaves/preview returns: no business rules live in React.
function PreviewPanel({ preview, loading, hasDates, filesCount }) {
  if (!hasDates) return <p className="text-sm text-muted">Pick your dates to see how this request will be handled.</p>;
  if (!preview) return <p className="text-sm text-muted">{loading ? 'Checking…' : 'Preview unavailable.'}</p>;
  const missingDoc = preview.requiresDocument && filesCount === 0;
  return (
    <div className="space-y-3" aria-live="polite">
      {preview.valid && preview.days ? (
        <p className="tnum text-3xl font-semibold">{preview.days}<span className="ml-1.5 text-base font-medium text-muted">{preview.days === 1 ? 'working day' : 'working days'}</span></p>
      ) : null}
      <ul className="space-y-2 text-sm">
        {preview.messages.map((m, i) => {
          const bad = !preview.valid && (i === preview.messages.length - 1 || preview.messages.length === 1);
          const Icon = bad ? AlertTriangle : Info;
          return <li key={i} className={`flex gap-2 ${bad ? 'text-bad' : ''}`}><Icon size={16} className="mt-0.5 shrink-0" aria-hidden />{m}</li>;
        })}
      </ul>
      {preview.approvers && (
        <ol className="space-y-1.5 border-t border-line pt-3 text-sm">
          {preview.approvers.map((a) => <li key={a.stage}><span className="text-muted">{a.stage === 'MANAGER' ? 'Manager' : 'HOD'}:</span> <span className="font-semibold">{a.name}</span></li>)}
        </ol>
      )}
      {missingDoc && <p className="flex gap-2 text-sm text-warn"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />Attach a document before you submit.</p>}
      {preview.valid && !missingDoc && <p className="flex gap-2 text-sm text-ok"><CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden />Ready to submit.</p>}
    </div>
  );
}

export default function ApplyPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const create = useCreateLeave();
  const { register, handleSubmit, control, setError, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { fromDate: '', toDate: '', reason: '' } });
  const [fromDate, toDate] = useWatch({ control, name: ['fromDate', 'toDate'] });
  const { data: preview, isFetching } = usePreview(fromDate, toDate);

  const canSubmit = preview?.valid && !(preview.requiresDocument && files.length === 0) && !create.isPending;
  const onSubmit = handleSubmit((v) =>
    create.mutate({ ...v, files }, {
      onSuccess: (res) => navigate(`/requests/${res.data.id}`),
      onError: (e) => e.fieldErrors?.forEach(({ field, message }) => (field === 'documents' ? setFileError(message) : setError(field.replace('body.', ''), { message }))),
    }));

  return (
    <>
      <PageHeader title="Apply for leave" description="Choose your dates. The panel on the right shows who needs to approve and what you must attach." />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="p-6">
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="From" error={errors.fromDate?.message}><Input type="date" min={toIsoDay(new Date())} {...register('fromDate')} /></FormField>
              <FormField label="To" error={errors.toDate?.message}><Input type="date" min={fromDate || toIsoDay(new Date())} {...register('toDate')} /></FormField>
            </div>
            <FormField label="Reason" error={errors.reason?.message}>
              <textarea rows={4} className="w-full rounded-md border border-field bg-surface px-3 py-2 text-sm aria-[invalid=true]:border-bad" {...register('reason')} />
            </FormField>
            <FilePicker files={files} error={fileError} onChange={(f, err) => { setFiles(f); setFileError(err ?? ''); }} />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" disabled={!canSubmit}>{create.isPending ? 'Submitting…' : 'Submit request'}</Button>
            </div>
          </form>
        </Card>
        <Card className="h-fit p-6 lg:sticky lg:top-20">
          <h2 className="mb-4 text-base">Request summary</h2>
          <PreviewPanel preview={preview} loading={isFetching} hasDates={!!(fromDate && toDate)} filesCount={files.length} />
        </Card>
      </div>
    </>
  );
}
