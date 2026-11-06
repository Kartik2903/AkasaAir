import { cn } from '@/lib/utils';

export const Card = ({ className, ...p }) => <div className={cn('rounded-md border border-line bg-surface shadow-card', className)} {...p} />;
