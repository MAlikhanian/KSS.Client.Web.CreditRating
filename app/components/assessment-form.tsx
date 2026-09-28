'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { Sidebar } from './sidebar';
import { BrokerageSelectionCardWrapper } from './brokerage-selection-card-wrapper';
import { CustomerSelectionCard } from './customer-selection-card';
import { CustomerBrokerageInfo } from './customer-brokerage-info';
import { CustomerFinancialSection } from './sections/customer-financial-section';
import { PortfolioShareSection } from './sections/portfolio-share-section';
import { CustomerOperationalSection } from './sections/customer-operational-section';
import { CustomerViolationSection } from './sections/customer-violation-section';
import {
  emptyDraft,
  newAssessmentId,
  saveAssessment,
  approveAssessment,
  rejectAssessment,
  resendApprovalNotification,
  getAssessment,
  STATUS_PENDING_APPROVAL,
  STATUS_APPROVED,
  STATUS_REJECTED,
  STATUS_CALCULATED,
  STATUS_DELETED,
  isFrozen,
  type AssessmentDraft,
  type AssessmentStatusCode,
} from './assessment-store';

type FormMode = 'new' | 'edit' | 'view';

interface AssessmentFormProps {
  assessmentId?: string;
  mode?: FormMode;
}

const isFilled = (v: unknown) => v !== '' && v !== null && v !== undefined;

const computeCompletion = (d: AssessmentDraft): number => {
  const checks: boolean[] = [
    !!d.brokerageId,
    !!d.customer,
    isFilled(d.financial.totalAssets),
    isFilled(d.financial.commercialDebt),
    isFilled(d.financial.guaranteeValue),
    isFilled(d.financial.tradingCommission),
    isFilled(d.financial.article13History),
    !!d.operational.riskStatusLastDay,
    !!d.operational.riskStatusDayBeforeLast,
    !!d.operational.riskStatusTwoDaysBeforeLast,
    d.operational.article12Compliance !== null,
    isFilled(d.operational.article12History),
    isFilled(d.violation.lawsuitsHistory),
    isFilled(d.violation.tradingRestrictionsHistory),
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
};

const STATUS_VARIANT: Record<AssessmentStatusCode, 'secondary' | 'primary' | 'success' | 'destructive'> = {
  [STATUS_PENDING_APPROVAL]: 'secondary',
  [STATUS_APPROVED]: 'primary',
  [STATUS_REJECTED]: 'destructive',
  [STATUS_CALCULATED]: 'success',
  [STATUS_DELETED]: 'secondary',
};

const STATUS_KEY: Record<AssessmentStatusCode, string> = {
  [STATUS_PENDING_APPROVAL]: 'statusPendingApproval',
  [STATUS_APPROVED]: 'statusApproved',
  [STATUS_REJECTED]: 'statusRejected',
  [STATUS_CALCULATED]: 'statusCalculated',
  [STATUS_DELETED]: 'statusDeleted',
};

export function AssessmentForm({ assessmentId, mode = 'new' }: AssessmentFormProps) {
  const { t } = useTranslation('credit-rating-form');
  const router = useRouter();
  const { data: session } = useSession();
  const callerPersonId = session?.user?.personId;

  const [draft, setDraft] = useState<AssessmentDraft>(() => emptyDraft(newAssessmentId()));
  const [hydrated, setHydrated] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (assessmentId) {
        const existing = await getAssessment(assessmentId);
        if (existing && !cancelled) {
          setDraft(existing);
          // If user opened the edit page on a frozen record, send them to the view page.
          if (mode === 'edit' && isFrozen(existing.status)) {
            router.replace(`/${assessmentId}`);
            return;
          }
        }
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [assessmentId, mode, router]);

  const handlePatch = useCallback((patch: Partial<AssessmentDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const completion = useMemo(() => computeCompletion(draft), [draft]);

  const showError = (msg: string) => {
    toast.custom(
      () => (
        <Alert variant="mono" icon="destructive">
          <AlertIcon>
            <RiErrorWarningFill />
          </AlertIcon>
          <AlertTitle>{msg}</AlertTitle>
        </Alert>
      ),
      { position: 'top-center' },
    );
  };

  const showSuccess = (msg: string) => {
    toast.custom(
      () => (
        <Alert variant="mono" icon="success">
          <AlertIcon>
            <RiCheckboxCircleFill />
          </AlertIcon>
          <AlertTitle>{msg}</AlertTitle>
        </Alert>
      ),
      { position: 'top-center' },
    );
  };

  const handleSubmit = async () => {
    if (completion < 100) {
      showError(t('validationFailed', { defaultValue: 'Please complete all required fields' }));
      return;
    }
    setBusy(true);
    try {
      await saveAssessment(draft);
      showSuccess(t('submitted', { defaultValue: 'Assessment saved and sent for approval' }));
      router.push('/list');
    } catch (err) {
      showError(err instanceof Error ? err.message : t('submitFailed', { defaultValue: 'Submit failed' }));
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!assessmentId) return;
    setBusy(true);
    try {
      await approveAssessment(assessmentId);
      showSuccess(t('approveSuccess', { defaultValue: 'Assessment approved' }));
      router.push('/list');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!assessmentId) return;
    setBusy(true);
    try {
      await rejectAssessment(assessmentId, rejectReason || undefined);
      showSuccess(t('rejectSuccess', { defaultValue: 'Assessment rejected' }));
      router.push('/list');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!assessmentId) return;
    setBusy(true);
    try {
      await resendApprovalNotification(assessmentId);
      showSuccess(t('resendSuccess', { defaultValue: 'Approval request sent again' }));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated) {
    return null;
  }

  const readOnly = mode === 'view';
  const lockedSelection = mode === 'edit' || mode === 'view';
  const showStatus = mode !== 'new';
  // Only the customer (PersonId on the assessment) can approve/reject. Compare
  // case-insensitively since Guids may come from the JWT in different casing.
  const isCallerTheCustomer =
    !!callerPersonId &&
    !!draft.customer?.personId &&
    callerPersonId.toLowerCase() === draft.customer.personId.toLowerCase();
  const isCallerTheCreator =
    !!callerPersonId &&
    !!draft.createdBy &&
    callerPersonId.toLowerCase() === draft.createdBy.toLowerCase();
  const canApproveOrReject =
    mode === 'view' && draft.status === STATUS_PENDING_APPROVAL && isCallerTheCustomer;
  // Creator-only Resend, shown when status is still pending and the caller is
  // NOT the customer (the customer sees Approve/Reject in this same banner).
  const canResend =
    mode === 'view' &&
    draft.status === STATUS_PENDING_APPROVAL &&
    isCallerTheCreator &&
    !canApproveOrReject;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 lg:gap-7.5">
      <div className="col-span-3">
        <div className="space-y-6">
          {showStatus && (
            <div
              className={`flex items-center justify-between p-4 rounded-md border ${
                draft.status === STATUS_REJECTED
                  ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900'
                  : draft.status === STATUS_APPROVED || draft.status === STATUS_CALCULATED
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-900'
                    : draft.status === STATUS_PENDING_APPROVAL
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900'
                      : 'bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {t('colStatus', { defaultValue: 'Status' })}:
                </span>
                <Badge variant={STATUS_VARIANT[draft.status]}>
                  {t(STATUS_KEY[draft.status], { defaultValue: String(draft.status) })}
                </Badge>
                {draft.status === STATUS_REJECTED && draft.rejectionReason && (
                  <span className="text-sm text-muted-foreground italic">
                    — {draft.rejectionReason}
                  </span>
                )}
              </div>
              {canApproveOrReject && (
                <div className="flex gap-2">
                  <Button
                    disabled={busy}
                    onClick={handleApprove}
                    className="min-w-[140px] bg-green-500 hover:bg-green-600 text-white"
                  >
                    {t('approve', { defaultValue: 'Approve' })}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => setShowRejectInput((v) => !v)}
                    className="min-w-[140px]"
                  >
                    {t('reject', { defaultValue: 'Reject' })}
                  </Button>
                </div>
              )}
              {canResend && (
                <div className="flex gap-2">
                  <Button
                    disabled={busy}
                    onClick={handleResend}
                    className="min-w-[140px] bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {t('resendApproval', { defaultValue: 'Resend Approval' })}
                  </Button>
                </div>
              )}
            </div>
          )}

          {showRejectInput && canApproveOrReject && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-md space-y-3">
              <Textarea
                placeholder={t('rejectReasonPlaceholder', { defaultValue: 'Enter reject reason (optional)' })}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setShowRejectInput(false); setRejectReason(''); }}>
                  {t('cancel', { defaultValue: 'Cancel' })}
                </Button>
                <Button variant="destructive" disabled={busy} onClick={handleReject}>
                  {t('confirmReject', { defaultValue: 'Confirm Reject' })}
                </Button>
              </div>
            </div>
          )}

          {mode === 'view' ? (
            <CustomerBrokerageInfo draft={draft} />
          ) : mode === 'edit' ? (
            <CustomerBrokerageInfo draft={draft} showBadge={false} />
          ) : (
            <>
              <BrokerageSelectionCardWrapper draft={draft} onChange={handlePatch} readOnly={lockedSelection} />
              <CustomerSelectionCard draft={draft} onChange={handlePatch} readOnly={lockedSelection} />
            </>
          )}
          <CustomerFinancialSection
            draft={draft}
            onChange={handlePatch}
            readOnly={readOnly}
            number={mode === 'view' ? 3 : 1}
          />
          <CustomerOperationalSection
            draft={draft}
            onChange={handlePatch}
            readOnly={readOnly}
            number={mode === 'view' ? 4 : 2}
          />
          <CustomerViolationSection
            draft={draft}
            onChange={handlePatch}
            readOnly={readOnly}
            number={mode === 'view' ? 5 : 3}
          />
          <PortfolioShareSection
            draft={draft}
            number={mode === 'view' ? 6 : 4}
            showManageHint={mode !== 'view'}
          />

          {mode !== 'view' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('operations', { defaultValue: 'Operations' })}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end space-x-4 space-x-reverse">
                  <Button type="button" disabled={busy} onClick={handleSubmit}>
                    {mode === 'edit'
                      ? t('saveChanges', { defaultValue: 'Save Changes' })
                      : t('submitForCalculation', { defaultValue: 'Save & Send for Approval' })}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <div className="col-span-1">
        <div className="grid gap-5 lg:gap-7.5">
          <Sidebar draft={draft} completionPercent={completion} />
        </div>
      </div>
    </div>
  );
}
