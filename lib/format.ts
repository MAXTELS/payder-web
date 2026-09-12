/**
 * Thousands-separate the integer part of a fixed-decimal amount string
 * ("1234.56" -> "1,234.56") without ever round-tripping through Number —
 * wallet balances are arbitrary-precision decimal strings from the backend,
 * and Number() risks losing precision on a large-enough figure.
 */
export function formatWithCommas(raw: string): string {
  const [intPart, decPart] = raw.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart ? `${withCommas}.${decPart}` : withCommas;
}

// Mirrors backend prisma/schema.prisma's TransactionType enum exactly — kept
// here as the one shared source for both the dashboard's recent-activity
// widget and the Transaction History page, rather than each screen
// maintaining its own (partially wrong) copy.
export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  WALLET_FUNDING: 'Wallet funding',
  AIRTIME: 'Airtime',
  DATA: 'Data',
  TV_SUBSCRIPTION: 'TV subscription',
  ELECTRICITY: 'Electricity',
  EXAM_PIN: 'Exam pin',
  BILL_PAYMENT: 'Remita / eTranzact payment',
  TRANSFER: 'Transfer',
  REVERSAL: 'Reversal',
  FEE: 'Fee',
  BILLER_BILL_PAYMENT: 'Bill payment',
  BETTING: 'Betting funding',
};

export const TRANSACTION_STATUS_STYLES: Record<string, string> = {
  SUCCESS: 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/30',
  PENDING: 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30',
  PROCESSING: 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30',
  FAILED: 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/30',
  REVERSED: 'text-neutral-700 bg-surface-hover',
};

/**
 * A one-line human summary built from a transaction's free-form `metadata`
 * JSON, which varies by type (see backend BillsService/BettingService/
 * WalletService for what each type actually stores). Best-effort: falls
 * back to nothing shown rather than dumping raw JSON at the customer.
 */
export function describeTransaction(
  type: string,
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata) return null;
  const m = metadata as Record<string, any>;
  switch (type) {
    case 'AIRTIME':
    case 'DATA':
      return m.customerId ? `To ${m.customerId}${m.serviceId ? ` (${m.serviceId})` : ''}` : null;
    case 'TV_SUBSCRIPTION':
      return m.customerId ? `Smartcard ${m.customerId}` : null;
    case 'ELECTRICITY':
      return m.customerId ? `Meter ${m.customerId}` : null;
    case 'BETTING':
      return m.customerId
        ? `${m.providerId ?? 'Betting'} account ${m.customerId}`
        : null;
    case 'WALLET_FUNDING':
      return m.provider ? `Via ${m.provider}` : null;
    default:
      return null;
  }
}
