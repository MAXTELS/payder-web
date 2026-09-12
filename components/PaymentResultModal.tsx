'use client';

/// Mirrors mobile's `payment_result_dialog.dart` — one shared popup for "a
/// payment just settled" across every money-moving page on the web (bills,
/// airtime/data, betting), so the customer sees a loading state right up
/// until a final answer arrives, then exactly one modal reporting it.
/// Previously the web app only ever showed small inline status text and
/// never a popup at all — this is what "the loader doesn't work on the web"
/// was about: a purchase left PROCESSING never told the customer anything
/// beyond a line of text they had to notice themselves.
export type PaymentResultKind = 'confirmed' | 'awaitingApproval' | 'declined';

const KIND_META: Record<PaymentResultKind, { icon: string; color: string; title: string }> = {
  confirmed: { icon: '✅', color: 'text-green-700 dark:text-green-400', title: 'Confirmed' },
  awaitingApproval: {
    icon: '⏳',
    color: 'text-amber-700 dark:text-amber-400',
    title: 'Sent — awaiting approval',
  },
  declined: { icon: '❌', color: 'text-red-600', title: 'Declined' },
};

/// Maps a transaction status string (as returned by /bills, /betting, etc.)
/// to the modal kind that best represents it — same mapping mobile's
/// `_kindForStatus` uses on every purchase screen.
export function paymentResultKindForStatus(status: string): PaymentResultKind {
  switch (status.toUpperCase()) {
    case 'SUCCESS':
      return 'confirmed';
    case 'PENDING':
    case 'PROCESSING':
      return 'awaitingApproval';
    default:
      return 'declined';
  }
}

export function PaymentResultModal({
  kind,
  message,
  onClose,
}: {
  kind: PaymentResultKind;
  message?: string | null;
  onClose: () => void;
}) {
  const meta = KIND_META[kind];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-4xl leading-none">{meta.icon}</div>
        <h2 className={`mt-3 text-lg font-semibold ${meta.color}`}>{meta.title}</h2>
        {message && <p className="mt-2 text-sm text-muted">{message}</p>}
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-5 rounded-lg bg-brand-orange px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark"
        >
          OK
        </button>
      </div>
    </div>
  );
}
