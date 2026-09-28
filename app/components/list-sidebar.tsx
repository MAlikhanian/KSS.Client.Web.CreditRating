'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { BarChart3, Clock, CheckCircle2, ThumbsUp, ThumbsDown, Hourglass } from 'lucide-react';
import { formatDateTime } from '@/app/components/person/format-utils';
import {
  STATUS_PENDING_APPROVAL,
  STATUS_APPROVED,
  STATUS_REJECTED,
  STATUS_CALCULATED,
  type AssessmentDraft,
} from './assessment-store';

interface ListSidebarProps {
  items: AssessmentDraft[];
}

export function ListSidebar({ items }: ListSidebarProps) {
  const { t, i18n } = useTranslation('credit-rating-sidebar');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';

  const total = items.length;
  const pendingCount = items.filter((a) => a.status === STATUS_PENDING_APPROVAL).length;
  const approvedCount = items.filter((a) => a.status === STATUS_APPROVED).length;
  const rejectedCount = items.filter((a) => a.status === STATUS_REJECTED).length;
  const calculatedCount = items.filter((a) => a.status === STATUS_CALCULATED).length;
  const lastUpdated = items[0]?.updatedAt;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('listTitle', { defaultValue: 'Assessment Stats' })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="text-white w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('totalAssessments', { defaultValue: 'Total Assessments' })}
              </p>
              <p className="text-xs text-muted-foreground">{total.toLocaleString(locale)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-400 rounded-lg flex items-center justify-center">
              <Hourglass className="text-white w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('statusPendingApproval', { defaultValue: 'Pending Approval' })}
              </p>
              <p className="text-xs text-muted-foreground">{pendingCount.toLocaleString(locale)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <ThumbsUp className="text-white w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('statusApproved', { defaultValue: 'Approved' })}
              </p>
              <p className="text-xs text-muted-foreground">{approvedCount.toLocaleString(locale)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center">
              <ThumbsDown className="text-white w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('statusRejected', { defaultValue: 'Rejected' })}
              </p>
              <p className="text-xs text-muted-foreground">{rejectedCount.toLocaleString(locale)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="text-white w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('statusCalculated', { defaultValue: 'Calculated' })}
              </p>
              <p className="text-xs text-muted-foreground">{calculatedCount.toLocaleString(locale)}</p>
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
                {lastUpdated ? formatDateTime(lastUpdated, locale) : '-'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
