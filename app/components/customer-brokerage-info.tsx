'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { useBrokerages } from '@/hooks/use-brokerages';
import { SectionShell } from './section-shell';
import type { AssessmentDraft } from './assessment-store';

interface Props {
  draft: AssessmentDraft;
  showBadge?: boolean;
}

interface PersonDetail {
  id: string;
  nationalId: string;
  translations?: Array<{ languageId: number; firstName: string; lastName: string }>;
  phones?: Array<{ phoneNumber: string; isPrimary: boolean }>;
}

interface MembersPersonDto {
  bourseCode: string;
}

const FA_LANG = 12;
const EN_LANG = 10;

/**
 * Read-only inline display of the selected customer + brokerage. Used by the
 * view page in place of the customer-selection-card and brokerage-selection-card-wrapper
 * Cards (no titles, no banners, no selection UI — just plain info fields).
 */
export function CustomerBrokerageInfo({ draft, showBadge = true }: Props) {
  const { t, i18n } = useTranslation('credit-rating-form');
  const langId = i18n.language === 'fa' ? FA_LANG : EN_LANG;
  const { brokerages } = useBrokerages();
  const [details, setDetails] = useState<PersonDetail | null>(null);
  const [bourseCode, setBourseCode] = useState<string>('');

  const personId = draft.customer?.personId;
  const brokerageId = draft.brokerageId;

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    fetch(`/api/person/${personId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setDetails(d);
      });
    return () => {
      cancelled = true;
    };
  }, [personId]);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    fetch(`/api/seba-members/person/by-person/${personId}`, { cache: 'no-store' })
      .then(async (r) => (r.ok ? ((await r.json()) as MembersPersonDto) : null))
      .then((d) => {
        if (!cancelled) setBourseCode(d?.bourseCode ?? '');
      });
    return () => {
      cancelled = true;
    };
  }, [personId]);

  const fullName = (() => {
    if (draft.customer?.fullName) return draft.customer.fullName;
    if (!details?.translations) return '';
    const tr = details.translations.find((x) => x.languageId === langId) || details.translations[0];
    return tr ? `${tr.firstName} ${tr.lastName}`.trim() : '';
  })();
  const nationalId = draft.customer?.nationalId || details?.nationalId || '';
  const mobile =
    draft.customer?.mobile ||
    details?.phones?.find((p) => p.isPrimary)?.phoneNumber ||
    details?.phones?.[0]?.phoneNumber ||
    '';
  const selectedBrokerage = brokerages.find((b) => b.id === brokerageId);
  const brokerageName = selectedBrokerage?.name ?? draft.brokerageName ?? '';
  const brokerageNationalId = selectedBrokerage?.nationalId ?? '';

  return (
    <>
      <SectionShell
        number={showBadge ? 1 : undefined}
        title={t('customerInfoTitle', { defaultValue: 'Customer Info' })}
        badgeColor="bg-blue-500"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="info-fullname">{t('customerFullName', { defaultValue: 'Full Name' })}</Label>
            <Input id="info-fullname" value={fullName} disabled />
          </div>
          <div>
            <Label htmlFor="info-nationalid">{t('customerNationalId', { defaultValue: 'National Code' })}</Label>
            <Input id="info-nationalid" value={nationalId} disabled dir="ltr" />
          </div>
          <div>
            <Label htmlFor="info-bourse">{t('customerBourseCode', { defaultValue: 'Bourse Code' })}</Label>
            <Input id="info-bourse" value={bourseCode} disabled dir="ltr" />
          </div>
          <div>
            <Label htmlFor="info-mobile">{t('mobile', { defaultValue: 'Mobile Number' })}</Label>
            <Input id="info-mobile" value={mobile} disabled dir="ltr" />
          </div>
        </div>
      </SectionShell>

      <SectionShell
        number={showBadge ? 2 : undefined}
        title={t('brokerageInfoTitle', { defaultValue: 'Brokerage Info' })}
        badgeColor="bg-indigo-500"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="info-brokerage">{t('brokerageName', { defaultValue: 'Brokerage Company Name' })}</Label>
            <Input id="info-brokerage" value={brokerageName} disabled />
          </div>
          <div>
            <Label htmlFor="info-brokerage-nationalid">
              {t('brokerageNationalId', { defaultValue: 'Brokerage National ID' })}
            </Label>
            <Input id="info-brokerage-nationalid" value={brokerageNationalId} disabled dir="ltr" />
          </div>
        </div>
      </SectionShell>
    </>
  );
}
