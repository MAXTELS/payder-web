'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/contact', label: 'Contact' },
];

/**
 * Pinned (sticky) top navbar for the public marketing site — Home,
 * Services, Contact, a "Pay a bill" shortcut into the guest checkout flow,
 * and a Login button that goes to this same app's real login page
 * (`/login` — the same one the customer/admin/biller portals already use,
 * with its existing role-based redirect after signing in).
 */
export function MarketingNavbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-navy/95 backdrop-blur supports-[backdrop-filter]:bg-brand-navy/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          <Logo size="md" wordmarkColor="white" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition hover:text-brand-orange ${
                pathname === l.href ? 'text-brand-orange' : 'text-white/80'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/pay-bill"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Pay a bill
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-brand-orange px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-orange/20 transition hover:bg-brand-orange-dark"
          >
            Log in
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-white md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-brand-navy px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  pathname === l.href ? 'bg-white/10 text-brand-orange' : 'text-white/80'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/pay-bill"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg border border-white/20 px-3 py-2.5 text-center text-sm font-medium text-white"
            >
              Pay a bill
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-brand-orange px-3 py-2.5 text-center text-sm font-semibold text-white"
            >
              Log in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
