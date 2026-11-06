import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const NotFound = ({ title = 'Page not found', text = 'The page you are looking for does not exist.', code = '404' }) => (
  <main className="grid min-h-[60vh] place-items-center px-4 text-center">
    <div>
      <p className="tnum text-6xl font-semibold text-accent">{code}</p>
      <h1 className="mt-3 text-2xl">{title}</h1>
      <p className="mt-2 text-muted">{text}</p>
      <Button asChild className="mt-6"><Link to="/">Back to dashboard</Link></Button>
    </div>
  </main>
);
export const Unauthorized = () => <NotFound code="403" title="Access denied" text="Your role does not allow this page." />;
