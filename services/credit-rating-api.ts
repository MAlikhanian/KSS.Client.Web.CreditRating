/**
 * KSS Credit Rating Service (KSS.Service.SEBA_ERP_CreditRating)
 *
 * Server-side fetch wrappers. Base URL from CREDIT_RATING_API_BASE_URL env.
 * All endpoints require JWT Bearer token from Auth service.
 */

function getBaseUrl(): string {
  const baseUrl = process.env.CREDIT_RATING_API_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      'CREDIT_RATING_API_BASE_URL environment variable is required but not set.',
    );
  }
  return baseUrl;
}

export interface AssessmentDto {
  id: string;
  personId: string;
  brokerageId: string;
  status: 'draft' | 'submitted' | 'calculated';

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
}

export interface CalculationDto {
  id: string;
  assessmentId: string;
  valueAtRisk: number | null;
  tradingTurnover: number | null;
  brokerageCount: number | null;
  riskScore: number | null;
  riskTier: string | null;
  calculatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

async function authFetch(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = `${getBaseUrl()}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
}

export async function listAssessmentsAll(
  token: string,
): Promise<AssessmentDto[]> {
  const r = await authFetch(token, '/Api/Assessment/ToListAll');
  if (!r.ok) throw new Error(`List failed: ${r.status}`);
  return r.json();
}

export async function listAssessmentsByPerson(
  token: string,
  personId: string,
): Promise<AssessmentDto[]> {
  const r = await authFetch(
    token,
    `/Api/Assessment/ListByPerson/${personId}`,
  );
  if (!r.ok) throw new Error(`List failed: ${r.status}`);
  return r.json();
}

export async function getAssessment(
  token: string,
  id: string,
): Promise<AssessmentDto | null> {
  const r = await authFetch(
    token,
    `/Api/Assessment/FindByIdWithDetails/${id}`,
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Get failed: ${r.status}`);
  return r.json();
}

export async function createAssessment(
  token: string,
  body: Partial<AssessmentDto>,
): Promise<AssessmentDto> {
  const r = await authFetch(token, '/Api/Assessment/AddDto', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Create failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function updateAssessment(
  token: string,
  body: AssessmentDto,
): Promise<void> {
  const r = await authFetch(token, '/Api/Assessment/UpdateDto', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Update failed: ${r.status} ${await r.text()}`);
}

export async function removeAssessment(
  token: string,
  body: { id: string },
): Promise<void> {
  const r = await authFetch(token, '/Api/Assessment/Remove', {
    method: 'DELETE',
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Delete failed: ${r.status} ${await r.text()}`);
}

export async function approveAssessmentApi(
  token: string,
  id: string,
): Promise<AssessmentDto> {
  const r = await authFetch(
    token,
    `/Api/Management/Approve/${id}`,
    { method: 'POST' },
  );
  if (!r.ok) throw new UpstreamError(r.status, await r.text());
  return r.json();
}

export async function rejectAssessmentApi(
  token: string,
  id: string,
  reason: string | null,
): Promise<AssessmentDto> {
  const r = await authFetch(
    token,
    `/Api/Management/Reject/${id}`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
  if (!r.ok) throw new UpstreamError(r.status, await r.text());
  return r.json();
}

export async function softDeleteAssessmentApi(
  token: string,
  id: string,
): Promise<void> {
  const r = await authFetch(
    token,
    `/Api/Management/SoftDelete/${id}`,
    { method: 'POST' },
  );
  if (!r.ok) throw new UpstreamError(r.status, await r.text());
}

export async function resendApprovalNotificationApi(
  token: string,
  id: string,
): Promise<void> {
  const r = await authFetch(
    token,
    `/Api/Management/ResendApprovalNotification/${id}`,
    { method: 'POST' },
  );
  if (!r.ok) throw new UpstreamError(r.status, await r.text());
}

export class UpstreamError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Upstream ${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

// Single round-trip: upsert + snapshot + trigger calc, all in one backend call.
// Used by the form. Replaces createAssessment + updateAssessment + submitAssessment.
export async function saveAndCalculate(
  token: string,
  body: Partial<AssessmentDto>,
): Promise<AssessmentDto> {
  const r = await authFetch(token, '/Api/Management/Save', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new UpstreamError(r.status, await r.text());
  return r.json();
}

export async function getCalculation(
  token: string,
  assessmentId: string,
): Promise<CalculationDto | null> {
  const r = await authFetch(
    token,
    `/Api/Calculation/FindByAssessmentId/${assessmentId}`,
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Get calculation failed: ${r.status}`);
  return r.json();
}

export async function listCalculations(
  token: string,
): Promise<CalculationDto[]> {
  const r = await authFetch(token, `/Api/Calculation/ToListAll`);
  if (!r.ok) return [];
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

export async function listCalculationsByPerson(
  token: string,
  personId: string,
): Promise<CalculationDto[]> {
  const r = await authFetch(token, `/Api/Calculation/ListByPerson/${personId}`);
  if (!r.ok) return [];
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

export interface MarketCalculationDto {
  id: string;
  personId: string;
  aggregateRiskScore: number | null;
  aggregateRiskTier: string | null;
  totalValueAtRisk: number;
  totalTradingTurnover: number;
  totalBrokerageCount: number;
  lastCalculatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getMarketCalculation(
  token: string,
  personId: string,
): Promise<MarketCalculationDto | null> {
  const r = await authFetch(token, `/Api/Management/GetMarketCalculation/${personId}`);
  if (r.status === 404) return null;
  if (!r.ok) return null;
  return r.json();
}

// ─── CreditRating Access (per-person grants on a subject) ───
// SubjectType: 1=Person, 2=Brokerage.
export type CreditRatingSubjectType = 1 | 2;

async function throwApiError(response: Response, fallback: string): Promise<never> {
  const text = await response.text();
  throw new Error(text || `${fallback}: ${response.status}`);
}

export interface CreditRatingAccessLevels {
  assessment: number;
}

export interface CreditRatingAccessGrantSummary {
  subjectType: CreditRatingSubjectType;
  subjectId: string;
  grantedToPersonId: string;
  assessmentLevel: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface UpsertCreditRatingAccessGrantBody {
  subjectType: CreditRatingSubjectType;
  subjectId: string;
  grantedToPersonId: string;
  assessmentLevel: number;
}

export async function listCreditRatingAccessByPair(
  token: string,
  subjectType: CreditRatingSubjectType,
  subjectId: string,
): Promise<CreditRatingAccessGrantSummary[]> {
  const r = await authFetch(token, `/Api/Access/ByPair/${subjectType}/${subjectId}`);
  if (!r.ok) await throwApiError(r, 'Failed to list credit-rating access grants.');
  return r.json();
}

export async function getCreditRatingMyLevels(
  token: string,
  subjectType: CreditRatingSubjectType,
  subjectId: string,
): Promise<CreditRatingAccessLevels> {
  const r = await authFetch(token, `/Api/Access/MyLevels/${subjectType}/${subjectId}`);
  if (!r.ok) await throwApiError(r, 'Failed to fetch credit-rating access levels.');
  const v = await r.json();
  return {
    assessment: typeof v?.assessment === 'number' ? v.assessment : 0,
  };
}

export async function upsertCreditRatingAccessGrant(
  token: string,
  body: UpsertCreditRatingAccessGrantBody,
): Promise<void> {
  const r = await authFetch(token, `/Api/Access/Grant`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!r.ok) await throwApiError(r, 'Failed to grant credit-rating access.');
}

export async function revokeCreditRatingAccessByPair(
  token: string,
  subjectType: CreditRatingSubjectType,
  subjectId: string,
  grantedToPersonId: string,
): Promise<void> {
  const r = await authFetch(
    token,
    `/Api/Access/RevokeByPair/${subjectType}/${subjectId}/${grantedToPersonId}`,
    { method: 'POST' },
  );
  if (!r.ok) await throwApiError(r, 'Failed to revoke credit-rating access.');
}

// ─── CreditRating Role Access ───
export interface CreditRatingRoleAccessGrantSummary {
  subjectType: CreditRatingSubjectType | null;
  subjectId: string | null;
  grantedToRoleId: string;
  assessmentLevel: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface UpsertCreditRatingRoleAccessGrantBody {
  subjectType: CreditRatingSubjectType | null;
  subjectId: string | null;
  grantedToRoleId: string;
  assessmentLevel: number;
}

export async function listCreditRatingRoleAccessByPair(
  token: string,
  subjectType: CreditRatingSubjectType,
  subjectId: string,
): Promise<CreditRatingRoleAccessGrantSummary[]> {
  const r = await authFetch(token, `/Api/RoleAccess/ByPair/${subjectType}/${subjectId}`);
  if (!r.ok) await throwApiError(r, 'Failed to list credit-rating role-access grants.');
  return r.json();
}

export async function listAllCreditRatingRoleAccess(
  token: string,
): Promise<CreditRatingRoleAccessGrantSummary[]> {
  const r = await authFetch(token, `/Api/RoleAccess/All`);
  if (!r.ok) await throwApiError(r, 'Failed to list all credit-rating role-access grants.');
  return r.json();
}

export async function upsertCreditRatingRoleAccessGrant(
  token: string,
  body: UpsertCreditRatingRoleAccessGrantBody,
): Promise<void> {
  const r = await authFetch(token, `/Api/RoleAccess/Grant`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!r.ok) await throwApiError(r, 'Failed to grant credit-rating role-access.');
}

export async function revokeCreditRatingRoleAccessByPair(
  token: string,
  grantedToRoleId: string,
  subjectType: CreditRatingSubjectType | null,
  subjectId: string | null,
): Promise<void> {
  const params = new URLSearchParams({ grantedToRoleId });
  if (subjectType !== null && subjectId) {
    params.set('subjectType', String(subjectType));
    params.set('subjectId', subjectId);
  }
  const r = await authFetch(token, `/Api/RoleAccess/RevokeByPair?${params.toString()}`, {
    method: 'POST',
  });
  if (!r.ok) await throwApiError(r, 'Failed to revoke credit-rating role-access.');
}
