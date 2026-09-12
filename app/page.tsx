import Link from 'next/link';
import { Logo } from '@/components/Logo';
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
  ShieldCheckIcon,
  ClockIcon,
  UserGuestIcon,
  ReceiptIcon,
} from '@/components/MarketingIcons';

const FEATURES = [
  {
    icon: WalletIcon,
    title: 'One secure wallet',
    body: 'Fund by bank transfer or card, and watch every naira move through a real double-entry ledger — not a single number someone can quietly edit.',
  },
  {
    icon: PhoneIcon,
    title: 'Airtime & data',
    body: 'Top up any Nigerian network in seconds, for yourself or someone else, straight from your wallet balance.',
  },
  {
    icon: BoltIcon,
    title: 'Electricity & TV',
    body: 'Pay electricity discos and TV subscriptions without leaving the app — no queues, no separate USSD codes to remember.',
  },
  {
    icon: GraduationCapIcon,
    title: 'Exam e-pins',
    body: 'WAEC result-checker pins and JAMB e-PINs, delivered instantly so you can move straight to registration.',
  },
  {
    icon: SchoolIcon,
    title: 'School fees & billers',
    body: 'Pay a school, association, or contribution registered on PAYDER directly — priced exactly the way that biller set it up.',
  },
  {
    icon: BanknoteIcon,
    title: 'Fast withdrawals',
    body: 'Move money back out to your own bank account whenever you need to, with a clear, upfront fee shown before you confirm.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Create your account',
    body: 'Sign up with your email and phone in under a minute — or skip this entirely if you just need to pay a biller once.',
  },
  {
    n: '02',
    title: 'Fund your wallet',
    body: 'Bank transfer or card. Every credit is verified and posted to your ledger balance before it ever shows as available.',
  },
  {
    n: '03',
    title: 'Pay, top up, or withdraw',
    body: 'Bills, airtime, data, exam pins, or cash back to your bank — each one instant, each one recorded in your statement.',
  },
];

const TRUST_POINTS = [
  { icon: ShieldCheckIcon, label: 'Ledger-backed wallet, never a single mutable balance' },
  { icon: ClockIcon, label: 'Instant airtime, data, and bill settlement' },
  { icon: UserGuestIcon, label: 'Pay a biller with no account at all' },
  { icon: ReceiptIcon, label: 'Every transaction lands in your statement' },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNavbar />

      <main className="flex-1">
        {/* ---------------------------------------------------------------- */}
        {/* Hero */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative overflow-hidden bg-brand-navy">
          <div
            aria-hidden="true"
            className="payder-blob pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-orange/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="payder-blob-delay pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-brand-navy-lighter blur-3xl"
          />

          <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 pb-20 pt-16 sm:pb-28 sm:pt-24">
            <div className="payder-fade-up flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-orange">
              Wallet · Bills · Airtime · Data · Exam pins · Billers
            </div>
            <h1
              className="payder-fade-up max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl"
              style={{ animationDelay: '80ms' }}
            >
              One wallet for everything you pay for —{' '}
              <span className="text-brand-orange">in one place.</span>
            </h1>
            <p
              className="payder-fade-up max-w-xl text-lg text-neutral-300"
              style={{ animationDelay: '160ms' }}
            >
              Fund your wallet, pay bills and school fees, buy airtime and data, get exam e-pins,
              and withdraw whenever you need to. Secure, instant, and backed by a real ledger —
              not a spreadsheet.
            </p>
            <div
              className="payder-fade-up flex flex-wrap gap-3"
              style={{ animationDelay: '240ms' }}
            >
              <Link
                href="/signup"
                className="rounded-lg bg-brand-orange px-6 py-3 font-semibold text-white shadow-lg shadow-brand-orange/20 transition hover:bg-brand-orange-dark"
              >
                Create a free account
              </Link>
              <Link
                href="/pay-bill"
                className="rounded-lg border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Pay a bill — no account needed
              </Link>
            </div>
          </div>

          {/* Trust strip */}
          <div className="relative border-t border-white/10 bg-white/5">
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
              {TRUST_POINTS.map((t) => (
                <div key={t.label} className="flex items-center gap-3 text-sm text-white/80">
                  <t.icon className="h-5 w-5 shrink-0 text-brand-orange" />
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Features */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-background px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
                Everything you need, in one app
              </h2>
              <p className="mt-3 text-muted">
                No more juggling five different apps and USSD codes for one afternoon of errands.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={i * 60}>
                  <div className="h-full rounded-2xl border border-line bg-surface p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-orange-light text-brand-orange">
                      <f.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted">{f.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* How it works */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-surface-hover px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">How it works</h2>
              <p className="mt-3 text-muted">Three steps, whether you're a customer or a guest.</p>
            </Reveal>

            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 100}>
                  <div className="flex flex-col gap-3">
                    <span className="text-4xl font-bold text-brand-orange/30">{s.n}</span>
                    <h3 className="text-lg font-semibold text-foreground">{s.title}</h3>
                    <p className="text-sm text-muted">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Guest bill-pay CTA */}
        {/* ---------------------------------------------------------------- */}
        <section className="px-6 py-20 sm:py-24">
          <Reveal className="mx-auto max-w-6xl">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy to-brand-navy-light px-8 py-14 text-center sm:px-16">
              <div
                aria-hidden="true"
                className="payder-blob pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand-orange/20 blur-3xl"
              />
              <div className="relative flex flex-col items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-brand-orange">
                  <UserGuestIcon className="h-6 w-6" />
                </div>
                <h2 className="max-w-xl text-2xl font-semibold text-white sm:text-3xl">
                  Paying a school fee or association due? You don't need an account.
                </h2>
                <p className="max-w-lg text-neutral-300">
                  Find the biller, fill in your details, and pay by card or transfer — done in
                  minutes, receipt sent straight to your email.
                </p>
                <Link
                  href="/pay-bill"
                  className="mt-2 rounded-lg bg-brand-orange px-6 py-3 font-semibold text-white shadow-lg shadow-brand-orange/20 transition hover:bg-brand-orange-dark"
                >
                  Pay a bill now
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Services teaser */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-background px-6 pb-20 sm:pb-28">
          <Reveal className="mx-auto flex max-w-6xl flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-10 text-center shadow-sm">
            <Logo size="lg" withWordmark={false} />
            <h2 className="text-2xl font-semibold text-foreground">
              See everything PAYDER can do for you
            </h2>
            <p className="max-w-xl text-muted">
              A full breakdown of every service — wallet funding, bill payments, airtime and data,
              exam pins, and withdrawals.
            </p>
            <Link
              href="/services"
              className="rounded-lg border border-brand-orange px-6 py-3 font-semibold text-brand-orange transition hover:bg-brand-orange-light"
            >
              View all services
            </Link>
          </Reveal>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
