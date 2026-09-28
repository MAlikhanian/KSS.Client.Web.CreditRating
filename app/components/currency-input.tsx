'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { Input } from '@/components/ui/input';
import { localizeDigits } from '@/app/components/person/format-utils';

interface CurrencyInputProps {
  value: number | '';
  onChange: (value: number | '') => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

const persianToEnglish = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

export function CurrencyInput({ value, onChange, placeholder, disabled, id }: CurrencyInputProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';

  const display =
    value === '' || value === null || value === undefined
      ? ''
      : localizeDigits(value.toLocaleString('en-US'), locale);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = persianToEnglish(e.target.value).replace(/[^0-9]/g, '');
    if (raw === '') {
      onChange('');
      return;
    }
    onChange(Number(raw));
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      dir="ltr"
      className="text-end"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
