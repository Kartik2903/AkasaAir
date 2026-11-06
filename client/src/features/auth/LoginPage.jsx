import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField';

const schema = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Required') });
const DEMO = [
  ['Employee', 'employee@leaveflow.dev'],
  ['Manager', 'manager@leaveflow.dev'],
  ['HOD', 'hod@leaveflow.dev'],
];

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from?.pathname ?? '/';
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });
  if (user) return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async (values) => {
    try { await login(values); navigate(from, { replace: true }); }
    catch (e) { toast.error(e.message); }
  });
  const fillDemo = (email) => { setValue('email', email); setValue('password', 'Password@123'); };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <h1 className="text-2xl">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Use your work email to continue.</p>
      </div>
      <FormField label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" placeholder="you@company.com" {...register('email')} /></FormField>
      <FormField label="Password" error={errors.password?.message}><Input type="password" autoComplete="current-password" placeholder="Enter your password" {...register('password')} /></FormField>
      <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
      <div className="rounded-md border border-line bg-surface-2 p-3 text-sm">
          <p className="font-semibold">Demo accounts</p>
          <p className="mt-0.5 text-muted">Demo accounts for quick testing, since there is no public sign-up. Pick a role to fill the form. Password: Password@123</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DEMO.map(([label, email]) => <Button key={email} type="button" variant="outline" size="sm" onClick={() => fillDemo(email)}>{label}</Button>)}
          </div>
      </div>
    </form>
  );
}
