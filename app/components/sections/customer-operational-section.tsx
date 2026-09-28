'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { SectionShell } from '../section-shell';
import type { AssessmentDraft } from '../assessment-store';

interface Props {
  draft: AssessmentDraft;
  onChange: (next: Partial<AssessmentDraft>) => void;
  readOnly?: boolean;
  number?: number;
}

type RiskValue = 'callMargin' | 'atRisk' | 'noRisk' | '';

export function CustomerOperationalSection({ draft, onChange, readOnly = false, number = 2 }: Props) {
  const { t } = useTranslation('credit-rating-form');
  const o = draft.operational;

  const update = (patch: Partial<AssessmentDraft['operational']>) =>
    onChange({ operational: { ...o, ...patch } });

  const requiredMark = !readOnly && <span className="text-rose-500 ms-1">*</span>;

  const riskOptions: Array<{ value: RiskValue; labelKey: string; defaultLabel: string }> = [
    { value: 'callMargin', labelKey: 'callMargin', defaultLabel: 'Call Margin' },
    { value: 'atRisk', labelKey: 'atRisk', defaultLabel: 'At Risk' },
    { value: 'noRisk', labelKey: 'noRisk', defaultLabel: 'No Risk' },
  ];

  const labelForRisk = (v: RiskValue): string => {
    const opt = riskOptions.find((o) => o.value === v);
    return opt ? t(opt.labelKey, { defaultValue: opt.defaultLabel }) : '';
  };

  const renderRiskSelect = (id: string, value: RiskValue, onSelect: (v: RiskValue) => void) => {
    if (readOnly) {
      return <Input id={id} value={labelForRisk(value)} disabled />;
    }
    return (
      <Select value={value} onValueChange={(v) => onSelect(v as RiskValue)}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent>
          {riskOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <SectionShell number={number} title={t('section3Title', { defaultValue: 'Customer Operational Info' })} badgeColor="bg-orange-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="op-day1">
            {t('riskStatusLastDay', { defaultValue: 'Risk Status — Last Working Day' })}
            {requiredMark}
          </Label>
          {renderRiskSelect('op-day1', o.riskStatusLastDay, (v) => update({ riskStatusLastDay: v }))}
        </div>
        <div>
          <Label htmlFor="op-day2">
            {t('riskStatusDayBeforeLast', { defaultValue: 'Risk Status — Day Before Last' })}
            {requiredMark}
          </Label>
          {renderRiskSelect('op-day2', o.riskStatusDayBeforeLast, (v) => update({ riskStatusDayBeforeLast: v }))}
        </div>
        <div>
          <Label htmlFor="op-day3">
            {t('riskStatusTwoDaysBeforeLast', { defaultValue: 'Risk Status — Two Days Before Last' })}
            {requiredMark}
          </Label>
          {renderRiskSelect('op-day3', o.riskStatusTwoDaysBeforeLast, (v) => update({ riskStatusTwoDaysBeforeLast: v }))}
        </div>
        <div>
          <Label htmlFor="op-article12">
            {t('article12Compliance', { defaultValue: 'Article 12 Compliance' })}
            {requiredMark}
          </Label>
          {readOnly ? (
            <Input
              id="op-article12"
              value={
                o.article12Compliance === true
                  ? t('yes', { defaultValue: 'Yes' })
                  : o.article12Compliance === false
                    ? t('no', { defaultValue: 'No' })
                    : ''
              }
              disabled
            />
          ) : (
            <Select
              value={o.article12Compliance === true ? 'yes' : o.article12Compliance === false ? 'no' : ''}
              onValueChange={(v) => update({ article12Compliance: v === 'yes' ? true : v === 'no' ? false : null })}
            >
              <SelectTrigger id="op-article12">
                <SelectValue placeholder="-" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">{t('yes', { defaultValue: 'Yes' })}</SelectItem>
                <SelectItem value="no">{t('no', { defaultValue: 'No' })}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label htmlFor="op-article12-history">
            {t('article12History', { defaultValue: 'Article 12 History (1-year window)' })}
            {requiredMark}
          </Label>
          <Input
            id="op-article12-history"
            type="number"
            min={0}
            step={1}
            value={o.article12History === '' ? '' : String(o.article12History)}
            onChange={(e) => {
              const raw = e.target.value;
              update({ article12History: raw === '' ? '' : Number(raw) });
            }}
            disabled={readOnly}
          />
        </div>
      </div>
    </SectionShell>
  );
}
