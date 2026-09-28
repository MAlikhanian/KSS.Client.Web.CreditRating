'use client';

/**
 * Backed by the KSS.Service.SEBA_ERP_CreditRating C# service via Next.js
 * proxy routes under /api/credit-rating/*. The local-storage implementation
 * was removed when the backend went live.
 */

/**
 * Workflow status codes — must match KSS.Entity.AssessmentStatus on the backend.
 *   1  = PendingApproval (initial; editable + deletable)
 *   10 = Approved (frozen; calculation pending)
 *   11 = Rejected (frozen, terminal)
 *   21 = Calculated (frozen, terminal)
 *   30 = Deleted (soft-delete, frozen)
 */
export const STATUS_PENDING_APPROVAL = 1;
export const STATUS_APPROVED = 10;
export const STATUS_REJECTED = 11;
export const STATUS_CALCULATED = 21;
export const STATUS_DELETED = 30;

export type AssessmentStatusCode = 1 | 10 | 11 | 21 | 30;

export const isFrozen = (status: AssessmentStatusCode): boolean => status >= 10;

export interface AssessmentDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: AssessmentStatusCode;
  approvedAt?: string;
  rejectionReason?: string;
  // Audit — populated by the backend from the JWT personId claim.
  createdBy?: string;
  updatedBy?: string;
  // Last time the approval-request notification was sent (for resend throttling).
  lastApprovalRequestSentAt?: string;
  brokerageId?: string;
  brokerageName?: string;
  customer?: {
    personId: string;
    fullName: string;
    nationalId: string;
    mobile: string;
  };
  bourseCode: string;
  financial: {
    totalAssets: number | '';
    commercialDebt: number | '';
    guaranteeValue: number | '';
    tradingCommission: number | '';
    article13History: number | '';
  };
  operational: {
    riskStatusLastDay: 'callMargin' | 'atRisk' | 'noRisk' | '';
    riskStatusDayBeforeLast: 'callMargin' | 'atRisk' | 'noRisk' | '';
    riskStatusTwoDaysBeforeLast: 'callMargin' | 'atRisk' | 'noRisk' | '';
    article12Compliance: boolean | null;
    article12History: number | '';
  };
  violation: {
    lawsuitsHistory: number | '';
    tradingRestrictionsHistory: number | '';
  };
}

interface BackendDto {
  id: string;
  personId: string;
  brokerageId: string;
  status: AssessmentStatusCode;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  totalAssets: number;
  commercialDebt: number;
  guaranteeValue: number;
  tradingCommission: number;
  article13History: number;
  riskStatusLastDay: string;
  riskStatusDayBeforeLast: string;
  riskStatusTwoDaysBeforeLast: string;
  article12Compliance: boolean;
  article12History: number;
  lawsuitsHistory: number;
  tradingRestrictionsHistory: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string | null;
  lastApprovalRequestSentAt?: string | null;
}

export const newAssessmentId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const emptyDraft = (id: string): AssessmentDraft => ({
  id,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: STATUS_PENDING_APPROVAL,
  bourseCode: '',
  financial: {
    totalAssets: '',
    commercialDebt: '',
    guaranteeValue: '',
    tradingCommission: '',
    article13History: '',
  },
  operational: {
    riskStatusLastDay: '',
    riskStatusDayBeforeLast: '',
    riskStatusTwoDaysBeforeLast: '',
    article12Compliance: null,
    article12History: '',
  },
  violation: {
    lawsuitsHistory: '',
    tradingRestrictionsHistory: '',
  },
});

const numOrZero = (v: number | ''): number => (v === '' ? 0 : v);

const draftToDto = (d: AssessmentDraft): Partial<BackendDto> => ({
  id: d.id,
  personId: d.customer?.personId ?? '',
  brokerageId: d.brokerageId ?? '',
  status: d.status,
  totalAssets: numOrZero(d.financial.totalAssets),
  commercialDebt: numOrZero(d.financial.commercialDebt),
  guaranteeValue: numOrZero(d.financial.guaranteeValue),
  tradingCommission: numOrZero(d.financial.tradingCommission),
  article13History: numOrZero(d.financial.article13History),
  riskStatusLastDay: d.operational.riskStatusLastDay || '',
  riskStatusDayBeforeLast: d.operational.riskStatusDayBeforeLast || '',
  riskStatusTwoDaysBeforeLast: d.operational.riskStatusTwoDaysBeforeLast || '',
  article12Compliance: d.operational.article12Compliance ?? false,
  article12History: numOrZero(d.operational.article12History),
  lawsuitsHistory: numOrZero(d.violation.lawsuitsHistory),
  tradingRestrictionsHistory: numOrZero(d.violation.tradingRestrictionsHistory),
});

const dtoToDraft = (d: BackendDto): AssessmentDraft => ({
  id: d.id,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
  status: d.status,
  approvedAt: d.approvedAt ?? undefined,
  rejectionReason: d.rejectionReason ?? undefined,
  createdBy: d.createdBy ?? undefined,
  updatedBy: d.updatedBy ?? undefined,
  lastApprovalRequestSentAt: d.lastApprovalRequestSentAt ?? undefined,
  brokerageId: d.brokerageId || undefined,
  brokerageName: undefined,
  customer: d.personId
    ? { personId: d.personId, fullName: '', nationalId: '', mobile: '' }
    : undefined,
  bourseCode: '',
  financial: {
    totalAssets: d.totalAssets,
    commercialDebt: d.commercialDebt,
    guaranteeValue: d.guaranteeValue,
    tradingCommission: d.tradingCommission,
    article13History: d.article13History,
  },
  operational: {
    riskStatusLastDay: (d.riskStatusLastDay as AssessmentDraft['operational']['riskStatusLastDay']) ?? '',
    riskStatusDayBeforeLast: (d.riskStatusDayBeforeLast as AssessmentDraft['operational']['riskStatusDayBeforeLast']) ?? '',
    riskStatusTwoDaysBeforeLast: (d.riskStatusTwoDaysBeforeLast as AssessmentDraft['operational']['riskStatusTwoDaysBeforeLast']) ?? '',
    article12Compliance: d.article12Compliance,
    article12History: d.article12History,
  },
  violation: {
    lawsuitsHistory: d.lawsuitsHistory,
    tradingRestrictionsHistory: d.tradingRestrictionsHistory,
  },
});

export async function listAssessments(): Promise<AssessmentDraft[]> {
  const r = await fetch('/credit-rating/api/credit-rating/assessment', { cache: 'no-store' });
  if (!r.ok) return [];
  const dtos = (await r.json()) as BackendDto[];
  return dtos
    .map(dtoToDraft)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getAssessment(id: string): Promise<AssessmentDraft | undefined> {
  const r = await fetch(`/credit-rating/api/credit-rating/assessment/${id}`, { cache: 'no-store' });
  if (r.status === 404) return undefined;
  if (!r.ok) return undefined;
  const dto = (await r.json()) as BackendDto;
  return dtoToDraft(dto);
}

// Pull a clean message out of the proxy's `{message: "..."}` JSON body so the
// toast shows just the Persian sentence, never a JSON blob.
async function readErrorMessage(r: Response, fallback: string): Promise<string> {
  const body = await r.text();
  if (body && body.trimStart().startsWith('{')) {
    try {
      const parsed = JSON.parse(body) as { message?: unknown };
      if (typeof parsed.message === 'string' && parsed.message.length > 0) {
        return parsed.message;
      }
    } catch {
      // fall through
    }
  }
  return body || fallback;
}

// One round-trip: backend upserts the row, snapshots the portfolio, fires the
// calculation service. (No separate "draft" concept on the UI — every save goes
// straight to the DB and triggers the calc service.)
export async function saveAssessment(draft: AssessmentDraft): Promise<AssessmentDraft> {
  const dto = draftToDto(draft);
  if (!dto.personId || !dto.brokerageId) {
    throw new Error('Customer and brokerage are required.');
  }
  const r = await fetch('/credit-rating/api/credit-rating/assessment/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!r.ok) {
    throw new Error(await readErrorMessage(r, 'Failed to save assessment.'));
  }
  const saved = (await r.json()) as BackendDto;
  return dtoToDraft(saved);
}

export async function deleteAssessment(id: string): Promise<void> {
  const r = await fetch(`/credit-rating/api/credit-rating/assessment/${id}`, { method: 'DELETE' });
  if (!r.ok) {
    throw new Error(await readErrorMessage(r, 'Failed to delete assessment.'));
  }
}

export async function approveAssessment(id: string): Promise<AssessmentDraft> {
  const r = await fetch(`/credit-rating/api/credit-rating/assessment/${id}/approve`, { method: 'POST' });
  if (!r.ok) {
    throw new Error(await readErrorMessage(r, 'Failed to approve assessment.'));
  }
  const saved = (await r.json()) as BackendDto;
  return dtoToDraft(saved);
}

export async function rejectAssessment(id: string, reason?: string): Promise<AssessmentDraft> {
  const r = await fetch(`/credit-rating/api/credit-rating/assessment/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason?.trim() || null }),
  });
  if (!r.ok) {
    throw new Error(await readErrorMessage(r, 'Failed to reject assessment.'));
  }
  const saved = (await r.json()) as BackendDto;
  return dtoToDraft(saved);
}

export async function resendApprovalNotification(id: string): Promise<void> {
  const r = await fetch(`/credit-rating/api/credit-rating/assessment/${id}/resend-notification`, {
    method: 'POST',
  });
  if (!r.ok) {
    throw new Error(await readErrorMessage(r, 'Failed to resend approval request.'));
  }
}
