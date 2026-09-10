import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-brand-navy">
      <div className="px-8 py-6">
        <Logo size="md" wordmarkColor="white" />
      </div>
      <div className="mx-auto flex max-w-2xl flex-1 flex-col items-start justify-center gap-6 px-6 payder-fade-up">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-orange">
          Wallet · Bills · Airtime · Data · Exam pins
        </span>
        <h1 className="text-4xl font-semibold text-white sm:text-5xl">
          Send, pay, and top up — <span className="text-brand-orange">all in one wallet.</span>
        </h1>
        <p className="text-lg text-neutral-300">
          Fund your wallet by bank transfer, pay bills, buy airtime and data, and get exam e-pins.
         {/*  Admin and customer-care consoles live under{' '}
          <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-sm text-brand-orange">/admin</code>{' '}
          and{' '}
          <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-sm text-brand-orange">/care</code>,
          gated by role once you log in. */}
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-brand-orange px-6 py-3 font-semibold text-white shadow-lg shadow-brand-orange/20 transition hover:bg-brand-orange-dark"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}
