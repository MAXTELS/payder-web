'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { LogoutButton } from './LogoutButton';
import { api } from '@/lib/api-client';

export interface SidebarNavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  /** Renders this item as a plain, unclickable row with a "Coming soon"
   *  pill instead of a Link — for a feature that's visible on the menu
   *  (so people know it's planned) but not built yet. Never navigates,
   *  never highlights as active, has no href behavior at all. */
  disabled?: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: 'Customer',
  ADMIN: 'Admin',
  CUSTOMER_CARE: 'Customer care',
  BILLER: 'Biller',
};

/**
 * Shared nav shell for every role-gated area (customer/admin/care) so the
 * three portals feel like one product instead of three prototypes. `theme`
 * swaps the palette only — structure and behavior (active-link highlight,
 * greeting, logout) are identical everywhere.
 *
 * Responsive: at `md` and above this renders as the original always-visible
 * `w-64` static sidebar. Below `md` (phones/small tablets) that static
 * sidebar is hidden entirely — a fixed w-64 column left no room for page
 * content on a narrow screen — and replaced with a slim top bar plus a
 * hamburger-triggered slide-in drawer carrying the exact same nav content.
 */
export function Sidebar({
  nav,
  theme = 'light',
  title = 'PAYDER',
}: {
  nav: SidebarNavItem[];
  theme?: 'light' | 'dark';
  title?: string;
}) {
  const pathname = usePathname();
  const isDark = theme === 'dark';
  const [me, setMe] = useState<{ firstName: string; lastName: string; role: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    api.me().then(setMe).catch(() => setMe(null));
  }, []);

  // Close the mobile drawer on every route change, so navigating never
  // leaves it open over the new page.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Pending-manual-funding notifier: only relevant to whichever portal
  // actually has a "Wallet funding" tab (admin) — nothing polls or renders
  // for customer/care, since their nav never contains this href.
  const fundingHref = '/admin/wallet-funding';
  const hasFundingTab = nav.some((item) => item.href === fundingHref);
  const [pendingFunding, setPendingFunding] = useState<
    { count: number; oldestSubmittedAt: string } | null
  >(null);

  useEffect(() => {
    if (!hasFundingTab) return;
    let cancelled = false;
    function poll() {
      api
        .adminWalletFundingQueue('PENDING')
        .then((rows) => {
          if (cancelled) return;
          setPendingFunding(
            rows.length > 0
              ? { count: rows.length, oldestSubmittedAt: rows[rows.length - 1].submittedAt }
              : { count: 0, oldestSubmittedAt: '' },
          );
        })
        .catch(() => {
          /* transient — keep showing whatever we last had rather than flicker the badge off */
        });
    }
    poll();
    const interval = setInterval(poll, 20_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFundingTab]);

  // Pending-withdrawal notifier — same shape as the funding one above, for
  // whichever portal has a "Withdrawals" tab (admin).
  const withdrawalsHref = '/admin/withdrawals';
  const hasWithdrawalsTab = nav.some((item) => item.href === withdrawalsHref);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<
    { count: number; oldestSubmittedAt: string } | null
  >(null);

  useEffect(() => {
    if (!hasWithdrawalsTab) return;
    let cancelled = false;
    function poll() {
      api
        .adminWithdrawalsQueue('PENDING')
        .then((rows) => {
          if (cancelled) return;
          setPendingWithdrawals(
            rows.length > 0
              ? { count: rows.length, oldestSubmittedAt: rows[rows.length - 1].submittedAt }
              : { count: 0, oldestSubmittedAt: '' },
          );
        })
        .catch(() => {
          /* transient — keep showing whatever we last had rather than flicker the badge off */
        });
    }
    poll();
    const interval = setInterval(poll, 20_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWithdrawalsTab]);

  const navLinks = (
    <nav className="flex flex-1 flex-col gap-1">
      {nav.map((item) => {
        if (item.disabled) {
          return (
            <div
              key={item.href}
              aria-disabled="true"
              title="Coming soon"
              className={`flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium opacity-50 ${
                isDark ? 'text-neutral-400' : 'text-faint'
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  isDark ? 'bg-white/10 text-neutral-300' : 'bg-surface-hover text-muted'
                }`}
              >
                Coming soon
              </span>
            </div>
          );
        }
        const active = pathname === item.href;
        const badge =
          item.href === fundingHref && (pendingFunding?.count ?? 0) > 0
            ? { pending: pendingFunding!, noun: 'manual funding' }
            : item.href === withdrawalsHref && (pendingWithdrawals?.count ?? 0) > 0
              ? { pending: pendingWithdrawals!, noun: 'withdrawal' }
              : null;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? isDark
                  ? 'bg-brand-orange text-white shadow-sm'
                  : 'bg-brand-orange-light text-brand-orange-dark'
                : isDark
                  ? 'text-neutral-300 hover:bg-white/10 hover:text-white'
                  : 'text-muted hover:bg-surface-hover hover:text-foreground'
            }`}
          >
            <span>{item.label}</span>
            {badge && (
              <>
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500 ring-2 ring-brand-navy"
                />
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden w-64 -translate-y-1/2 rounded-lg border border-line bg-surface p-3 text-xs font-normal text-foreground shadow-lg group-hover:block"
                >
                  <p className="font-semibold text-foreground">
                    {badge.pending.count} pending {badge.noun}{' '}
                    {badge.pending.count === 1 ? 'request' : 'requests'}
                  </p>
                  <p className="mt-1 text-muted">
                    Awaiting approval — oldest submitted{' '}
                    {new Date(badge.pending.oldestSubmittedAt).toLocaleString()}.
                  </p>
                </div>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarBody = (
    <>
      <div className="mb-6 flex items-center justify-between px-2">
        <Logo size="sm" wordmarkColor={isDark ? 'white' : 'navy'} />
      </div>

      <div
        className={`mb-6 flex items-center gap-3 rounded-xl px-3 py-3 ${
          isDark ? 'bg-white/5' : 'bg-surface-hover'
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            isDark ? 'bg-brand-orange text-white' : 'bg-brand-navy text-white'
          }`}
        >
          {me ? me.firstName.charAt(0).toUpperCase() : '·'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {me ? `Hello, ${me.firstName}` : 'Hello'}
          </p>
          <p className={`truncate text-xs ${isDark ? 'text-neutral-400' : 'text-muted'}`}>
            {me ? ROLE_LABEL[me.role] ?? me.role : title}
          </p>
        </div>
      </div>

      {title !== 'PAYDER' && (
        <p
          className={`mb-3 px-3 text-xs font-semibold uppercase tracking-wider ${
            isDark ? 'text-neutral-400' : 'text-faint'
          }`}
        >
          {title}
        </p>
      )}

      {navLinks}

      <div className={`mt-4 border-t pt-3 ${isDark ? 'border-brand-navy-lighter' : 'border-line'}`}>
        <Link
          href="/account/change-password"
          onClick={() => setMobileOpen(false)}
          className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            isDark
              ? 'text-neutral-300 hover:bg-white/10 hover:text-white'
              : 'text-muted hover:bg-surface-hover hover:text-foreground'
          }`}
        >
          Change password
        </Link>
        <LogoutButton
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            isDark
              ? 'text-neutral-300 hover:bg-white/10 hover:text-white'
              : 'text-muted hover:bg-surface-hover hover:text-foreground'
          }`}
        />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar — hamburger + logo, only below md. Sticky so it
          stays reachable while scrolling a long page. */}
      <header
        className={`sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 md:hidden ${
          isDark
            ? 'border-brand-navy-lighter bg-brand-navy text-neutral-100'
            : 'border-line bg-surface text-foreground'
        }`}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            isDark ? 'hover:bg-white/10' : 'hover:bg-surface-hover'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M2.5 5h15M2.5 10h15M2.5 15h15"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <Logo size="sm" wordmarkColor={isDark ? 'white' : 'navy'} />
        <div className="w-9" aria-hidden="true" />
      </header>

      {/* Mobile drawer — backdrop + slide-in panel, only rendered/relevant
          below md (the desktop aside below handles md+ on its own). */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-y-auto px-4 py-6 shadow-xl transition-transform duration-200 ease-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDark
            ? 'bg-brand-navy text-neutral-100'
            : 'bg-surface text-foreground'
        }`}
      >
        {sidebarBody}
      </aside>

      {/* Desktop static sidebar — unchanged behavior at md and above. */}
      <aside
        className={`hidden w-64 shrink-0 flex-col border-r px-4 py-6 md:flex ${
          isDark
            ? 'border-brand-navy-lighter bg-brand-navy text-neutral-100'
            : 'border-line bg-surface text-foreground'
        }`}
      >
        {sidebarBody}
      </aside>
    </>
  );
}
