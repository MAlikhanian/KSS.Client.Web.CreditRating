'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { PersonSearch, type PersonSearchResult } from '@/components/common/person-search';
import type { AssessmentDraft } from './assessment-store';

interface Props {
  draft: AssessmentDraft;
  onChange: (next: Partial<AssessmentDraft>) => void;
  readOnly?: boolean;
}

interface PersonDetail {
  id: string;
  nationalId: string;
  translations?: Array<{
    languageId: number;
    firstName: string;
    lastName: string;
  }>;
  phones?: Array<{
    phoneNumber: string;
    isPrimary: boolean;
  }>;
}

interface MembersPersonDto {
  id: string;
  personId: string;
  bourseCode: string;
}

const FA_LANG = 12;
const EN_LANG = 10;

export function CustomerSelectionCard({ draft, onChange, readOnly = false }: Props) {
  const { t, i18n } = useTranslation('credit-rating-form');
  const langId = i18n.language === 'fa' ? FA_LANG : EN_LANG;
  const [details, setDetails] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [bourseLoading, setBourseLoading] = useState(false);
  const [bourseFound, setBourseFound] = useState(false);

  // Load Person identity (mobile, etc.)
  useEffect(() => {
    const personId = draft.customer?.personId;
    if (!personId) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/person/${personId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PersonDetail | null) => {
        if (!cancelled) setDetails(data);
      })
      .catch(() => {
        if (!cancelled) setDetails(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.customer?.personId]);

  // Load BourseCode from Members.Person
  useEffect(() => {
    const personId = draft.customer?.personId;
    if (!personId) {
      setBourseFound(false);
      return;
    }
    let cancelled = false;
    setBourseLoading(true);
    fetch(`/api/seba-members/person/by-person/${personId}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) return null;
        return (await r.json()) as MembersPersonDto;
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.bourseCode) {
          setBourseFound(true);
          if (draft.bourseCode !== data.bourseCode) {
            onChange({ bourseCode: data.bourseCode });
          }
        } else {
          setBourseFound(false);
          if (draft.bourseCode !== '') onChange({ bourseCode: '' });
        }
      })
      .catch(() => {
        if (!cancelled) setBourseFound(false);
      })
      .finally(() => {
        if (!cancelled) setBourseLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.customer?.personId]);

  const handleSelect = (person: PersonSearchResult | null) => {
    if (!person) {
      onChange({ customer: undefined, bourseCode: '' });
      return;
    }
    const tr = person.translations.find((x) => x.languageId === langId) || person.translations[0];
    const fullName = tr ? `${tr.firstName} ${tr.lastName}`.trim() : person.nationalId;
    onChange({
      customer: {
        personId: person.id,
        fullName,
        nationalId: person.nationalId,
        mobile: '',
      },
      bourseCode: '',
    });
  };

  const primaryPhone =
    details?.phones?.find((p) => p.isPrimary)?.phoneNumber ?? details?.phones?.[0]?.phoneNumber ?? '';

  // Derive full name + national ID from loaded details (used when the form
  // is opened in view/edit mode and draft.customer.fullName/nationalId are
  // empty because the backend DTO only carries the personId).
  const detailsName = (() => {
    if (!details?.translations) return '';
    const tr = details.translations.find((x) => x.languageId === langId) || details.translations[0];
    return tr ? `${tr.firstName} ${tr.lastName}`.trim() : '';
  })();
  const detailsNationalId = details?.nationalId ?? '';

  const displayName = draft.customer?.fullName || detailsName || '';
  const displayNationalId = draft.customer?.nationalId || detailsNationalId || '';

  // Sync loaded details back into draft.customer so downstream consumers
  // (sidebar, banners) see the correct name, national ID, and mobile.
  useEffect(() => {
    if (!draft.customer) return;
    const next = { ...draft.customer };
    let changed = false;
    if (primaryPhone && next.mobile !== primaryPhone) { next.mobile = primaryPhone; changed = true; }
    if (detailsName && next.fullName !== detailsName) { next.fullName = detailsName; changed = true; }
    if (detailsNationalId && next.nationalId !== detailsNationalId) { next.nationalId = detailsNationalId; changed = true; }
    if (changed) onChange({ customer: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryPhone, detailsName, detailsNationalId]);

  const bourseDisplay = bourseLoading ? '...' : draft.bourseCode;
  const bourseEmpty = !bourseLoading && !bourseFound;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>
          {t('selectCustomerCardTitle', { defaultValue: 'Select Customer' })}
        </CardTitle>
        <CardDescription className="mx-auto max-w-2xl">
          {t('selectCustomerCardDescription', {
            defaultValue: 'Select the customer for this credit rating assessment.',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!readOnly && (
          <PersonSearch
            onSelect={handleSelect}
            required
            label={t('selectCustomer', { defaultValue: 'Select Customer' })}
          />
        )}

        {draft.customer && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-950 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t('personSelectedBanner', {
                defaultValue: '{{name}} with national code {{nationalId}} has been selected',
                name: displayName || (loading ? '...' : '-'),
                nationalId: displayNationalId || (loading ? '...' : '-'),
              })}
            </p>
          </div>
        )}

        {draft.customer && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="cust-fullname">
                {t('customerFullName', { defaultValue: 'Full Name' })}
              </Label>
              <Input
                id="cust-fullname"
                value={displayName}
                disabled
                placeholder={loading ? '...' : '-'}
              />
            </div>
            <div>
              <Label htmlFor="cust-nationalid">
                {t('customerNationalId', { defaultValue: 'National Code' })}
              </Label>
              <Input
                id="cust-nationalid"
                value={displayNationalId}
                disabled
                dir="ltr"
                placeholder={loading ? '...' : '-'}
              />
            </div>
            <div>
              <Label htmlFor="cust-bourse">
                {t('customerBourseCode', { defaultValue: 'Bourse Code' })}
              </Label>
              <Input
                id="cust-bourse"
                value={bourseDisplay}
                disabled
                dir="ltr"
                placeholder={
                  bourseEmpty
                    ? t('noBourseCodeOnRecord', { defaultValue: 'No bourse code recorded for this person' })
                    : undefined
                }
              />
            </div>
            <div>
              <Label htmlFor="cust-mobile">
                {t('mobile', { defaultValue: 'Mobile Number' })}
              </Label>
              <Input
                id="cust-mobile"
                value={primaryPhone}
                disabled
                dir="ltr"
                placeholder={
                  loading
                    ? '...'
                    : t('noMobileOnRecord', { defaultValue: 'No mobile number recorded for this person' })
                }
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
