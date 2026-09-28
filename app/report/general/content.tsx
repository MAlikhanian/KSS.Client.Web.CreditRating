'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import { PersonSearch, type PersonSearchResult } from '@/components/common/person-search';
import { listAssessments, STATUS_CALCULATED, type AssessmentDraft } from '../../components/assessment-store';
import { useBrokerages } from '@/hooks/use-brokerages';
import { formatDateTime } from '@/app/components/person/format-utils';
import { ReportSidebar } from '../report-sidebar';
import { RiskGauge, tierColor } from '../risk-gauge';
import { saveReportPerson, loadReportPerson } from '../use-report-filters';
import { AlertCircle } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CalculationRow {
  assessmentId: string;
  riskScore: number | null;
  riskTier: string | null;
  valueAtRisk: number | null;
  tradingTurnover: number | null;
  brokerageCount: number | null;
}

interface AssetRow {
  id: string;
  assetId: string;
  quantity?: number;
  acquisitionPrice?: number;
  acquisitionValue?: number;
}

interface AssetInfo {
  symbol: string;
  name: string;
}

const FA_LANG = 12;
const EN_LANG = 10;

// Convert a hex color to rgba with given alpha — used for tinted box backgrounds
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const fmt = (v: number | null | undefined, locale: string) =>
  v !== null && v !== undefined ? new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v) : '—';
const fmt2 = (v: number | null | undefined, locale: string) =>
  v !== null && v !== undefined ? new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v) : '—';

// ─── Component ──────────────────────────────────────────────────────────────

export function GeneralInquiryContent() {
  const { t, i18n } = useTranslation('credit-rating-report');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const langId = i18n.language === 'fa' ? FA_LANG : EN_LANG;

  const searchParams = useSearchParams();

  const [filterPerson, setFilterPerson] = useState<PersonSearchResult | null>(
    () => loadReportPerson()
  );

  const handlePersonSelect = useCallback((p: PersonSearchResult | null) => {
    setFilterPerson(p);
    saveReportPerson(p);
  }, []);

  // If personId is in the URL but no person is in localStorage, fetch the
  // person and pre-select them. Used by the "Inquiry" link from /credit-rating/list.
  useEffect(() => {
    const personIdFromUrl = searchParams?.get('personId');
    if (!personIdFromUrl) return;
    if (filterPerson?.id?.toLowerCase() === personIdFromUrl.toLowerCase()) return;
    let cancelled = false;
    fetch(`/api/person/${personIdFromUrl}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { id: string; nationalId: string; translations?: { languageId: number; firstName: string; lastName: string }[] } | null) => {
        if (cancelled || !data) return;
        const p: PersonSearchResult = {
          id: data.id,
          nationalId: data.nationalId,
          translations: data.translations ?? [],
        };
        setFilterPerson(p);
        saveReportPerson(p);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [items, setItems] = useState<AssessmentDraft[]>([]);
  const [calculations, setCalculations] = useState<CalculationRow[]>([]);
  const [portfolio, setPortfolio] = useState<AssetRow[]>([]);
  const [assetMap, setAssetMap] = useState<Map<string, AssetInfo>>(new Map());
  const [marketCalc, setMarketCalc] = useState<{
    aggregateRiskScore: number | null;
    aggregateRiskTier: string | null;
    totalValueAtRisk: number;
    totalTradingTurnover: number;
    totalBrokerageCount: number;
  } | null>(null);
  const { brokerages } = useBrokerages();

  // Load assessments + calculations once
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listAssessments(),
      fetch('/credit-rating/api/credit-rating/calculation').then(r => r.ok ? r.json() : []),
    ]).then(([rows, calcs]) => {
      if (cancelled) return;
      setItems(rows);
      setCalculations(Array.isArray(calcs) ? calcs : []);
    });
    return () => { cancelled = true; };
  }, []);

  const filterPersonId = filterPerson?.id;

  // Fetch MarketCalculation (real aggregated result) when person changes
  useEffect(() => {
    if (!filterPersonId) { setMarketCalc(null); return; }
    let cancelled = false;
    fetch(`/credit-rating/api/credit-rating/market-calculation?personId=${encodeURIComponent(filterPersonId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) setMarketCalc(d); });
    return () => { cancelled = true; };
  }, [filterPersonId]);

  // Load portfolio rows when person changes
  useEffect(() => {
    if (!filterPersonId) { setPortfolio([]); return; }
    let cancelled = false;
    fetch(`/api/person/asset?personId=${encodeURIComponent(filterPersonId)}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (!cancelled) setPortfolio(Array.isArray(d) ? d : []); });
    return () => { cancelled = true; };
  }, [filterPersonId]);

  // Load asset names
  useEffect(() => {
    let cancelled = false;
    fetch('/credit-rating/api/market/asset/list')
      .then(r => r.ok ? r.json() : { assets: [], translations: [] })
      .then(data => {
        if (cancelled) return;
        const m = new Map<string, AssetInfo>();
        const symbols = new Map<string, string>();
        (data.assets ?? []).forEach((a: { id: string; symbol: string }) => symbols.set(a.id.toLowerCase(), a.symbol));
        const fallback = new Map<string, string>();
        (data.translations ?? []).forEach((tr: { assetId: string; languageId: number; name: string }) => {
          const k = tr.assetId.toLowerCase();
          if (tr.languageId === langId) m.set(k, { symbol: symbols.get(k) ?? '', name: tr.name });
          else if (!fallback.has(k)) fallback.set(k, tr.name);
        });
        symbols.forEach((sym, id) => { if (!m.has(id)) m.set(id, { symbol: sym, name: fallback.get(id) ?? '' }); });
        setAssetMap(m);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [langId]);

  const brokerageMap = useMemo(() => {
    const m = new Map<string, string>();
    brokerages.forEach(b => m.set(b.id.toLowerCase(), b.name));
    return m;
  }, [brokerages]);

  const calcMap = useMemo(() => {
    const m = new Map<string, CalculationRow>();
    calculations.forEach(c => m.set(c.assessmentId.toLowerCase(), c));
    return m;
  }, [calculations]);

  // Latest calculated assessment per brokerage for this person
  const ratings = useMemo(() => {
    if (!filterPerson) return [];
    const pid = filterPerson.id.toLowerCase();
    const latest = new Map<string, AssessmentDraft>();
    items.filter(a => a.customer?.personId?.toLowerCase() === pid && a.status === STATUS_CALCULATED)
      .forEach(a => {
        const bid = a.brokerageId?.toLowerCase() ?? '';
        const ex = latest.get(bid);
        if (!ex || new Date(a.updatedAt) > new Date(ex.updatedAt)) latest.set(bid, a);
      });
    return Array.from(latest.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [items, filterPerson]);

  // ─── Aggregated metrics ──────────────────────────────────────────────────

  const agg = useMemo(() => {
    if (!ratings.length) return null;
    let totalAssets = 0, commercialDebt = 0, guaranteeValue = 0, tradingCommission = 0;
    let article13Sum = 0, lawsuitsSum = 0, restrictionsSum = 0;
    let varSum = 0, turnoverSum = 0, brokerageCountMax = 0;
    const riskTiers: string[] = [];
    let riskScoreSum = 0, riskScoreCount = 0;
    let latestRiskStatus = '';

    ratings.forEach(a => {
      totalAssets += Number(a.financial.totalAssets) || 0;
      commercialDebt += Number(a.financial.commercialDebt) || 0;
      guaranteeValue += Number(a.financial.guaranteeValue) || 0;
      tradingCommission += Number(a.financial.tradingCommission) || 0;
      article13Sum += Number(a.financial.article13History) || 0;
      lawsuitsSum += Number(a.violation.lawsuitsHistory) || 0;
      restrictionsSum += Number(a.violation.tradingRestrictionsHistory) || 0;
      if (!latestRiskStatus && a.operational.riskStatusLastDay) {
        latestRiskStatus = a.operational.riskStatusLastDay;
      }
      const calc = calcMap.get(a.id.toLowerCase());
      if (calc) {
        varSum += calc.valueAtRisk ?? 0;
        turnoverSum += calc.tradingTurnover ?? 0;
        if ((calc.brokerageCount ?? 0) > brokerageCountMax) brokerageCountMax = calc.brokerageCount ?? 0;
        if (calc.riskTier) riskTiers.push(calc.riskTier);
        if (calc.riskScore !== null && calc.riskScore !== undefined) {
          riskScoreSum += calc.riskScore;
          riskScoreCount++;
        }
      }
    });

    // Worst tier = alphabetically last in A1..D3 scale
    const worstTier = riskTiers.sort().reverse()[0] ?? null;
    const avgScore = riskScoreCount ? riskScoreSum / riskScoreCount : null;

    return {
      totalAssets, commercialDebt, guaranteeValue, tradingCommission,
      article13Sum, lawsuitsSum, restrictionsSum,
      varSum, turnoverSum, brokerageCountMax,
      worstTier, avgScore, latestRiskStatus,
    };
  }, [ratings, calcMap]);

  // Prefer server-computed MarketCalculation for risk fields when available
  const displayRiskScore = marketCalc?.aggregateRiskScore ?? agg?.avgScore ?? null;
  const displayRiskTier  = marketCalc?.aggregateRiskTier  ?? agg?.worstTier ?? null;
  const displayVaR       = marketCalc?.totalValueAtRisk    ?? agg?.varSum    ?? 0;
  const displayTurnover  = marketCalc?.totalTradingTurnover ?? agg?.turnoverSum ?? 0;
  const displayBrokCount = marketCalc?.totalBrokerageCount  ?? agg?.brokerageCountMax ?? 0;

  // ─── 80% portfolio ───────────────────────────────────────────────────────

  const top80Portfolio = useMemo(() => {
    if (!portfolio.length) return [];
    const rows = portfolio.map(r => {
      const val = r.acquisitionValue ?? (r.quantity ?? 0) * (r.acquisitionPrice ?? 0);
      const info = assetMap.get(r.assetId.toLowerCase());
      return { assetId: r.assetId, symbol: info?.symbol ?? r.assetId, name: info?.name ?? '', value: val };
    }).sort((a, b) => b.value - a.value);
    const total = rows.reduce((s, r) => s + r.value, 0);
    if (!total) return rows.slice(0, 5);
    let cum = 0;
    const result = [];
    for (const r of rows) {
      cum += r.value;
      result.push({ ...r, pct: total ? (r.value / total) * 100 : 0 });
      if (cum / total >= 0.8) break;
    }
    return result;
  }, [portfolio, assetMap]);

  const personFullName = (() => {
    if (!filterPerson) return '';
    const tr = filterPerson.translations?.find(x => x.languageId === langId) || filterPerson.translations?.[0];
    return tr ? `${tr.firstName} ${tr.lastName}`.trim() : filterPerson.nationalId;
  })();

  const riskStatusLabel = (v: string) => {
    if (v === 'callMargin') return t('callMargin', { defaultValue: 'Call Margin' });
    if (v === 'atRisk') return t('atRisk', { defaultValue: 'At Risk' });
    if (v === 'noRisk') return t('noRisk', { defaultValue: 'None' });
    return v || '—';
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className={
        'space-y-5 lg:space-y-7.5 ' +
        '[&_div.rounded-xl.bg-card]:bg-blue-50/25! ' +
        '[&_div.rounded-xl.bg-card]:border-blue-100! ' +
        'dark:[&_div.rounded-xl.bg-card]:bg-blue-950/25! ' +
        'dark:[&_div.rounded-xl.bg-card]:border-blue-900! ' +
        '[&_div.rounded-xl.bg-card]:shadow-lg ' +
        '[&_div.rounded-xl.bg-card]:shadow-black/5'
      }
    >
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 lg:gap-7.5">
      <div className="col-span-3 space-y-6">
        {/* Customer selector */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t('selectCustomerCardTitle', { defaultValue: 'Select Customer' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <PersonSearch onSelect={handlePersonSelect} value={filterPerson} label={t('selectCustomer', { defaultValue: 'Select Customer' })} />
            {filterPerson && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-950 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {t('personSelectedBanner', {
                    defaultValue: '{{name}} with national code {{nationalId}} has been selected',
                    name: personFullName,
                    nationalId: filterPerson.nationalId,
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {filterPerson && ratings.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('noResults', { defaultValue: 'No calculated assessments found for this customer.' })}
            </CardContent>
          </Card>
        )}

        {/* ─── SAMPLE DATA PREVIEW (shown when no person selected) ─── */}
        {!filterPerson && (<>
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            داده‌های نمونه برای نمایش طراحی — پس از انتخاب مشتری داده واقعی نمایش داده می‌شود.
          </div>

          <Card>
            <CardHeader><CardTitle>اطلاعات مشتری</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-background rounded-lg border shadow-sm"><p className="text-xs text-muted-foreground">نام و نام خانوادگی</p><p className="font-semibold mt-1">علی محمدی</p></div>
                <div className="p-3 bg-background rounded-lg border shadow-sm"><p className="text-xs text-muted-foreground">کد ملی</p><p className="font-semibold mt-1 font-mono">۰۰۸۲۲۸۰۶۶۵</p></div>
                <div className="p-3 bg-background rounded-lg border shadow-sm"><p className="text-xs text-muted-foreground">کد بورسی</p><p className="font-semibold mt-1 font-mono">NA7823456789</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>وضعیت ریسک مشتری</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 items-center gap-4">
                <div className="w-52 h-52 mx-auto bg-background rounded-lg border shadow-sm flex flex-col items-center justify-center gap-3 p-4">
                  <p className="text-sm text-muted-foreground text-center leading-snug font-medium">سطح ریسک در بازار سرمایه</p>
                  <span className="inline-block text-lg font-bold px-3 py-1 rounded-md text-white" style={{ backgroundColor: tierColor('B2') }}>B2</span>
                </div>
                <div className="flex justify-center">
                  <RiskGauge score={42.5} tier="B2" />
                </div>
                <div className="w-52 h-52 mx-auto bg-background rounded-lg border shadow-sm flex flex-col items-center justify-center gap-3 p-4">
                  <p className="text-sm text-muted-foreground text-center leading-snug font-medium">امتیاز ریسک در بازار سرمایه</p>
                  <p className="text-2xl font-bold" style={{ color: tierColor('B2') }}>۴۲٫۵</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed border-amber-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                اعتبارسنجی بانکی مشتری
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground italic">
                این بخش در انتظار پیاده‌سازی است: امتیاز اعتباری بانکی، نمودار ارزیابی، جزئیات ریسک بانکی و زمان آخرین به‌روزرسانی.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>مالی</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'دارایی کل در بازار سرمایه', value: '۱٬۲۵۰٬۰۰۰٬۰۰۰', unit: 'ریال' },
                  { label: 'ارزش تضمین در بازار سرمایه ⚠️', value: '۸۴۰٬۰۰۰٬۰۰۰', unit: 'ریال' },
                  { label: 'بدهی تجاری در بازار سرمایه', value: '۳۸۰٬۰۰۰٬۰۰۰', unit: 'ریال' },
                  { label: 'ارزش در ریسک در بازار سرمایه', value: '۹۵٬۰۰۰٬۰۰۰', unit: 'ریال' },
                  { label: 'گردش معاملاتی در بازار سرمایه', value: '۲٬۴۰۰٬۰۰۰٬۰۰۰', unit: 'ریال' },
                  { label: 'سابقه ماده ۱۳ در بازار سرمایه', value: '۲', unit: '' },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-background rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-semibold mt-1">{item.value}</p>
                    {item.unit && <p className="text-xs text-muted-foreground">{item.unit}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>۸۰ درصد سهم مشتری در پرتفوی</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام نماد</TableHead>
                    <TableHead>ارزش نماد (ریال)</TableHead>
                    <TableHead>سهم از پرتفوی</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { symbol: 'فولاد — فولاد مبارکه اصفهان', value: '۳۵۰٬۰۰۰٬۰۰۰', pct: '۲۸٪' },
                    { symbol: 'وبملت — بانک ملت', value: '۲۸۰٬۰۰۰٬۰۰۰', pct: '۲۲٪' },
                    { symbol: 'شبندر — پالایش نفت بندرعباس', value: '۱۹۰٬۰۰۰٬۰۰۰', pct: '۱۵٪' },
                  ].map(r => (
                    <TableRow key={r.symbol}>
                      <TableCell className="font-medium">{r.symbol}</TableCell>
                      <TableCell>{r.value}</TableCell>
                      <TableCell>{r.pct}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>عملیاتی</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'وضعیت ریسک در آخرین روز کاری', value: 'کال مارجین' },
                  { label: 'تعداد کارگزاری‌های درگیر در ارزش در ریسک', value: '۳' },
                  { label: 'ترکیب پرتفوی در بازار سرمایه', value: '۸ نماد' },
                  { label: 'سابقه ریسک در بازار سرمایه', value: '۱' },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-background rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-semibold mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>تخلفاتی</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'کل سابقه طرح دعوا منجر به صدور حکم عدم سازش', value: '۱' },
                  { label: 'سابقه اعمال محدودیت معاملاتی در سامانه‌های کارگزاری', value: '۳' },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-background rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-semibold mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>لیست کارگزاری‌های مشتری</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { name: 'کارگزاری مفید', tier: 'B2', date: '۱۴۰۴/۰۲/۱۵' },
                  { name: 'کارگزاری آگاه', tier: 'B3', date: '۱۴۰۴/۰۲/۱۰' },
                  { name: 'کارگزاری فارابی', tier: 'C1', date: '۱۴۰۴/۰۱/۲۵' },
                ].map(b => (
                  <div key={b.name} className="block p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md" style={{ backgroundColor: hexToRgba(tierColor(b.tier), 0.08), borderColor: hexToRgba(tierColor(b.tier), 0.4), boxShadow: `0 1px 4px ${hexToRgba(tierColor(b.tier), 0.15)}` }}>
                    <p className="font-medium text-sm">{b.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-bold px-3 py-1 rounded text-white" style={{ backgroundColor: tierColor(b.tier) }}>{b.tier}</span>
                      <span className="text-xs text-muted-foreground">{b.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </>)}

        {filterPerson && ratings.length > 0 && agg && (<>

          {/* 0. Customer identity */}
          <Card>
            <CardHeader><CardTitle>اطلاعات مشتری</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">نام و نام خانوادگی</p>
                  <p className="font-semibold mt-1">{personFullName || '—'}</p>
                </div>
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">کد ملی</p>
                  <p className="font-semibold mt-1 font-mono">{filterPerson?.nationalId || '—'}</p>
                </div>
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">کد بورسی</p>
                  <p className="font-semibold mt-1 font-mono text-muted-foreground italic text-sm">از سامانه اعضا</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 1. Risk Status with Gauge */}
          <Card>
            <CardHeader>
              <CardTitle>وضعیت ریسک مشتری</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 items-center gap-4">
                <div className="w-52 h-52 mx-auto bg-background rounded-lg border shadow-sm flex flex-col items-center justify-center gap-3 p-4">
                  <p className="text-sm text-muted-foreground text-center leading-snug font-medium">سطح ریسک در بازار سرمایه</p>
                  {displayRiskTier
                    ? <span className="inline-block text-lg font-bold px-3 py-1 rounded-md text-white" style={{ backgroundColor: tierColor(displayRiskTier) }}>{displayRiskTier}</span>
                    : <span className="text-muted-foreground">—</span>
                  }
                </div>
                <div className="flex justify-center">
                  <RiskGauge score={displayRiskScore} tier={displayRiskTier} />
                </div>
                <div className="w-52 h-52 mx-auto bg-background rounded-lg border shadow-sm flex flex-col items-center justify-center gap-3 p-4">
                  <p className="text-sm text-muted-foreground text-center leading-snug font-medium">امتیاز ریسک در بازار سرمایه</p>
                  <p className="text-2xl font-bold" style={{ color: tierColor(displayRiskTier) }}>{fmt2(displayRiskScore, locale)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Banking placeholder — after risk status */}
          <Card className="border-dashed border-amber-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                اعتبارسنجی بانکی مشتری
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground italic">
                این بخش در انتظار پیاده‌سازی است: امتیاز اعتباری بانکی، نمودار ارزیابی، جزئیات ریسک بانکی و زمان آخرین به‌روزرسانی.
              </p>
            </CardContent>
          </Card>

          {/* 2. Financial */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                مالی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">دارایی کل در بازار سرمایه</p>
                  <p className="font-semibold mt-1">{fmt(agg.totalAssets, locale)}</p>
                  <p className="text-xs text-muted-foreground">ریال</p>
                </div>
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    ارزش تضمین در بازار سرمایه
                    <span title="قابلیت تجمیع بررسی شود" className="text-amber-500 cursor-help">⚠️</span>
                  </p>
                  <p className="font-semibold mt-1">{fmt(agg.guaranteeValue, locale)}</p>
                  <p className="text-xs text-muted-foreground">ریال</p>
                </div>
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">بدهی تجاری در بازار سرمایه</p>
                  <p className="font-semibold mt-1">{fmt(agg.commercialDebt, locale)}</p>
                  <p className="text-xs text-muted-foreground">ریال</p>
                </div>
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">ارزش در ریسک در بازار سرمایه</p>
                  <p className="font-semibold mt-1">{fmt(displayVaR, locale)}</p>
                  <p className="text-xs text-muted-foreground">ریال</p>
                </div>
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">گردش معاملاتی در بازار سرمایه</p>
                  <p className="font-semibold mt-1">{fmt(displayTurnover, locale)}</p>
                  <p className="text-xs text-muted-foreground">ریال</p>
                </div>
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">سابقه ماده ۱۳ در بازار سرمایه</p>
                  <p className="font-semibold mt-1">{fmt(agg.article13Sum, locale)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Top 80% Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle>۸۰ درصد سهم مشتری در پرتفوی</CardTitle>
            </CardHeader>
            <CardContent>
              {top80Portfolio.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">دارایی‌ای ثبت نشده است.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>نام نماد</TableHead>
                        <TableHead>ارزش نماد (ریال)</TableHead>
                        <TableHead>سهم از پرتفوی</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {top80Portfolio.map((r) => (
                        <TableRow key={r.assetId}>
                          <TableCell className="font-medium">
                            {r.symbol}{r.name ? ` — ${r.name}` : ''}
                          </TableCell>
                          <TableCell>{fmt(r.value, locale)}</TableCell>
                          <TableCell>{fmt2((r as { pct?: number }).pct, locale)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Operational */}
          <Card>
            <CardHeader>
              <CardTitle>عملیاتی</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    وضعیت ریسک مشتری در آخرین روز کاری
                    <span title="این مقدار از آخرین اعتبارسنجی محاسبه‌شده خوانده می‌شود" className="text-blue-400 cursor-help text-xs">ℹ️</span>
                  </p>
                  <p className="font-semibold mt-1">{riskStatusLabel(agg.latestRiskStatus)}</p>
                </div>
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">تعداد کارگزاری‌های درگیر در ارزش در ریسک</p>
                  <p className="font-semibold mt-1">{fmt(displayBrokCount || ratings.length, locale)}</p>
                </div>
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">ترکیب پرتفوی در بازار سرمایه</p>
                  <p className="font-semibold mt-1">{fmt(portfolio.length, locale)} نماد</p>
                </div>
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">سابقه ریسک در بازار سرمایه</p>
                  <p className="font-semibold mt-1">
                    {fmt(ratings.reduce((s, a) => s + (Number(a.operational.article12History) || 0), 0), locale)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Violations */}
          <Card>
            <CardHeader>
              <CardTitle>تخلفاتی</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">کل سابقه طرح دعوا منجر به صدور حکم عدم سازش در بازار سرمایه</p>
                  <p className="font-semibold mt-1">{fmt(agg.lawsuitsSum, locale)}</p>
                </div>
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">سابقه اعمال محدودیت معاملاتی در سامانه‌های شرکت‌های کارگزاری</p>
                  <p className="font-semibold mt-1">{fmt(agg.restrictionsSum, locale)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6. Brokerages list */}
          <Card>
            <CardHeader>
              <CardTitle>لیست کارگزاری‌های مشتری</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ratings.map((a) => {
                  const bid = a.brokerageId?.toLowerCase() ?? '';
                  const name = brokerageMap.get(bid) ?? a.brokerageName ?? '-';
                  const calc = calcMap.get(a.id.toLowerCase());
                  // کارگزاری درگیر در ارزش در ریسک — ValueAtRisk is computed by the
                  // engine as max(0, بدهی تجاری − ارزش تضمین), so > 0 is exactly the
                  // backend's involved test. The box background already encodes the
                  // risk TIER, so involvement is shown with a red outline + badge
                  // rather than a tint, which would fight the tier colour.
                  const involved = (calc?.valueAtRisk ?? 0) > 0;
                  return (
                    <a
                      key={a.id}
                      href={`/report/brokerage?personId=${filterPerson?.id}&brokerageId=${a.brokerageId}`}
                      className="block p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer"
                      style={{
                        backgroundColor: hexToRgba(tierColor(calc?.riskTier), 0.08),
                        borderColor: hexToRgba(tierColor(calc?.riskTier), 0.4),
                        boxShadow: `0 1px 4px ${hexToRgba(tierColor(calc?.riskTier), 0.15)}`,
                        ...(involved
                          ? { outline: '2px solid rgba(220,38,38,0.55)', outlineOffset: '-2px' }
                          : {}),
                      }}
                    >
                      <p className="font-medium text-sm">{name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {calc?.riskTier ? (
                          <span className="text-sm font-bold px-3 py-1 rounded text-white" style={{ backgroundColor: tierColor(calc.riskTier) }}>{calc.riskTier}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {involved && (
                          <span
                            className="text-xs font-bold px-2 py-1 rounded bg-red-600 text-white"
                            title="ارزش تضمین این کارگزاری کمتر از بدهی تجاری آن است"
                          >
                            درگیر در ارزش ریسک
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(a.updatedAt, locale)}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </>)}
      </div>

      <div className="col-span-1">
        <ReportSidebar
          person={filterPerson}
          personFullName={personFullName}
          riskTier={agg?.worstTier}
          riskScore={agg?.avgScore ?? undefined}
          totalRatings={ratings.length}
          lastDate={ratings[0]?.updatedAt}
        />
      </div>
    </div>
    </div>
  );
}

