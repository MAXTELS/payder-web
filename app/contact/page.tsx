'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { MarketingNavbar } from '@/components/MarketingNavbar';
import { MarketingFooter } from '@/components/MarketingFooter';
import { Reveal } from '@/components/Reveal';

// NOTE: placeholder support contact details — replace with PAYDER's real
// email/phone before this page goes live (same placeholders used in
// MarketingFooter.tsx, kept in sync manually since there are only two
// places that show them).
const SUPPORT_EMAIL = 'support@payder.ng';
const SUPPORT_PHONE = '+234 800 000 0000';
const SUPPORT_PHONE_TEL = SUPPORT_PHONE.replace(/\s+/g, '');

const FAQS = [
  {
    q: 'Do I need an account to pay a school fee or biller due?',
    a: 'No. Go to Pay a bill, find the biller, fill in the details they ask for, and pay by card or bank transfer as a guest — your receipt is emailed to you.',
  },
  {
    q: 'How do I fund my wallet?',
    a: 'Log in, go to Wallet, and either pay instantly by card, or make a bank transfer to one of the listed PAYDER-owned accounts and confirm it — an admin approves transfer-based funding once it’s received.',
  },
  {
    q: 'I forgot my password — what do I do?',
    a: "Use \"Forgot password\" on the login page to reset it. If you're still stuck, reach out below and we'll help you regain access.",
  },
  {
    q: 'How long do withdrawals take?',
    a: "Withdrawal requests are reviewed and paid out by our team — you can track the status of any request from your Wallet page once you're logged in.",
  },
];

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject || 'Message from the PAYDER website',
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSent(true);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNavbar />

      <main className="flex-1">
        <section className="bg-brand-navy px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="payder-fade-up text-3xl font-semibold text-white sm:text-4xl">
              We're here to help
            </h1>
            <p
              className="payder-fade-up mt-3 text-neutral-300"
              style={{ animationDelay: '80ms' }}
            >
              Questions about a payment, your wallet, or a biller listing — reach out any time.
            </p>
          </div>
        </section>

        <section className="bg-background px-6 py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-5">
            {/* Contact info */}
            <Reveal className="lg:col-span-2">
              <div className="flex h-full flex-col gap-6">
                <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-faint">Email</p>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="mt-1 block text-lg font-medium text-brand-orange"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                  <p className="mt-1 text-sm text-muted">We reply within one business day.</p>
                </div>

                <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-faint">Phone</p>
                  <a
                    href={`tel:${SUPPORT_PHONE_TEL}`}
                    className="mt-1 block text-lg font-medium text-brand-orange"
                  >
                    {SUPPORT_PHONE}
                  </a>
                  <p className="mt-1 text-sm text-muted">Mon–Sat, 8am–8pm (WAT).</p>
                </div>

                <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                    Already have an account?
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Logged-in customers can also raise a support ticket directly from the app for
                    faster, transaction-linked help.
                  </p>
                  <Link
                    href="/login"
                    className="mt-3 inline-block text-sm font-semibold text-brand-orange hover:underline"
                  >
                    Log in to raise a ticket →
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* Form */}
            <Reveal className="lg:col-span-3" delay={100}>
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-7 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-foreground">Send us a message</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    Your name
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="rounded-lg border border-line px-3 py-2"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Your email
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-lg border border-line px-3 py-2"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-sm">
                  Subject
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="What's this about?"
                    className="rounded-lg border border-line px-3 py-2"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  Message
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="rounded-lg border border-line px-3 py-2"
                  />
                </label>

                <button
                  type="submit"
                  className="mt-1 self-start rounded-lg bg-brand-orange px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-orange/20 transition hover:bg-brand-orange-dark"
                >
                  Send message
                </button>

                {sent && (
                  <p className="text-sm text-muted">
                    Opening your email app to send this to {SUPPORT_EMAIL}. If nothing opened,
                    email us there directly.
                  </p>
                )}
              </form>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-surface-hover px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <Reveal className="text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Frequently asked questions
              </h2>
            </Reveal>

            <div className="mt-10 flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface shadow-sm">
              {FAQS.map((f, i) => (
                <Reveal key={f.q} delay={i * 60}>
                  <details className="group p-6">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground">
                      {f.q}
                      <span className="shrink-0 text-faint transition group-open:rotate-45">＋</span>
                    </summary>
                    <p className="mt-3 text-sm text-muted">{f.a}</p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
