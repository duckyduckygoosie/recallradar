import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-line bg-panel px-4 text-slate-200 hover:border-teal/60 hover:text-white',
        secondary: 'border-sky/20 bg-sky/10 px-4 text-sky-100 hover:bg-sky/15',
        outline: 'border-line bg-transparent px-4 text-slate-200 hover:border-teal/60 hover:text-white',
        ghost: 'border-transparent bg-transparent px-3 text-slate-300 hover:bg-white/[.04] hover:text-white',
        destructive: 'border-rose-400/25 bg-rose-400/10 px-4 text-rose-200 hover:bg-rose-400/15',
        link: 'border-transparent bg-transparent px-0 text-sky underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-lg px-6',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Component = asChild ? Slot : 'button';
    return <Component className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
