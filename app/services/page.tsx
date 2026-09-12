import Link from 'next/link';
import type { Metadata } from 'next';
import { MarketingNavbar } from '@/components/MarketingNavbar';
import { MarketingFooter } from '@/components/MarketingFooter';
import { Reveal } from '@/components/Reveal';
import {
  WalletIcon,
  BoltIcon,
  PhoneIcon,
  GraduationCapIcon,
  SchoolIcon,
  BanknoteIcon,
  UserGuestIcon,
} from '@/components/MarketingIcons';

export const metadata: Metadata = {
  title: 'Services — PAYDER',
  description: 'Everything you can do on PAYDER: wallet, bills, airtime, data, exam pins, and biller payments — with or without an account.',
};

const SERVICES = [
  {
    icon: WalletIcon,
    title: 'Wallet funding',
    body: 'Fund your PAYDER wallet by card or bank transfer. Every credit is verified and posted to a real ledger balance — never a number that can be quietly edited.',
    cta: { href: '/signup', label: 'Create an account to fund a wallet' },
  },
  {
    icon: SchoolIcon,
    title: 'School fees & biller payments',
    body: 'Pay a school, association, or contribution registered on PAYDER. Each biller sets its own bill and pricing, so you always see the exact amount before paying.',
    highlight: true,
    cta: { href: '/pay-bill', label: 'Pay a bill — no account needed' },
  },
  {
    icon: PhoneIcon,
    title: 'Airtime & data',
    body: 'Top up any major Nigerian network instantly, for yourself or someone else, straight from your wallet balance.',
    cta: { href: '/signup', label: 'Create an account to buy airtime & data' },
  },
  {
    icon: BoltIcon,
    title: 'Electricity & TV subscriptions',
    body: 'Pay electricity discos and TV subscription bills from the app — no separate USSD codes or queueing at an agent.',
    cta: { href: '/signup', label: 'Create an account to pay bills' },
  },
  {
    icon: GraduationCapIcon,
    title: 'Exam e-pins',
    body: 'WAEC result-checker pins and JAMB e-PINs, delivered instantly so you can move straight into registration.',
    cta: { href: '/signup', label: 'Create an account for exam pins' },
  },
  {
    icon: BanknoteIcon,
    title: 'Withdrawals',
    body: 'Move money from your wallet back to your own bank account whenever you need to, with the fee shown clearly before you confirm.',
    cta: { href: '/signup', label: 'Create an account to withdraw' },
  },
];

export default function ServicesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNavbar />

      <main className="flex-1">
        <section className="bg-brand-navy px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="payder-fade-up text-3xl font-semibold text-white sm:text-4xl">
              Everything PAYDER does — in one place
            </h1>
            <p
              className="payder-fade-up mt-3 text-neutral-300"
              style={{ animationDelay: '80ms' }}
            >
              Most of these need a free PAYDER account. One — paying a biller — doesn't.
            </p>
          </div>
        </section>

        <section className="bg-background px-6 py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2">
            {SERVICES.map((s, i) => (
              <Reveal key={s.title} delay={(i % 2) * 80}>
                <div
                  className={`flex h-full flex-col gap-4 rounded-2xl border p-7 shadow-sm ${
                    s.highlight
                      ? 'border-brand-orange bg-brand-orange-light/40'
                      : 'border-line bg-surface'
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      s.highlight
                        ? 'bg-brand-orange text-white'
                        : 'bg-brand-orange-light text-brand-orange'
                    }`}
                  >
                    <s.icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
                  <p className="flex-1 text-sm text-muted">{s.body}</p>
                  <Link
                    href={s.cta.href}
                    className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      s.highlight
                        ? 'bg-brand-orange text-white hover:bg-brand-orange-dark'
                        : 'border border-brand-orange text-brand-orange hover:bg-brand-orange-light'
                    }`}
                  >
                    {s.cta.label}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Guest bill-pay deep-dive */}
        <section className="bg-surface-hover px-6 py-16 sm:py-20">
          <Reveal className="mx-auto max-w-4xl rounded-3xl border border-line bg-surface p-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange-light text-brand-orange">
              <UserGuestIcon className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-foreground">
              Paying a biller doesn't require signing up
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted">
              Find the biller by category, fill in the details they ask for (registration number,
              department, level — whatever applies), see the exact amount, and pay by card or
              transfer. Already have a PAYDER account? Log in first and pay straight from your
              wallet balance instead — same flow, one less step.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/pay-bill"
                className="rounded-lg bg-brand-orange px-6 py-3 font-semibold text-white shadow-lg shadow-brand-orange/20 transition hover:bg-brand-orange-dark"
              >
                Pay a bill now
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-line px-6 py-3 font-semibold text-foreground transition hover:bg-surface-hover"
              >
                Log in and pay from wallet
              </Link>
            </div>
          </Reveal>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-16 sm:py-20">
          <Reveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Ready to get started?
            </h2>
            <p className="mt-3 text-muted">
              Create your free PAYDER account and fund your wallet in minutes.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-brand-orange px-6 py-3 font-semibold text-white shadow-lg shadow-brand-orange/20 transition hover:bg-brand-orange-dark"
              >
                Create a free account
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-line px-6 py-3 font-semibold text-foreground transition hover:bg-surface-hover"
              >
                Talk to us
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
