'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { SectionShell } from '../section-shell';
import { CurrencyInput } from '../currency-input';
import type { AssessmentDraft } from '../assessment-store';

interface Props {
  draft: AssessmentDraft;
  onChange: (next: Partial<AssessmentDraft>) => void;
  readOnly?: boolean;
  number?: number;
}

export function CustomerFinancialSection({ draft, onChange, readOnly = false, number = 1 }: Props) {
  const { t } = useTranslation('credit-rating-form');
  const f = draft.financial;

  const update = (patch: Partial<AssessmentDraft['financial']>) =>
    onChange({ financial: { ...f, ...patch } });

  const requiredMark = !readOnly && <span className="text-rose-500 ms-1">*</span>;

  return (
    <SectionShell number={number} title={t('section1Title', { defaultValue: 'Customer Financial Info' })} badgeColor="bg-amber-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="fin-totalAssets">
            {t('totalAssets', { defaultValue: 'Total Assets Value (latest record)' })}
            <span className="text-muted-foreground text-xs ms-1">({t('currency', { defaultValue: 'IRR' })})</span>
            {requiredMark}
          </Label>
          <CurrencyInput
            id="fin-totalAssets"
            value={f.totalAssets}
            onChange={(v) => update({ totalAssets: v })}
            disabled={readOnly}
          />
        </div>
        <div>
          <Label htmlFor="fin-commercialDebt">
            {t('commercialDebt', { defaultValue: 'Commercial Debt (latest record)' })}
            <span className="text-muted-foreground text-xs ms-1">({t('currency', { defaultValue: 'IRR' })})</span>
            {requiredMark}
          </Label>
          <CurrencyInput
            id="fin-commercialDebt"
            value={f.commercialDebt}
            onChange={(v) => update({ commercialDebt: v })}
            disabled={readOnly}
          />
        </div>
        <div>
          <Label htmlFor="fin-guarantee">
            {t('guaranteeValue', { defaultValue: 'Guarantee Value (latest record)' })}
            <span className="text-muted-foreground text-xs ms-1">({t('currency', { defaultValue: 'IRR' })})</span>
            {requiredMark}
          </Label>
          <CurrencyInput
            id="fin-guarantee"
            value={f.guaranteeValue}
            onChange={(v) => update({ guaranteeValue: v })}
            disabled={readOnly}
          />
        </div>
        <div>
          <Label htmlFor="fin-commission">
            {t('tradingCommission', { defaultValue: 'Trading Commission (1-year window)' })}
            <span className="text-muted-foreground text-xs ms-1">({t('currency', { defaultValue: 'IRR' })})</span>
            {requiredMark}
          </Label>
          <CurrencyInput
            id="fin-commission"
            value={f.tradingCommission}
            onChange={(v) => update({ tradingCommission: v })}
            disabled={readOnly}
          />
        </div>
        <div>
          <Label htmlFor="fin-article13">
            {t('article13History', { defaultValue: 'Article 13 History' })}
            {requiredMark}
          </Label>
          <Input
            id="fin-article13"
            type="number"
            min={0}
            step={1}
            value={f.article13History === '' ? '' : String(f.article13History)}
            onChange={(e) => {
              const raw = e.target.value;
              update({ article13History: raw === '' ? '' : Number(raw) });
            }}
            disabled={readOnly}
          />
        </div>
      </div>
    </SectionShell>
  );
}
