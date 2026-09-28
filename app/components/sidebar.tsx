'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { Building2, ShieldCheck, Clock, BarChart3, User } from 'lucide-react';
import {
  STATUS_PENDING_APPROVAL,
  STATUS_APPROVED,
  STATUS_REJECTED,
  STATUS_CALCULATED,
  STATUS_DELETED,
  type AssessmentDraft,
  type AssessmentStatusCode,
} from './assessment-store';
import { formatDateTime } from '@/app/components/person/format-utils';

interface SidebarProps {
  draft: AssessmentDraft;
  completionPercent: number;
}

const STATUS_KEY: Record<AssessmentStatusCode, string> = {
  [STATUS_PENDING_APPROVAL]: 'statusPendingApproval',
  [STATUS_APPROVED]: 'statusApproved',
  [STATUS_REJECTED]: 'statusRejected',
  [STATUS_CALCULATED]: 'statusCalculated',
  [STATUS_DELETED]: 'statusDeleted',
};

export function Sidebar({ draft, completionPercent }: SidebarProps) {
  const { t, i18n } = useTranslation('credit-rating-sidebar');
  const { t: tList } = useTranslation('credit-rating-list');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title', { defaultValue: 'Assessment Cardex' })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 text-center">
          <div className="w-24 h-24 rounded-full mx-auto mb-3 overflow-hidden bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <p className="text-sm text-foreground font-medium">
            {draft.customer?.fullName ?? t('noCustomerSelected', { defaultValue: 'No customer selected' })}
          </p>
          {draft.customer?.nationalId && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {draft.customer.nationalId}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Building2 className="text-white w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('brokerage', { defaultValue: 'Brokerage' })}
              </p>
              <p className="text-xs text-muted-foreground">
                {draft.brokerageName ?? '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('riskTier', { defaultValue: 'Risk Tier' })}
              </p>
              <p className="text-xs text-muted-foreground">
                {tList('tierPending', { defaultValue: 'Pending calculation' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="text-white w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('completionPercent', { defaultValue: 'Completion %' })}
              </p>
              <p className="text-xs text-muted-foreground">
                {completionPercent.toLocaleString(locale)}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <Clock className="text-white w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('lastUpdated', { defaultValue: 'Last Updated' })}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(draft.updatedAt, locale)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">●</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('status', { defaultValue: 'Status' })}
              </p>
              <p className="text-xs text-muted-foreground">
                {tList(STATUS_KEY[draft.status], { defaultValue: String(draft.status) })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
