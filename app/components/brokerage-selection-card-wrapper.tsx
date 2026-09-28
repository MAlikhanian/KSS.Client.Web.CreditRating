'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CompanySelect } from '@/components/common/company-select';
import { useBrokerages } from '@/hooks/use-brokerages';
import { useTranslation } from '@/hooks/useTranslation';
import type { AssessmentDraft } from './assessment-store';

interface Props {
  draft: AssessmentDraft;
  onChange: (next: Partial<AssessmentDraft>) => void;
  readOnly?: boolean;
}

export function BrokerageSelectionCardWrapper({ draft, onChange, readOnly = false }: Props) {
  const { t } = useTranslation('brokerages-common');
  const { t: tForm } = useTranslation('credit-rating-form');
  const { brokerages } = useBrokerages();
  const selectedBrokerage = brokerages.find((b) => b.id === draft.brokerageId);

  // Sync brokerageName back into draft when the brokerage list resolves the
  // selected ID. Useful in edit/view mode where the BackendDto only carries
  // brokerageId and downstream consumers (sidebar, banners) need the name.
  useEffect(() => {
    if (selectedBrokerage && draft.brokerageName !== selectedBrokerage.name) {
      onChange({ brokerageName: selectedBrokerage.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrokerage?.id, selectedBrokerage?.name]);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>
          {t('selectBrokerage.title', { defaultValue: 'Select Brokerage' })}
        </CardTitle>
        <CardDescription className="mx-auto max-w-2xl">
          {tForm('selectBrokerageCardDescription', {
            defaultValue: 'Select the brokerage for this credit rating assessment.',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!readOnly && (
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <CompanySelect
                source="brokerage"
                value={draft.brokerageId ?? ''}
                onValueChange={(id) => {
                  const b = brokerages.find((x) => x.id === id);
                  onChange({ brokerageId: id, brokerageName: b?.name });
                }}
                placeholder={t('selectBrokerage.placeholder', {
                  defaultValue: 'Select brokerage to edit...',
                })}
                label={t('selectBrokerage.label', { defaultValue: 'Brokerage' })}
                required
              />
            </div>
          </div>
        )}

        {selectedBrokerage && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-950 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {tForm('brokerageSelectedBanner', {
                defaultValue: 'Brokerage {{name}} with national ID {{nationalId}} has been selected',
                name: selectedBrokerage.name,
                nationalId: selectedBrokerage.nationalId ?? '-',
              })}
            </p>
          </div>
        )}

        {selectedBrokerage && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="brk-name">
                {tForm('brokerageName', { defaultValue: 'Brokerage Company Name' })}
              </Label>
              <Input
                id="brk-name"
                value={selectedBrokerage.name ?? ''}
                disabled
              />
            </div>
            <div>
              <Label htmlFor="brk-nationalid">
                {tForm('brokerageNationalId', { defaultValue: 'Brokerage National ID' })}
              </Label>
              <Input
                id="brk-nationalid"
                value={selectedBrokerage.nationalId ?? '-'}
                disabled
                dir="ltr"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
