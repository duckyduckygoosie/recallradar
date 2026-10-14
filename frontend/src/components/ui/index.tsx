'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
export { Button };

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('h-11 w-full rounded-lg border border-line bg-[#0c141c] px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-teal/60 focus:ring-2 focus:ring-teal/20', className)} {...props} />;
}
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-xl border border-line bg-panel/80 p-5 shadow-[0_12px_40px_rgba(0,0,0,.12)]', className)}>{children}</section>;
}
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div role="status" aria-live="polite" className="grid min-h-48 place-items-center rounded-lg border border-dashed border-line px-5 text-center"><div><p className="font-medium text-slate-200">{title}</p><p className="mt-2 max-w-md text-sm leading-6 text-muted">{children}</p></div></div>;
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-200"><span>{message}</span>{retry && <Button onClick={retry}>Try again</Button>}</div>;
}
export function Skeleton({ className }: { className?: string }) { return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-white/[0.06]', className)} />; }
