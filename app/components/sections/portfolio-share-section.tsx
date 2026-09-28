'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import { SectionShell } from '../section-shell';
import type { AssessmentDraft } from '../assessment-store';

interface Props {
  draft: AssessmentDraft;
  number?: number;
  showManageHint?: boolean;
}

interface PersonAssetRow {
  id: string;
  personId: string;
  assetId: string;
  /** Brokerage the holding is recorded under (PersonAsset.CompanyId). */
  companyId?: string;
  quantity?: number;
  acquisitionPrice?: number;
  acquisitionValue?: number;
}

interface AssetItem {
  id: string;
  symbol: string;
}

interface AssetTranslationItem {
  assetId: string;
  languageId: number;
  name: string;
}

interface AssetListResponse {
  assets: AssetItem[];
  translations: AssetTranslationItem[];
}

const FA_LANG = 12;
const EN_LANG = 10;

const formatNumber = (value: number | null | undefined, locale: string) => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat(locale).format(value);
};

export function PortfolioShareSection({ draft, number = 4, showManageHint = true }: Props) {
  const { t, i18n } = useTranslation('credit-rating-form');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const langId = i18n.language === 'fa' ? FA_LANG : EN_LANG;

  const [rows, setRows] = useState<PersonAssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [assetMap, setAssetMap] = useState<Map<string, { symbol: string; name: string }>>(new Map());

  // Fetch the customer's portfolio rows whenever they change
  useEffect(() => {
    const personId = draft.customer?.personId;
    if (!personId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/person/asset?personId=${encodeURIComponent(personId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.customer?.personId]);

  // Fetch the asset name/symbol map once (covers all rows). Cached at the API
  // layer; safe to call on every mount.
  useEffect(() => {
    let cancelled = false;
    fetch('/credit-rating/api/market/asset/list')
      .then((r) => (r.ok ? r.json() : { assets: [], translations: [] }))
      .then((data: AssetListResponse) => {
        if (cancelled) return;
        const m = new Map<string, { symbol: string; name: string }>();
        const symbols = new Map<string, string>();
        (data.assets ?? []).forEach((a) => symbols.set(a.id.toLowerCase(), a.symbol ?? ''));
        // Pick a translation per asset, preferring the user's current language
        const fallbacks = new Map<string, string>();
        (data.translations ?? []).forEach((tr) => {
          const key = tr.assetId.toLowerCase();
          if (tr.languageId === langId) m.set(key, { symbol: symbols.get(key) ?? '', name: tr.name ?? '' });
          else if (!fallbacks.has(key)) fallbacks.set(key, tr.name ?? '');
        });
        // Fill in missing langId rows with whatever fallback we have
        symbols.forEach((symbol, id) => {
          if (!m.has(id)) m.set(id, { symbol, name: fallbacks.get(id) ?? '' });
        });
        setAssetMap(m);
      })
      .catch(() => {
        // Leave assetMap empty; UI falls back to the assetId Guid.
      });
    return () => {
      cancelled = true;
    };
  }, [langId]);

  // An assessment is scoped to ONE brokerage, so show only that brokerage's
  // holdings — the same set the backend snapshots and scores on approval.
  const brokerageId = draft.brokerageId;
  const visibleRows = useMemo(
    () =>
      brokerageId
        ? rows.filter((r) => r.companyId?.toLowerCase() === brokerageId.toLowerCase())
        : [],
    [rows, brokerageId],
  );

  const total = useMemo(
    () =>
      visibleRows.reduce((sum, r) => {
        const v = r.acquisitionValue ?? (r.quantity ?? 0) * (r.acquisitionPrice ?? 0);
        return sum + (Number.isFinite(v) ? v : 0);
      }, 0),
    [visibleRows],
  );

  const renderSymbol = (assetId: string) => {
    const info = assetMap.get(assetId.toLowerCase());
    if (!info) return assetId;
    if (info.symbol && info.name) return `${info.symbol} — ${info.name}`;
    return info.symbol || info.name || assetId;
  };

  return (
    <SectionShell
      number={number}
      title={t('section2Title', { defaultValue: 'Customer Portfolio Composition' })}
      badgeColor="bg-emerald-500"
    >
      {!draft.customer?.personId ? (
        <div className="text-sm text-muted-foreground italic">
          {t('selectCustomerFirstHint', { defaultValue: 'Please select a customer first.' })}
        </div>
      ) : !brokerageId ? (
        <div className="text-sm text-muted-foreground italic">
          {t('selectBrokerageFirstHint', {
            defaultValue: 'Please select a brokerage first.',
          })}
        </div>
      ) : loading ? (
        <div className="text-sm text-muted-foreground">...</div>
      ) : visibleRows.length === 0 ? (
        <div className="text-sm text-muted-foreground italic">
          {t('noAssetsForBrokerage', {
            defaultValue: 'No assets recorded for this person at the selected brokerage.',
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('symbolName', { defaultValue: 'Symbol Name' })}</TableHead>
                <TableHead>{t('quantity', { defaultValue: 'Quantity' })}</TableHead>
                <TableHead>{t('acquisitionPrice', { defaultValue: 'Acquisition Price' })}</TableHead>
                <TableHead>{t('acquisitionValue', { defaultValue: 'Acquisition Value' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((r) => {
                const value = r.acquisitionValue ?? (r.quantity ?? 0) * (r.acquisitionPrice ?? 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{renderSymbol(r.assetId)}</TableCell>
                    <TableCell>{formatNumber(r.quantity, locale)}</TableCell>
                    <TableCell>{formatNumber(r.acquisitionPrice, locale)}</TableCell>
                    <TableCell>{formatNumber(value, locale)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-semibold border-t-2">
                <TableCell colSpan={3}>
                  {t('totalPortfolioValue', { defaultValue: 'Total Portfolio Value' })}
                </TableCell>
                <TableCell>{formatNumber(total, locale)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
      {showManageHint && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t('manageAssetsHint', { defaultValue: 'To edit, go to Credit Rating → Assets.' })}
        </p>
      )}
    </SectionShell>
  );
}
