/**
 * Thin fetch wrapper around the PAYDER NestJS API. Every role-gated page
 * (customer, admin, customer-care) goes through this so there is exactly one
 * place that attaches the auth token and handles a 401 uniformly — see
 * PAYDER-ARCHITECTURE.md for why RBAC must still be enforced server-side
 * regardless of what this client does.
 */

/**
 * Resolves the backend base URL. A hardcoded `http://localhost:3000/api/v1`
 * only works when the browser and the backend are the same machine — it
 * silently breaks every single request (login included) the moment the app
 * is opened from a phone or any other device on the network, because on
 * THAT device "localhost" means itself, not the PC running the backend.
 *
 * Fix: in the browser, default to whatever host the page itself was loaded
 * from (`window.location.hostname`) — so it's `localhost` when opened on
 * this PC and the PC's LAN IP when opened from a phone pointed at
 * `http://<pc-lan-ip>:3001`, with no reconfiguration needed either way, as
 * long as the backend runs on the same machine on port 3000 (true for dev).
 * An explicit non-localhost override in NEXT_PUBLIC_API_BASE_URL (e.g. a
 * real API domain once this ships to production) still wins.
 */
function resolveApiBaseUrl(): string {
  const envOverride = process.env.NEXT_PUBLIC_API_BASE_URL;
  const envIsLocalOnly =
    !envOverride || envOverride.includes('localhost') || envOverride.includes('127.0.0.1');

  if (typeof window !== 'undefined' && envIsLocalOnly) {
    return `http://${window.location.hostname}:3000/api/v1`;
  }
  return envOverride ?? 'http://localhost:3000/api/v1';
}

const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Mirrors backend WithdrawalsService.NgnBank — { name, code } from
// Paystack's /bank list (or the static fallback if that call fails).
export type NgnBank = { name: string; code: string };

// Mirrors backend WithdrawalRequest.
export type WithdrawalRequest = {
  id: string;
  userId: string;
  billerId: string | null;
  amount: string;
  fee: string;
  totalDebit: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  providerConfirmationRef: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  resolvedAt: string | null;
};

// Shape returned by the Remita pay/status endpoints (and, more generally,
// any manual-payments row) — mirrors backend ManualPaymentRequest.
export type ManualPaymentRequest = {
  id: string;
  userId: string;
  biller: 'REMITA' | 'ETRANZACT';
  invoiceReference: string;
  payerName: string | null;
  description: string | null;
  amount: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  providerConfirmationRef: string | null;
  receiptPdfUrl: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  resolvedAt: string | null;
};

// Mirrors backend BillersAdminService's BILLER_SAFE_USER_SELECT.
export type BillerUserSummary = {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  billerLabel: 'A' | 'B' | null;
  isActive: boolean;
  createdAt: string;
};

// Mirrors backend BillersAdminService.listBillers()'s per-row shape.
export type BillerSummary = {
  id: string;
  name: string;
  type: string;
  isJoint: boolean;
  isActive: boolean;
  createdAt: string;
  users: BillerUserSummary[];
  balance: string | null;
};

export type BillerDetail = BillerSummary & {
  bill: { id: string; name: string; status: string } | null;
  wallet: { currency: string; balance: string; isFrozen: boolean } | null;
};

// Body for POST /admin/billers — one entry in `users` for a single biller,
// two (A and B, in order) for a joint one.
export type CreateBillerPayload = {
  name: string;
  type: 'SCHOOL' | 'CONTRIBUTION' | 'OTHER';
  isJoint: boolean;
  users: {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    nin: string;
    password?: string;
  }[];
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('payder_access_token');
}

// Access tokens are short-lived (15m — see backend JWT_ACCESS_TTL), so a
// session left open longer than that is the *expected* steady state, not an
// error. Despite this file's header comment claiming 401s are "handled
// uniformly," there was previously no refresh logic here at all — every
// authenticated call (funding via Paystack included) just threw
// "Unauthorized" the moment the access token aged out, forcing a full
// re-login for something as simple as a stale tab. This mirrors the mobile
// app's ApiClient interceptor: on a 401, silently exchange the refresh token
// for a new pair and retry the original request once. Concurrent 401s share
// one in-flight refresh instead of each racing to refresh separately.
let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const storedRefreshToken = window.localStorage.getItem('payder_refresh_token');
  if (!storedRefreshToken) return Promise.resolve(null);

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedRefreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const body = await res.json();
        window.localStorage.setItem('payder_access_token', body.accessToken);
        window.localStorage.setItem('payder_refresh_token', body.refreshToken);
        return body.accessToken as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const token = auth ? getToken() : null;

  const doFetch = (accessToken: string | null) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
    });

  let res = await doFetch(token);

  // Only attempt a refresh-and-retry for an authenticated call that actually
  // sent a token and got rejected — not for public calls, and not for the
  // login/refresh endpoints themselves (that would loop).
  if (res.status === 401 && auth && token && path !== '/auth/refresh' && path !== '/auth/login') {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(newToken);
    } else if (typeof window !== 'undefined') {
      // The refresh token is gone or expired too — clear the dead session so
      // the next navigation bounces to login instead of retrying forever
      // with tokens that will never work.
      window.localStorage.removeItem('payder_access_token');
      window.localStorage.removeItem('payder_refresh_token');
    }
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      // response body wasn't JSON — fall back to statusText
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Same auth/refresh handling as apiFetch, but for a non-JSON download (the
// Transaction History page's CSV export) — returns the raw Blob instead of
// parsing a body that isn't JSON in the first place.
async function apiFetchBlob(path: string): Promise<Blob> {
  const token = getToken();
  const doFetch = (accessToken: string | null) =>
    fetch(`${API_BASE_URL}${path}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

  let res = await doFetch(token);
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await doFetch(newToken);
  }
  if (!res.ok) {
    throw new ApiError(res.status, res.statusText);
  }
  return res.blob();
}

export const api = {
  login: (identifier: string, password: string) =>
    apiFetch<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
      auth: false,
    }),
  register: (payload: {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    password: string;
  }) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload), auth: false }),
  // Forgot-password, step 1: send a 6-digit code to the account's email.
  // Backend always responds { sent: true } regardless of whether the email
  // is registered (anti-enumeration) — see AuthService.requestPasswordReset.
  requestPasswordReset: (email: string) =>
    apiFetch<{ sent: true }>('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
      auth: false,
    }),
  // Forgot-password, step 2: the code from step 1 plus a new password.
  resetPassword: (email: string, code: string, newPassword: string) =>
    apiFetch<{ reset: true }>('/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
      auth: false,
    }),
  me: () =>
    apiFetch<{
      id: string;
      email: string;
      phone: string;
      firstName: string;
      lastName: string;
      role: 'CUSTOMER' | 'ADMIN' | 'CUSTOMER_CARE';
      kycTier: string;
      isActive: boolean;
      emailVerifiedAt: string | null;
      phoneVerifiedAt: string | null;
      createdAt: string;
      // Whether a transaction PIN is already set — never the hash itself.
      // Drives whether the profile page shows "set a PIN" or "change your
      // PIN", and whether a purchase form should even bother asking for one.
      pinSet: boolean;
    }>('/users/me'),
  walletBalance: () =>
    apiFetch<{
      currency: string;
      balance: string;
      virtualAccountNumber: string | null;
      virtualAccountBank: string | null;
      virtualAccountProvider: string | null;
    }>('/wallet/balance'),
  walletStatement: (params?: {
    limit?: number;
    cursor?: string;
    type?: string;
    status?: string;
    from?: string;
    to?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.cursor) qs.set('cursor', params.cursor);
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<{
      items: {
        id: string;
        type: string;
        status: string;
        amount: string;
        fee: string;
        providerReference: string | null;
        metadata: Record<string, unknown> | null;
        createdAt: string;
        completedAt: string | null;
      }[];
      nextCursor: string | null;
    }>(`/wallet/statement${suffix}`);
  },
  // Downloads the same filtered set as walletStatement, but every matching
  // row in one CSV file rather than one cursor-page of JSON — see backend
  // WalletController.exportStatement. Returns a Blob; the caller (the
  // Transaction History page) turns it into a client-side download.
  walletStatementExport: (params?: { type?: string; status?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetchBlob(`/wallet/statement/export${suffix}`);
  },
  provisionVirtualAccount: () =>
    apiFetch<{ accountNumber: string; bankName: string }>('/payments/virtual-account', {
      method: 'POST',
    }),

  // VTU (airtime/data/TV) via VTpass — see backend BillsService/VtpassProvider.
  // Data bundle plans / TV bouquets, fetched live so sandbox vs live pricing
  // is always whatever VTpass actually has right now (no PAYDER-side list to
  // keep in sync).
  billsVariations: (serviceId: string) =>
    apiFetch<{ code: string; name: string; amount: string }[]>(
      `/bills/variations?serviceId=${encodeURIComponent(serviceId)}`,
    ),
  // TV only: confirms a smartcard number and returns the subscriber's name
  // before the customer commits to paying. DSTV/GOtv also return status +
  // dueDate (subscription-style — active until that date, then must
  // renew); StarTimes returns balance instead (prepaid decoder — no
  // status/dueDate exists for it). See backend VtpassProvider.verifyCustomer.
  billsVerify: (serviceId: string, customerId: string) =>
    apiFetch<{
      valid: boolean;
      customerName?: string;
      status?: string;
      dueDate?: string;
      customerNumber?: string;
      balance?: string;
    }>(
      `/bills/verify?serviceId=${encodeURIComponent(serviceId)}&customerId=${encodeURIComponent(customerId)}`,
    ),
  billsPurchase: (dto: {
    category: 'airtime' | 'data' | 'tv';
    serviceId: string;
    variationCode?: string;
    customerId: string;
    amount: string;
    phone: string;
    // Required by the backend (verifyTransactionPin) once a PIN is set —
    // optional here purely so the pre-PIN "set a PIN first" error surfaces
    // cleanly instead of a client-side type failure.
    pin?: string;
  }) =>
    apiFetch<{ id: string; status: string; providerReference?: string }>('/bills/purchase', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  // Polled while a purchase is PROCESSING (VTpass responded "pending").
  billsStatus: (transactionId: string) =>
    apiFetch<{ id: string; status: string }>(`/bills/${encodeURIComponent(transactionId)}/status`),

  // Betting-account funding via Pairgate — see backend BettingService/
  // PairgateProvider. Mirrors the bills* shape above (list -> verify ->
  // fund -> status) rather than reusing it, since betting has no
  // serviceId/variationCode pair, just a provider id and account id.
  bettingProviders: () => apiFetch<{ id: string; name: string }[]>('/betting/providers'),
  bettingVerify: (providerId: string, customerId: string) =>
    apiFetch<{ valid: boolean; customerName?: string }>(
      `/betting/verify?providerId=${encodeURIComponent(providerId)}&customerId=${encodeURIComponent(customerId)}`,
    ),
  bettingFund: (dto: { providerId: string; customerId: string; amount: string; pin?: string }) =>
    apiFetch<{ id: string; status: string; providerReference?: string }>('/betting/fund', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  bettingStatus: (transactionId: string) =>
    apiFetch<{ id: string; status: string }>(`/betting/${encodeURIComponent(transactionId)}/status`),

  // Paystack instant funding — runs alongside manual bank transfer, not in
  // place of it. `fund` starts checkout and returns a URL to redirect the
  // browser to; `verify` is called from the callback page once the customer
  // is back, and actually credits the wallet.
  paymentsPaystackFund: (amount: string) =>
    apiFetch<{ authorizationUrl?: string; reference: string }>('/payments/paystack/fund', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  paymentsPaystackVerify: (reference: string) =>
    apiFetch<{
      credited: boolean;
      status: 'success' | 'failed' | 'abandoned' | 'pending';
      error?: string;
    }>(`/payments/paystack/verify/${encodeURIComponent(reference)}`),

  supportTicketsMine: () => apiFetch('/support/tickets/mine'),
  supportQueue: () => apiFetch('/support/tickets/queue'),
  adminPendingKyc: () => apiFetch('/admin/kyc/pending'),
  adminTransactions: (params?: { status?: string }) =>
    apiFetch(
      `/admin/transactions${params?.status ? `?status=${params.status}` : ''}`,
    ),
  adminProviders: () => apiFetch('/admin/providers'),
  adminTotalCustomerBalance: () =>
    apiFetch<{
      totalBalance: string;
      currency: string;
      customerCount: number;
      walletCount: number;
      asOf: string;
    }>('/admin/reports/total-customer-balance'),
  adminNetBalance: () =>
    apiFetch<{
      currency: string;
      netBalance: string;
      users: { totalBalance: string; walletCount: number };
      billers: { totalBalance: string; walletCount: number; activeBillerCount: number };
      asOf: string;
    }>('/admin/reports/net-balance'),
  adminPortalCharges: (days?: number) =>
    apiFetch<{
      currency: string;
      today: { date: string; totalCharges: string; transactionCount: number };
      history: { date: string; totalCharges: string; transactionCount: number }[];
    }>(`/admin/reports/portal-charges${days ? `?days=${days}` : ''}`),

  // Manual invoice-payment flow — PAYDER-ARCHITECTURE.md §5.4b.
  manualPaymentLookup: (payload: { biller: 'REMITA' | 'ETRANZACT'; invoiceReference: string }) =>
    apiFetch<{ valid: boolean; message: string }>('/manual-payments/lookup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  manualPaymentCreate: (payload: {
    biller: 'REMITA' | 'ETRANZACT';
    invoiceReference: string;
    amount: string;
    payerName?: string;
    description?: string;
  }) => apiFetch('/manual-payments', { method: 'POST', body: JSON.stringify(payload) }),
  manualPaymentsMine: () => apiFetch('/manual-payments/mine'),

  // Remita — real Biller API flow (lookup → fee preview → pay → auto-settle).
  // Distinct from manualPaymentLookup/Create above, which stays the
  // interim admin-mediated path for ETRANZACT.
  remitaLookup: (rrr: string) =>
    apiFetch<{
      rrr: string;
      billerName: string;
      productName: string;
      payerName: string;
      description: string;
      currency: string;
      invoiceAmount: number;
      remitaFee: number;
      portalFee: number;
      totalToPay: number;
      rrrStatus: string;
      alreadyPaid: boolean;
    }>(`/manual-payments/remita/lookup/${encodeURIComponent(rrr)}`),
  remitaPay: (rrr: string) =>
    apiFetch<ManualPaymentRequest>('/manual-payments/remita/pay', {
      method: 'POST',
      body: JSON.stringify({ rrr }),
    }),
  remitaStatus: (id: string) =>
    apiFetch<ManualPaymentRequest>(`/manual-payments/${id}/remita-status`),
  adminManualPaymentsQueue: (status?: string) =>
    apiFetch(`/admin/manual-payments${status ? `?status=${status}` : ''}`),
  adminManualPaymentMarkPaid: (id: string, providerConfirmationRef: string) =>
    apiFetch(`/admin/manual-payments/${id}/paid`, {
      method: 'PATCH',
      body: JSON.stringify({ providerConfirmationRef }),
    }),
  adminManualPaymentReject: (id: string, reason: string) =>
    apiFetch(`/admin/manual-payments/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  // Test-only: generates a throwaway RRR via Remita's own public demo
  // credentials, for exercising the "Pay a Remita invoice" screen without a
  // real biller-issued RRR. See backend RemitaDemoProvider's header comment
  // for the important caveat about this being a DIFFERENT Remita product
  // than the lookup/pay flow — a generated RRR is not guaranteed to be found
  // by remitaLookup.
  adminGenerateDemoRrr: (payload: { amount: number; payerName?: string; description?: string }) =>
    apiFetch<{ rrr: string; orderId: string; amount: number }>(
      '/admin/manual-payments/remita/generate-demo-rrr',
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  // Manual bank-transfer wallet funding — customer transfers to one of the
  // static PAYDER accounts, then tells us. No ledger entry until an admin
  // approves (see backend WalletFundingService for why).
  walletFundingDestinations: () =>
    apiFetch<
      Record<
        'ACCESS_BANK' | 'OPAY' | 'MONIEPOINT',
        { label: string; accountNumber: string; accountName: string }
      >
    >('/wallet-funding/destinations'),
  walletFundingCreate: (payload: {
    amount: string;
    destinationAccount: 'ACCESS_BANK' | 'OPAY' | 'MONIEPOINT';
    senderAccountName: string;
    senderBankName: string;
  }) => apiFetch('/wallet-funding', { method: 'POST', body: JSON.stringify(payload) }),
  walletFundingMine: () =>
    apiFetch<
      {
        id: string;
        amount: string;
        destinationAccount: string;
        senderAccountName: string;
        senderBankName: string;
        status: 'PENDING' | 'APPROVED' | 'REJECTED';
        rejectionReason: string | null;
        submittedAt: string;
      }[]
    >('/wallet-funding/mine'),
  adminWalletFundingQueue: (status?: string) =>
    apiFetch<
      {
        id: string;
        amount: string;
        destinationAccount: string;
        senderAccountName: string;
        senderBankName: string;
        status: 'PENDING' | 'APPROVED' | 'REJECTED';
        submittedAt: string;
        user: { email: string; firstName: string; lastName: string };
      }[]
    >(`/admin/wallet-funding${status ? `?status=${status}` : ''}`),
  adminWalletFundingApprove: (id: string) =>
    apiFetch(`/admin/wallet-funding/${id}/approve`, { method: 'PATCH' }),
  adminWalletFundingReject: (id: string, reason: string) =>
    apiFetch(`/admin/wallet-funding/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  // Withdrawals — wallet to the customer's own bank account. Admin-reviewed
  // payout (not automatic) — see backend WithdrawalsService for why. The
  // wallet debit happens up front on create(), same as a purchase, not on
  // admin approval — so the amount is already gone from the customer's
  // spendable balance while a request is Pending.
  withdrawalBanks: () => apiFetch<NgnBank[]>('/withdrawals/banks'),
  withdrawalCreate: (payload: {
    amount: string;
    bankName: string;
    accountNumber: string;
    confirmAccountNumber: string;
    accountName: string;
    pin?: string;
  }) => apiFetch<WithdrawalRequest>('/withdrawals', { method: 'POST', body: JSON.stringify(payload) }),
  withdrawalsMine: () => apiFetch<WithdrawalRequest[]>('/withdrawals/mine'),
  adminWithdrawalsQueue: (status?: string) =>
    apiFetch<
      (WithdrawalRequest & {
        user: { email: string; firstName: string; lastName: string };
        biller: { id: string; name: string; type: string } | null;
      })[]
    >(`/admin/withdrawals${status ? `?status=${status}` : ''}`),
  adminWithdrawalMarkPaid: (id: string, providerConfirmationRef?: string) =>
    apiFetch(`/admin/withdrawals/${id}/paid`, {
      method: 'PATCH',
      body: JSON.stringify({ providerConfirmationRef }),
    }),
  adminWithdrawalReject: (id: string, reason: string) =>
    apiFetch(`/admin/withdrawals/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  // Assisted Post-UTME registration flow — §5.5.
  postUtmeAssist: (payload: {
    institutionName: string;
    jambRegNumber: string;
    programme: string;
    notes?: string;
  }) => apiFetch('/support/post-utme-assist', { method: 'POST', body: JSON.stringify(payload) }),

  // Customer KYC: verify email/phone, then submit DOB + address + NIN for
  // admin review. See backend kyc module for why this posts no ledger entry
  // and why NIN never leaves the server unencrypted.
  kycMe: () =>
    apiFetch<{
      emailVerifiedAt: string | null;
      phoneVerifiedAt: string | null;
      kycTier: string;
      record: {
        id: string;
        tier: string;
        status: 'PENDING' | 'APPROVED' | 'REJECTED';
        dateOfBirth: string | null;
        address: string | null;
        ninMasked: string | null;
        rejectionReason: string | null;
        createdAt: string;
        verifiedAt: string | null;
      } | null;
    }>('/kyc/me'),
  kycRequestOtp: (channel: 'EMAIL' | 'PHONE') =>
    apiFetch<{ sent: boolean; delivered: boolean; channel: string; expiresInMinutes: number }>(
      '/kyc/otp/request',
      {
        method: 'POST',
        body: JSON.stringify({ channel }),
      },
    ),
  kycConfirmOtp: (channel: 'EMAIL' | 'PHONE', code: string) =>
    apiFetch<{ verified: boolean; channel: string }>('/kyc/otp/confirm', {
      method: 'POST',
      body: JSON.stringify({ channel, code }),
    }),
  kycSubmit: (payload: { dateOfBirth: string; address: string; nin: string }) =>
    apiFetch('/kyc/submit', { method: 'POST', body: JSON.stringify(payload) }),

  // Exam pins: WAEC/NECO are priced entirely server-side (real price +
  // PAYDER's fixed ₦1,000 margin) — examsPricing is the read-only preview
  // the page shows before the customer commits; examsBuyPin re-derives the
  // same figure itself rather than trusting this round-trip. JAMB isn't
  // wired into backend pricing yet, so its preview comes back with null
  // prices and the page still collects an amount for it.
  examsPricing: (examType: 'waec' | 'neco' | 'jamb') =>
    apiFetch<{
      examType: string;
      realPrice: string | null;
      markup: string;
      totalPrice: string | null;
      variationCode: string | null;
    }>(`/exams/pricing?examType=${examType}`),
  // No phone field (removed 2026-09) — it was never actually how the pin got
  // delivered (VTpass only needed *a* phone-shaped value as a request
  // parameter, satisfied server-side from the buyer's own account); `email`
  // (pre-filled with, but editable from, the account email — see the exams
  // page) is where the pin is actually sent, see backend ExamsService.
  examsBuyPin: (payload: {
    examType: 'waec' | 'neco' | 'jamb';
    email?: string;
    amount?: string;
    pin?: string;
  }) =>
    apiFetch<{ transactionId?: string; pin?: string | null; status: string }>('/exams/pins', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Admin: NECO's admin-set sell price — the ONLY source of what a customer
  // is charged for a NECO pin (no PAYDER markup added on top of this, unlike
  // WAEC). costPrice is optional/informational (what staff pay NECO itself).
  adminGetNecoPrice: () =>
    apiFetch<{ sellPrice: string; costPrice: string }>('/exams/admin/neco-price'),
  adminSetNecoPrice: (sellPrice: number, costPrice?: number) =>
    apiFetch<{ sellPrice: string; costPrice: string }>('/exams/admin/neco-price', {
      method: 'PATCH',
      body: JSON.stringify({ sellPrice, ...(costPrice !== undefined ? { costPrice } : {}) }),
    }),

  // Admin: staff management (ADMIN / CUSTOMER_CARE accounts).
  adminStaffList: () => apiFetch<SafeUser[]>('/admin/staff'),
  adminStaffCreate: (payload: {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'CUSTOMER_CARE';
    password?: string;
  }) =>
    apiFetch<{ user: SafeUser; tempPassword?: string }>('/admin/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminStaffSetActive: (id: string, isActive: boolean) =>
    apiFetch<SafeUser>(`/admin/staff/${id}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  adminStaffSetRole: (id: string, role: 'ADMIN' | 'CUSTOMER_CARE') =>
    apiFetch<SafeUser>(`/admin/staff/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  // Admin: completes a manually-fulfilled NECO exam pin once staff have
  // bought the actual pin from NECO's own portal (see backend
  // AdminService.fulfillExamPin — NECO has no live aggregator yet).
  // `email` overrides who the confirmation goes to (defaults to whatever the
  // customer typed on the exam-pins form, then their account email);
  // `message` is a freeform note folded into that same confirmation email.
  adminExamFulfill: (transactionId: string, pin: string, email?: string, message?: string) =>
    apiFetch(`/admin/exams/${transactionId}/fulfill`, {
      method: 'PATCH',
      body: JSON.stringify({ pin, email, message }),
    }),

  // Admin: audit log — every admin/staff action, filterable by actor.
  adminAuditLogs: (params?: { actorId?: string; targetEntity?: string; take?: number }) => {
    const qs = new URLSearchParams();
    if (params?.actorId) qs.set('actorId', params.actorId);
    if (params?.targetEntity) qs.set('targetEntity', params.targetEntity);
    if (params?.take) qs.set('take', String(params.take));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<AuditLogEntry[]>(`/admin/audit-logs${suffix}`);
  },

  // Admin: user management (any account, mainly customers).
  adminUsersList: (params?: { role?: string; q?: string; take?: number; skip?: number }) => {
    const qs = new URLSearchParams();
    if (params?.role) qs.set('role', params.role);
    if (params?.q) qs.set('q', params.q);
    if (params?.take) qs.set('take', String(params.take));
    if (params?.skip) qs.set('skip', String(params.skip));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<{ items: SafeUser[]; total: number }>(`/admin/users${suffix}`);
  },
  adminUserDetail: (id: string) =>
    apiFetch<{
      user: SafeUser;
      wallet: { id: string; isFrozen: boolean; balance: string | null; currency: string } | null;
      transactions: {
        id: string;
        type: string;
        status: string;
        amount: string;
        createdAt: string;
      }[];
      kycRecords: {
        id: string;
        tier: string;
        status: string;
        createdAt: string;
        rejectionReason: string | null;
        dateOfBirth: string | null;
        address: string | null;
        nin: string | null;
        documentUrl: string | null;
        livenessResult: string | null;
        verifiedAt: string | null;
      }[];
      supportTickets: { id: string; category: string; status: string; createdAt: string }[];
      auditLogs: AuditLogEntry[];
    }>(`/admin/users/${id}`),
  adminUserCreate: (payload: {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    password?: string;
  }) =>
    apiFetch<{ user: { id: string; email: string; phone: string }; tempPassword?: string }>(
      '/admin/users',
      { method: 'POST', body: JSON.stringify(payload) },
    ),
  adminUserUpdate: (
    id: string,
    payload: Partial<{ firstName: string; lastName: string; email: string; phone: string }>,
  ) => apiFetch<SafeUser>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  adminUserRestrict: (id: string, reason?: string) =>
    apiFetch<SafeUser>(`/admin/users/${id}/restrict`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  adminUserUnrestrict: (id: string) =>
    apiFetch<SafeUser>(`/admin/users/${id}/unrestrict`, { method: 'PATCH' }),
  adminUserFreezeWallet: (id: string) =>
    apiFetch(`/admin/users/${id}/wallet/freeze`, { method: 'PATCH' }),
  adminUserUnfreezeWallet: (id: string) =>
    apiFetch(`/admin/users/${id}/wallet/unfreeze`, { method: 'PATCH' }),
  adminUserDelete: (id: string) =>
    apiFetch<{ deleted: boolean; deactivated: boolean; id: string; reason?: string }>(
      `/admin/users/${id}`,
      { method: 'DELETE' },
    ),
  // Admin sets a new password for any account (customer, admin, or customer
  // care — this route isn't role-specific). Leave `password` unset to have
  // the server generate a temp one, returned once in the response — same
  // convention as adminUserCreate/adminStaffCreate.
  adminUserSetPassword: (id: string, password?: string) =>
    apiFetch<{ id: string; tempPassword?: string }>(`/admin/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    }),
  // Clears (never sets) a customer's transaction PIN — see backend
  // AdminService.resetTransactionPin for why. They'll be prompted to set a
  // fresh one from their profile page before their next payment.
  adminUserResetPin: (id: string) =>
    apiFetch<{ id: string; pinCleared: true }>(`/admin/users/${id}/reset-pin`, { method: 'PATCH' }),

  // Self-service: any logged-in user (customer, admin, or customer care)
  // changing their own password.
  changeMyPassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ updated: true }>('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Sets (first time) or changes (currentPin required — omit only when
  // me().pinSet is false) the transaction PIN required before every
  // debit-type purchase. Same shape as billerSetPin below, generalized to
  // any customer account.
  setMyPin: (pin: string, currentPin?: string) =>
    apiFetch<{ updated: true }>('/users/me/pin', {
      method: 'POST',
      body: JSON.stringify({ pin, currentPin }),
    }),

  // Admin: the biller feature (§ biller-feature-spec.md project doc). A
  // biller is single (one user) or joint (two users, A and B, who must both
  // approve a withdrawal) — see CreateBillerPayload.
  adminBillersList: () => apiFetch<BillerSummary[]>('/admin/billers'),
  adminBillerCreate: (payload: CreateBillerPayload) =>
    apiFetch<{ biller: BillerSummary; users: (BillerUserSummary & { tempPassword?: string })[] }>(
      '/admin/billers',
      { method: 'POST', body: JSON.stringify(payload) },
    ),
  adminBillerDetail: (id: string) => apiFetch<BillerDetail>(`/admin/billers/${id}`),
  adminBillerSetActive: (id: string, isActive: boolean) =>
    apiFetch<BillerSummary>(`/admin/billers/${id}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  adminGrantBillEdit: (billerId: string, note?: string) =>
    apiFetch(`/admin/billers/${billerId}/grant-bill-edit`, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    }),

  // --- Biller self-service (a logged-in BILLER-role user's own portal) ----
  billerMe: () =>
    apiFetch<{
      biller: { id: string; name: string; type: string; isJoint: boolean; isActive: boolean };
      myLabel: 'A' | 'B' | null;
      coSigner: { id: string; firstName: string; lastName: string; billerLabel: string } | null;
      pinSet: boolean;
    }>('/billers/me'),
  billerSetPin: (pin: string, currentPin?: string) =>
    apiFetch<{ updated: true }>('/billers/pin', {
      method: 'POST',
      body: JSON.stringify({ pin, currentPin }),
    }),
  billerBalance: () =>
    apiFetch<{ currency: string; balance: string; isFrozen: boolean }>('/billers/wallet/balance'),
  billerStatement: (params?: { limit?: number; cursor?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.cursor) qs.set('cursor', params.cursor);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<{
      items: {
        id: string;
        direction: 'DEBIT' | 'CREDIT';
        amount: string;
        transaction: { id: string; type: string; status: string; createdAt: string };
        createdAt: string;
      }[];
      nextCursor: string | null;
    }>(`/billers/wallet/statement${suffix}`);
  },
  billerWithdraw: (payload: {
    amount: string;
    bankName: string;
    accountNumber: string;
    confirmAccountNumber: string;
    accountName: string;
    pin: string;
  }) =>
    apiFetch<{ awaitingCoSignerApproval: boolean; withdrawalRequest?: WithdrawalRequest; draft?: BillerWithdrawalDraft }>(
      '/billers/wallet/withdraw',
      { method: 'POST', body: JSON.stringify(payload) },
    ),
  billerWithdrawDrafts: () => apiFetch<BillerWithdrawalDraft[]>('/billers/wallet/withdraw/drafts'),
  billerApproveDraft: (id: string, pin: string) =>
    apiFetch<BillerWithdrawalDraft>(`/billers/wallet/withdraw/drafts/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
  billerCancelDraft: (id: string) =>
    apiFetch<BillerWithdrawalDraft>(`/billers/wallet/withdraw/drafts/${id}/cancel`, { method: 'POST' }),
  billerWithdrawalsMine: () => apiFetch<WithdrawalRequest[]>('/billers/wallet/withdrawals/mine'),

  billerDepositInitiate: (amount: string) =>
    apiFetch<{ authorizationUrl?: string; reference: string }>('/billers/wallet/deposit/initiate', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  billerDepositVerify: (reference: string) =>
    apiFetch<{ credited: boolean; status: string }>(
      `/billers/wallet/deposit/verify/${encodeURIComponent(reference)}`,
    ),

  // Bill builder — each biller has exactly one bill.
  billerGetBill: () => apiFetch<BillDefinition | null>('/billers/bill'),
  billerUpsertBill: (payload: {
    name: string;
    fields: BillFieldInput[];
    pricingMode: 'FLAT' | 'PER_COMBINATION';
    flatAmount?: number;
    pricingTable?: Record<string, number>;
  }) => apiFetch<BillDefinition>('/billers/bill', { method: 'PUT', body: JSON.stringify(payload) }),
  billerPublishBill: () => apiFetch<BillDefinition>('/billers/bill/publish', { method: 'POST' }),
  billerRequestBillEdit: (reason?: string) =>
    apiFetch('/billers/bill/request-edit', { method: 'POST', body: JSON.stringify({ reason }) }),

  billerGetReportPreference: () =>
    apiFetch<{ frequency: 'DAILY' | 'WEEKLY' | 'EVERY_3_DAYS' | 'OFF'; lastSentAt: string | null }>(
      '/billers/report-preference',
    ),
  billerSetReportPreference: (frequency: 'DAILY' | 'WEEKLY' | 'EVERY_3_DAYS' | 'OFF') =>
    apiFetch('/billers/report-preference', { method: 'POST', body: JSON.stringify({ frequency }) }),

  billerListPayments: (params?: { from?: string; to?: string; extra?: Record<string, string> }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    Object.entries(params?.extra ?? {}).forEach(([k, v]) => qs.set(k, v));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<BillerPaymentRow[]>(`/billers/payments${suffix}`);
  },

  // --- Public bill catalog + payment (the customer Bills tab's category
  // browsing, AND the new no-login-required /pay-bill web flow) ----------
  billPayCategories: () => apiFetch<string[]>('/bill-pay/categories', { auth: false }),
  billPayBillersByCategory: (type: string) =>
    apiFetch<{ id: string; name: string; type: string; bill: { name: string } }[]>(
      `/bill-pay/categories/${encodeURIComponent(type)}/billers`,
      { auth: false },
    ),
  billPayBillDetail: (billerId: string) =>
    apiFetch<PublicBillDetail>(`/bill-pay/billers/${billerId}/bill`, { auth: false }),
  billPayQuote: (billerId: string, fieldValues: Record<string, string>) =>
    apiFetch<{ billAmount: number; portalFee: number; totalAmount: number }>(
      `/bill-pay/billers/${billerId}/quote`,
      { method: 'POST', body: JSON.stringify({ fieldValues }), auth: false },
    ),
  billPayWithWallet: (billerId: string, fieldValues: Record<string, string>) =>
    apiFetch(`/bill-pay/billers/${billerId}/pay/wallet`, {
      method: 'POST',
      body: JSON.stringify({ fieldValues }),
    }),
  billPayAsGuest: (
    billerId: string,
    payload: { fieldValues: Record<string, string>; guestName: string; guestEmail: string; guestPhone?: string },
  ) =>
    apiFetch<{ authorizationUrl?: string; reference: string; billerPaymentId: string }>(
      `/bill-pay/billers/${billerId}/pay/guest`,
      { method: 'POST', body: JSON.stringify(payload), auth: false },
    ),
  billPayVerify: (reference: string) =>
    apiFetch<{ credited: boolean; status: string }>(
      `/bill-pay/verify/${encodeURIComponent(reference)}`,
      { auth: false },
    ),
};

// --- Biller types --------------------------------------------------------

export type BillFieldInput = {
  key: string;
  label: string;
  type: 'TEXT' | 'SELECT';
  options?: string[];
};

export type BillDefinition = {
  id: string;
  billerId: string;
  name: string;
  fields: BillFieldInput[];
  pricingMode: 'FLAT' | 'PER_COMBINATION';
  flatAmount: string | null;
  pricingTable: Record<string, number> | null;
  status: 'DRAFT' | 'PUBLISHED';
  oneTimeEditUnlockedAt: string | null;
};

export type BillerWithdrawalDraft = {
  id: string;
  billerId: string;
  amount: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  initiatedByUserId: string;
  status: 'AWAITING_APPROVAL' | 'APPROVED' | 'CANCELLED';
  createdAt: string;
};

export type BillerPaymentRow = {
  id: string;
  payerName?: string;
  guestEmail: string | null;
  guestPhone: string | null;
  userId: string | null;
  fieldValues: Record<string, string>;
  billAmount: string;
  portalFee: string;
  totalAmount: string;
  paymentMethod: 'WALLET' | 'PAYSTACK';
  createdAt: string;
};

export type PublicBillDetail = {
  billerId: string;
  billerName: string;
  billName: string;
  fields: BillFieldInput[];
  pricingMode: 'FLAT' | 'PER_COMBINATION';
  flatAmount: string | null;
  pricingTable: Record<string, number> | null;
  portalFee: string;
};

/** Query/export/report endpoints stream text/csv, not JSON, so — same
 * reasoning as manualPaymentReceiptUrl below — the caller builds a URL and
 * fetches it directly (with the bearer token) rather than going through
 * apiFetch. */
export function billerPaymentsExportCsvUrl(params?: { from?: string; to?: string; extra?: Record<string, string> }) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? apiBaseUrlForLinks();
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  Object.entries(params?.extra ?? {}).forEach(([k, v]) => qs.set(k, v));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return `${base}/billers/payments/export.csv${suffix}`;
}

export function billerDailyReportUrl(date?: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? apiBaseUrlForLinks();
  return `${base}/billers/payments/daily-report${date ? `?date=${date}` : ''}`;
}

function apiBaseUrlForLinks() {
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:3000/api/v1`;
  return 'http://localhost:3000/api/v1';
}

export interface SafeUser {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: 'CUSTOMER' | 'ADMIN' | 'CUSTOMER_CARE';
  kycTier: string;
  isActive: boolean;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetEntity: string;
  targetId: string;
  beforeState: unknown;
  afterState: unknown;
  createdAt: string;
  actor?: { firstName: string; lastName: string; email: string; role: string };
}

// Manual-payment receipts are streamed (application/pdf), not JSON, so they
// don't go through apiFetch — this just gives the caller a URL + the auth
// token needed to fetch it (e.g. for an <a> the click handler fetches and
// opens as a blob, since the endpoint requires the bearer token).
export function manualPaymentReceiptUrl(id: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';
  return `${base}/manual-payments/${id}/receipt`;
}
