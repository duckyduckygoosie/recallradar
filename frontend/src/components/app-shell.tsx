'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, ArrowUpRight, Bookmark, CircleHelp, GitCompareArrows, LayoutDashboard, Menu, Search, Siren, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { api, type HealthResponse } from '@/lib/api';
import { cn } from '@/lib/utils';

const navigation = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/search', label: 'Search explorer', icon: Search },
  { href: '/events', label: 'Events', icon: Activity },
  { href: '/recalls', label: 'Recalls', icon: Siren },
  { href: '/compare', label: 'Compare', icon: GitCompareArrows },
  { href: '/notebook', label: 'Research notebook', icon: Bookmark },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthChecked, setHealthChecked] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    let active = true;
    api.health()
      .then(value => {
        if (active) {
          setHealth(value);
          setHealthChecked(true);
        }
      })
      .catch(() => {
        if (active) {
          setHealth(null);
          setHealthChecked(true);
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!menu) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menu]);

  const sidebar = (
    <>
      <div className="flex h-[76px] items-center gap-3 border-b border-line px-6">
        <div className="grid size-9 place-items-center rounded-xl bg-teal text-[#09201e]">
          <Activity size={20} strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide">Recall<span className="text-teal">Radar</span></p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[.18em] text-muted">Device intelligence</p>
        </div>
        <button
          aria-label="Close navigation"
          className="ml-auto rounded p-2 text-slate-400 hover:text-white lg:hidden"
          onClick={() => setMenu(false)}
        >
          <X size={18} />
        </button>
      </div>
      <div className="px-4 pt-7">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400">Workspace</p>
        <nav aria-label="Main navigation" className="space-y-1">
          {navigation.map(item => {
            const Icon = item.icon;
            const selected = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenu(false)}
                aria-current={selected ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-slate-400 transition hover:bg-white/[.04] hover:text-white',
                  selected && 'bg-teal/10 font-medium text-teal',
                )}
              >
                <Icon size={17} strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4">
        <div className="rounded-xl border border-line bg-white/[.025] p-3.5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
            <CircleHelp size={15} className="text-sky" />
            Research use only
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted">
            Passive reports may be incomplete or duplicated. Report counts do not establish causality or incidence.
          </p>
          <a className="mt-2 inline-flex items-center gap-1 text-[11px] text-sky hover:text-white" href="https://open.fda.gov/apis/device/event/" target="_blank" rel="noreferrer">
            About openFDA <ArrowUpRight size={12} />
          </a>
        </div>
      </div>
    </>
  );

  const connected = healthChecked && health?.database === 'ok';
  const connectionLabel = !healthChecked ? 'Checking backend' : connected ? 'Connected' : 'Backend unavailable';

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-[#0c131b] lg:flex">
        {sidebar}
      </aside>

      {menu && (
        <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setMenu(false)}>
          <aside
            id="mobile-navigation"
            className="flex h-full w-[min(300px,84vw)] flex-col border-r border-line bg-[#0c131b]"
            onClick={event => event.stopPropagation()}
          >
            {sidebar}
          </aside>
        </div>
      )}

      <main className="min-h-screen lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[66px] items-center justify-between border-b border-line bg-[#0b1118]/90 px-5 backdrop-blur-xl md:px-8">
          <button
            aria-label={menu ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menu}
            aria-controls="mobile-navigation"
            onClick={() => setMenu(open => !open)}
            className="mr-3 rounded p-2 text-slate-400 hover:text-white lg:hidden"
          >
            <Menu size={20} />
          </button>
          <p className="text-xs text-muted">
            Research workspace <span className="mx-2 text-slate-700">/</span>
            <span className="capitalize text-slate-300">{pathname === '/' ? 'Overview' : pathname.slice(1).replace('-', ' ')}</span>
          </p>
          <div role="status" aria-live="polite" className="flex items-center gap-3">
            <span className="hidden rounded-full border border-line px-2.5 py-1 text-[10px] uppercase tracking-widest text-slate-400 sm:block">
              {health?.database === 'ok' ? health.mode : healthChecked ? 'API offline' : 'Connecting'}
            </span>
            <span className="flex items-center gap-2 text-xs text-slate-400">
              <span className={cn('size-1.5 rounded-full', connected ? 'bg-teal' : healthChecked ? 'bg-amber-400' : 'bg-slate-500')} />
              {connectionLabel}
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] px-5 py-7 md:px-8 md:py-9">
          {children}
          <footer className="mt-10 border-t border-line py-5 text-[11px] leading-5 text-slate-400">
            RecallRadar presents public reporting data for research—not clinical decision support, a safety determination, or an exposure-adjusted comparison.{' '}
            <a className="text-sky hover:text-white" href="https://open.fda.gov/" target="_blank" rel="noreferrer">
              FDA open data <ArrowUpRight className="inline" size={11} />
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}
