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

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const token = auth ? getToken() : null;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

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
    }>('/users/me'),
  walletBalance: () =>
    apiFetch<{
      currency: string;
      balance: string;
      virtualAccountNumber: string | null;
      virtualAccountBank: string | null;
      virtualAccountProvider: string | null;
    }>('/wallet/balance'),
  walletStatement: (params?: { limit?: number; cursor?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.cursor) qs.set('cursor', params.cursor);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<{
      items: {
        id: string;
        type: string;
        status: string;
        amount: string;
        fee: string;
        createdAt: string;
        completedAt: string | null;
      }[];
      nextCursor: string | null;
    }>(`/wallet/statement${suffix}`);
  },
  provisionVirtualAccount: () =>
    apiFetch<{ accountNumber: string; bankName: string }>('/payments/virtual-account', {
      method: 'POST',
    }),

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
    apiFetch<{ sent: boolean; channel: string; expiresInMinutes: number }>('/kyc/otp/request', {
      method: 'POST',
      body: JSON.stringify({ channel }),
    }),
  kycConfirmOtp: (channel: 'EMAIL' | 'PHONE', code: string) =>
    apiFetch<{ verified: boolean; channel: string }>('/kyc/otp/confirm', {
      method: 'POST',
      body: JSON.stringify({ channel, code }),
    }),
  kycSubmit: (payload: { dateOfBirth: string; address: string; nin: string }) =>
    apiFetch('/kyc/submit', { method: 'POST', body: JSON.stringify(payload) }),

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

  // Self-service: any logged-in user (customer, admin, or customer care)
  // changing their own password.
  changeMyPassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ updated: true }>('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
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
};

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
