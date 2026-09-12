import Link from 'next/link';
import { Logo } from './Logo';

// NOTE: support email/phone/address below are placeholders — swap in
// PAYDER's real support contact details before this site goes live. Social
// links are omitted for the same reason (no real handles configured yet);
// add them here once they exist.
const SUPPORT_EMAIL = 'support@payder.ng';
const SUPPORT_PHONE = '+234 800 000 0000';

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-brand-navy text-white/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3 lg:col-span-1">
          <Logo size="md" wordmarkColor="white" />
          <p className="max-w-xs text-sm text-white/60">
            Fund your wallet, pay bills, buy airtime and data, and get exam e-pins — all from one
            secure app.
          </p>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">
            Company
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link href="/" className="transition hover:text-brand-orange">
                Home
              </Link>
            </li>
            <li>
              <Link href="/services" className="transition hover:text-brand-orange">
                Services
              </Link>
            </li>
            <li>
              <Link href="/contact" className="transition hover:text-brand-orange">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">
            Get started
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link href="/signup" className="transition hover:text-brand-orange">
                Create an account
              </Link>
            </li>
            <li>
              <Link href="/login" className="transition hover:text-brand-orange">
                Log in
              </Link>
            </li>
            <li>
              <Link href="/pay-bill" className="transition hover:text-brand-orange">
                Pay a bill (no account)
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">
            Support
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="transition hover:text-brand-orange">
                {SUPPORT_EMAIL}
              </a>
            </li>
            <li>
              <a
                href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}
                className="transition hover:text-brand-orange"
              >
                {SUPPORT_PHONE}
              </a>
            </li>
            <li className="text-white/50">Lagos, Nigeria</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-6 text-center text-xs text-white/40">
        © {year} PAYDER. All rights reserved.
      </div>
    </footer>
  );
}
