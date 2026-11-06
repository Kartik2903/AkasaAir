import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold fade duration-150 cursor-pointer disabled:cursor-not-allowed disabled:bg-surface-2! disabled:text-muted! disabled:border-line!',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-ink hover:brightness-110 active:brightness-95',
        outline: 'border border-line bg-surface text-ink hover:bg-surface-2',
        ghost: 'text-ink hover:bg-surface-2',
        danger: 'bg-bad text-surface hover:brightness-110',
      },
      size: { default: 'h-10 px-4', sm: 'h-9 px-3', icon: 'h-10 w-10' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export function Button({ className, variant, size, asChild, ...props }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
