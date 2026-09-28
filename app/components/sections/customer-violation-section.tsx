'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { SectionShell } from '../section-shell';
import type { AssessmentDraft } from '../assessment-store';

interface Props {
  draft: AssessmentDraft;
  onChange: (next: Partial<AssessmentDraft>) => void;
  readOnly?: boolean;
  number?: number;
}

export function CustomerViolationSection({ draft, onChange, readOnly = false, number = 3 }: Props) {
  const { t } = useTranslation('credit-rating-form');
  const v = draft.violation;

  const update = (patch: Partial<AssessmentDraft['violation']>) =>
    onChange({ violation: { ...v, ...patch } });

  const requiredMark = !readOnly && <span className="text-rose-500 ms-1">*</span>;

  return (
    <SectionShell number={number} title={t('section4Title', { defaultValue: 'Customer Violations' })} badgeColor="bg-rose-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="v-lawsuits">
            {t('lawsuitsHistory', { defaultValue: 'Lawsuits History (1-year window)' })}
            {requiredMark}
          </Label>
          <Input
            id="v-lawsuits"
            type="number"
            min={0}
            step={1}
            value={v.lawsuitsHistory === '' ? '' : String(v.lawsuitsHistory)}
            onChange={(e) => {
              const raw = e.target.value;
              update({ lawsuitsHistory: raw === '' ? '' : Number(raw) });
            }}
            disabled={readOnly}
          />
        </div>
        <div>
          <Label htmlFor="v-restrictions">
            {t('tradingRestrictionsHistory', { defaultValue: 'Trading Restrictions History (1-year window)' })}
            {requiredMark}
          </Label>
          <Input
            id="v-restrictions"
            type="number"
            min={0}
            step={1}
            value={v.tradingRestrictionsHistory === '' ? '' : String(v.tradingRestrictionsHistory)}
            onChange={(e) => {
              const raw = e.target.value;
              update({ tradingRestrictionsHistory: raw === '' ? '' : Number(raw) });
            }}
            disabled={readOnly}
          />
        </div>
      </div>
    </SectionShell>
  );
}
