'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';
import { User, Building2, ShieldCheck, BarChart3, Clock } from 'lucide-react';
import { formatDateTime } from '@/app/components/person/format-utils';
import type { PersonSearchResult } from '@/components/common/person-search';

interface ReportSidebarProps {
  person: PersonSearchResult | null;
  personFullName: string;
  brokerageName?: string;
  riskTier?: string | null;
  riskScore?: number | null;
  totalRatings?: number;
  lastDate?: string;
}


export function ReportSidebar({
  person,
  personFullName,
  brokerageName,
  riskTier,
  riskScore,
  totalRatings,
  lastDate,
}: ReportSidebarProps) {
  const { t, i18n } = useTranslation('credit-rating-report');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';

  const displayName = personFullName || person?.nationalId || '-';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sidebarTitle', { defaultValue: 'Inquiry Summary' })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 text-center">
          <div className="w-24 h-24 rounded-full mx-auto mb-3 overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <p className="text-sm text-foreground font-medium">
            {person ? displayName : t('selectCustomerFirstHint', { defaultValue: 'Please select a customer first.' })}
          </p>
          {person?.nationalId && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">{person.nationalId}</p>
          )}
        </div>

        <div className="space-y-4">
          {brokerageName && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                <Building2 className="text-white w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('colBrokerage', { defaultValue: 'Brokerage' })}
                </p>
                <p className="text-xs text-muted-foreground">{brokerageName}</p>
              </div>
            </div>
          )}

          {riskTier !== undefined && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center">
                <ShieldCheck className="text-white w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('riskTier', { defaultValue: 'Risk Tier' })}
                </p>
                <div className="mt-1">
                  {riskTier ? (
                    <Badge variant="primary">{riskTier}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {riskScore !== undefined && riskScore !== null && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-white w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('riskScore', { defaultValue: 'Risk Score' })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(riskScore)}
                </p>
              </div>
            </div>
          )}

          {totalRatings !== undefined && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-white w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('totalBrokerages', { defaultValue: 'Brokerages' })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {totalRatings.toLocaleString(locale)}
                </p>
              </div>
            </div>
          )}

          {lastDate && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <Clock className="text-white w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('colDate', { defaultValue: 'Date' })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(lastDate, locale)}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
