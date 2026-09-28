'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import { PersonSearch, type PersonSearchResult } from '@/components/common/person-search';
import { CompanySelect } from '@/components/common/company-select';
import {
  listAssessments, STATUS_CALCULATED, type AssessmentDraft,
} from '@/app/components/assessment-store';
import { useBrokerages } from '@/hooks/use-brokerages';
import { formatDateTime } from '@/app/components/person/format-utils';
import { ReportSidebar } from '../report-sidebar';
import { RiskGauge, tierColor } from '../risk-gauge';
import { saveReportPerson, loadReportPerson, saveReportBrokerageId, loadReportBrokerageId } from '../use-report-filters';
import { AlertCircle } from 'lucide-react';

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

interface AssetInfo { symbol: string; name: string; }

const FA_LANG = 12;
const EN_LANG = 10;

const fmt  = (v: number|null|undefined, locale: string) => v != null ? new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v) : '—';
const fmt2 = (v: number|null|undefined, locale: string) => v != null ? new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v) : '—';

function riskLabel(v: string): string {
  if (v === 'callMargin') return 'کال مارجین';
  if (v === 'atRisk')     return 'در معرض ریسک';
  if (v === 'noRisk')     return 'هیچکدام';
  return v || '—';
}

export function BrokerageInquiryContent() {
  const { t, i18n } = useTranslation('credit-rating-report');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const langId = i18n.language === 'fa' ? FA_LANG : EN_LANG;
  const searchParams = useSearchParams();

  // Restore from localStorage (falls back to URL param for brokerageId)
  const [filterPerson, setFilterPerson] = useState<PersonSearchResult | null>(
    () => loadReportPerson()
  );
  const [filterBrokerageId, setFilterBrokerageId] = useState<string>(() => {
    const fromUrl = searchParams?.get('brokerageId') ?? '';
    if (fromUrl) { saveReportBrokerageId(fromUrl); return fromUrl; }
    return loadReportBrokerageId();
  });

  const handlePersonSelect = useCallback((p: PersonSearchResult | null) => {
    setFilterPerson(p);
    saveReportPerson(p);
  }, []);

  const handleBrokerageSelect = useCallback((id: string) => {
    setFilterBrokerageId(id);
    saveReportBrokerageId(id);
  }, []);

  // If personId in URL but no person in localStorage, try to fetch from API
  useEffect(() => {
    const personIdFromUrl = searchParams?.get('personId');
    if (!personIdFromUrl || filterPerson) return;
    let cancelled = false;
    fetch(`/api/person/${personIdFromUrl}`)
      .then(r => r.ok ? r.json() : null)
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
  const [items, setItems]               = useState<AssessmentDraft[]>([]);
  const [calculations, setCalculations] = useState<CalculationRow[]>([]);
  const [portfolio, setPortfolio]       = useState<AssetRow[]>([]);
  const [assetMap, setAssetMap]         = useState<Map<string, AssetInfo>>(new Map());
  const { brokerages } = useBrokerages();

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
  useEffect(() => {
    if (!filterPersonId) { setPortfolio([]); return; }
    let cancelled = false;
    fetch(`/api/person/asset?personId=${encodeURIComponent(filterPersonId)}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (!cancelled) setPortfolio(Array.isArray(d) ? d : []); });
    return () => { cancelled = true; };
  }, [filterPersonId]);

  useEffect(() => {
    let cancelled = false;
    fetch('/credit-rating/api/market/asset/list')
      .then(r => r.ok ? r.json() : { assets:[], translations:[] })
      .then(data => {
        if (cancelled) return;
        const m = new Map<string, AssetInfo>();
        const syms = new Map<string, string>();
        (data.assets??[]).forEach((a:{id:string;symbol:string}) => syms.set(a.id.toLowerCase(), a.symbol));
        const fb = new Map<string,string>();
        (data.translations??[]).forEach((tr:{assetId:string;languageId:number;name:string}) => {
          const k = tr.assetId.toLowerCase();
          if (tr.languageId === langId) m.set(k, { symbol: syms.get(k)??'', name: tr.name });
          else if (!fb.has(k)) fb.set(k, tr.name);
        });
        syms.forEach((sym,id) => { if (!m.has(id)) m.set(id, { symbol: sym, name: fb.get(id)??'' }); });
        setAssetMap(m);
      });
    return () => { cancelled = true; };
  }, [langId]);

  const calcMap = useMemo(() => {
    const m = new Map<string, CalculationRow>();
    calculations.forEach(c => m.set(c.assessmentId.toLowerCase(), c));
    return m;
  }, [calculations]);

  const latest = useMemo(() => {
    if (!filterPerson || !filterBrokerageId) return null;
    const pid = filterPerson.id.toLowerCase();
    const bid = filterBrokerageId.toLowerCase();
    return items
      .filter(a => a.customer?.personId?.toLowerCase()===pid && a.brokerageId?.toLowerCase()===bid && a.status===STATUS_CALCULATED)
      .sort((a,b) => new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime())[0] ?? null;
  }, [items, filterPerson, filterBrokerageId]);

  const calc = latest ? calcMap.get(latest.id.toLowerCase()) : null;
  const brokerageObj = brokerages.find(b => b.id === filterBrokerageId);
  const brokerageName = brokerageObj?.name ?? '-';

  const personFullName = (() => {
    if (!filterPerson) return '';
    const tr = filterPerson.translations?.find(x=>x.languageId===langId) || filterPerson.translations?.[0];
    return tr ? `${tr.firstName} ${tr.lastName}`.trim() : filterPerson.nationalId;
  })();

  // Top-80% portfolio
  const top80 = useMemo(() => {
    if (!portfolio.length) return [];
    const rows = portfolio.map(r => {
      const val = r.acquisitionValue ?? (r.quantity??0)*(r.acquisitionPrice??0);
      const info = assetMap.get(r.assetId.toLowerCase());
      return { assetId: r.assetId, symbol: info?.symbol??r.assetId, name: info?.name??'', value: val };
    }).sort((a,b)=>b.value-a.value);
    const total = rows.reduce((s,r)=>s+r.value,0);
    if (!total) return rows.slice(0,5).map(r=>({...r, pct:0}));
    let cum=0;
    const res=[];
    for (const r of rows) {
      cum+=r.value;
      res.push({...r, pct:(r.value/total)*100});
      if (cum/total>=0.8) break;
    }
    return res;
  }, [portfolio, assetMap]);

  // Use real data if available, otherwise fall back to sample for layout preview
  const hasData = !!latest;
  const showSample = !filterPerson && !filterBrokerageId;

  // Sample values shown when no selection has been made
  const sampleCalc = { riskScore: 37, riskTier: 'B1', valueAtRisk: 95_000_000, tradingTurnover: 2_400_000_000, brokerageCount: 2 };
  const displayCalc     = showSample ? sampleCalc : calc;
  const displayBrokName = showSample ? 'کارگزاری مفید' : brokerageName;
  const displayBrokNid  = showSample ? '۱۴۰۰۳۳۴۵۶۷' : (brokerageObj?.nationalId ?? '—');
  const displayName     = showSample ? 'علی محمدی' : (personFullName || '—');
  const displayNid      = showSample ? '۰۰۸۲۲۸۰۶۶۵' : (filterPerson?.nationalId || '—');
  const displayDate     = showSample ? '۱۴۰۴/۰۲/۱۵' : (latest ? formatDateTime(latest.updatedAt, locale) : '—');
  const sampleFin = { totalAssets: 1_250_000_000, guaranteeValue: 840_000_000, commercialDebt: 380_000_000, article13History: 2 };
  const displayFin      = showSample ? sampleFin : {
    totalAssets:    Number(latest?.financial.totalAssets)    || 0,
    guaranteeValue: Number(latest?.financial.guaranteeValue) || 0,
    commercialDebt: Number(latest?.financial.commercialDebt) || 0,
    article13History: Number(latest?.financial.article13History) || 0,
  };
  const displayRiskLastDay  = showSample ? 'کال مارجین' : riskLabel(latest?.operational.riskStatusLastDay ?? '');
  const displayArticle12    = showSample ? 1 : (Number(latest?.operational.article12History) || 0);
  const displayLawsuits     = showSample ? 1 : (Number(latest?.violation.lawsuitsHistory) || 0);
  const displayRestrictions = showSample ? 3 : (Number(latest?.violation.tradingRestrictionsHistory) || 0);

  const tc = tierColor(displayCalc?.riskTier);

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
            <CardDescription className="mx-auto max-w-2xl">
              {t('selectCustomerCardDescription', { defaultValue: 'Pick a customer to look up their credit ratings.' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PersonSearch onSelect={handlePersonSelect} value={filterPerson} label={t('selectCustomer', { defaultValue: 'Select Customer' })} />
            {filterPerson && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-950 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {t('personSelectedBanner', { defaultValue: '{{name}} with national code {{nationalId}} has been selected', name: personFullName, nationalId: filterPerson.nationalId })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Brokerage selector */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t('selectBrokerageCardTitle', { defaultValue: 'Select Brokerage' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <CompanySelect source="brokerage" value={filterBrokerageId} onValueChange={handleBrokerageSelect} placeholder={t('selectBrokerageCardTitle', { defaultValue: 'Select Brokerage' })} label={t('colBrokerage', { defaultValue: 'Brokerage' })} />
          </CardContent>
        </Card>

        {filterPerson && filterBrokerageId && !hasData && (
          <Card><CardContent className="py-10 text-center text-muted-foreground">{t('noResults', { defaultValue: 'No calculated assessments found for this query.' })}</CardContent></Card>
        )}

        {/* Show content when real data exists OR as sample preview */}
        {(hasData || showSample) && (<>

          {showSample && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              داده‌های نمونه برای نمایش طراحی — پس از انتخاب مشتری و کارگزاری، داده واقعی نمایش داده می‌شود.
            </div>
          )}

          {/* Brokerage + Customer identity */}
          <Card>
            <CardHeader><CardTitle>اطلاعات کارگزاری</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">نام کارگزاری</p>
                  <p className="font-semibold mt-1">{displayBrokName}</p>
                </div>
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">شناسه ملی کارگزاری</p>
                  <p className="font-semibold mt-1 font-mono">{displayBrokNid}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>اطلاعات مشتری</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">نام و نام خانوادگی</p>
                  <p className="font-semibold mt-1">{displayName}</p>
                </div>
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">کد ملی</p>
                  <p className="font-semibold mt-1 font-mono">{displayNid}</p>
                </div>
                <div className="p-3 bg-background rounded-lg border shadow-sm">
                  <p className="text-xs text-muted-foreground">تاریخ اعتبارسنجی</p>
                  <p className="font-semibold mt-1">{displayDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Status */}
          <Card>
            <CardHeader><CardTitle>وضعیت ریسک مشتری در کارگزاری</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 items-center gap-4">
                <div className="w-52 h-52 mx-auto bg-background rounded-lg border shadow-sm flex flex-col items-center justify-center gap-3 p-4">
                  <p className="text-sm text-muted-foreground text-center leading-snug font-medium">سطح ریسک در کارگزاری</p>
                  {displayCalc?.riskTier
                    ? <span className="inline-block text-2xl font-bold px-4 py-2 rounded-md text-white" style={{ backgroundColor: tc }}>{displayCalc.riskTier}</span>
                    : <span className="text-muted-foreground">—</span>}
                </div>
                <div className="flex justify-center">
                  <RiskGauge score={displayCalc?.riskScore} tier={displayCalc?.riskTier} />
                </div>
                <div className="w-52 h-52 mx-auto bg-background rounded-lg border shadow-sm flex flex-col items-center justify-center gap-3 p-4">
                  <p className="text-sm text-muted-foreground text-center leading-snug font-medium">امتیاز ریسک در کارگزاری</p>
                  <p className="text-3xl font-bold" style={{ color: tc }}>{fmt2(displayCalc?.riskScore, locale)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial */}
          <Card>
            <CardHeader><CardTitle>مالی</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'دارایی کل در کارگزاری', value: fmt(displayFin.totalAssets, locale), unit: 'ریال' },
                  { label: 'ارزش تضمین در کارگزاری', value: fmt(displayFin.guaranteeValue, locale), unit: 'ریال' },
                  { label: 'بدهی تجاری در کارگزاری', value: fmt(displayFin.commercialDebt, locale), unit: 'ریال' },
                  { label: 'ارزش در ریسک در کارگزاری', value: fmt(displayCalc?.valueAtRisk, locale), unit: 'ریال' },
                  { label: 'گردش معاملاتی در کارگزاری', value: fmt(displayCalc?.tradingTurnover, locale), unit: 'ریال' },
                  { label: 'سابقه ماده ۱۳ در کارگزاری', value: fmt(displayFin.article13History, locale), unit: '' },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-background rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-semibold mt-1">{item.value}</p>
                    {item.unit && <p className="text-xs text-muted-foreground">{item.unit}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Portfolio */}
          <Card>
            <CardHeader><CardTitle>سهم در پرتفوی در کارگزاری</CardTitle></CardHeader>
            <CardContent>
              {(top80.length === 0 && !showSample) ? (
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
                      {(showSample ? [
                        { assetId:'1', symbol:'فولاد', name:'فولاد مبارکه', value:350_000_000, pct:28 },
                        { assetId:'2', symbol:'وبملت', name:'بانک ملت', value:280_000_000, pct:22 },
                        { assetId:'3', symbol:'شبندر', name:'پالایش نفت بندرعباس', value:190_000_000, pct:15 },
                      ] : top80).map(r => (
                        <TableRow key={r.assetId}>
                          <TableCell className="font-medium">{r.symbol}{r.name ? ` — ${r.name}` : ''}</TableCell>
                          <TableCell>{fmt(r.value, locale)}</TableCell>
                          <TableCell>{fmt2((r as {pct?:number}).pct, locale)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Operational */}
          <Card>
            <CardHeader><CardTitle>عملیاتی</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'وضعیت ریسک مشتری در آخرین روز کاری', value: displayRiskLastDay },
                  { label: 'تعداد کارگزاری‌های درگیر در ارزش در ریسک', value: fmt(displayCalc?.brokerageCount ?? (showSample ? 2 : null), locale) },
                  { label: 'ترکیب پرتفوی در کارگزاری', value: `${fmt(showSample ? 8 : portfolio.length, locale)} نماد` },
                  { label: 'سابقه ریسک در کارگزاری (ماده ۱۲)', value: fmt(displayArticle12, locale) },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-background rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-semibold mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Violations */}
          <Card>
            <CardHeader><CardTitle>تخلفاتی</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'کل سابقه طرح دعوا منجر به صدور حکم عدم سازش در کارگزاری', value: fmt(displayLawsuits, locale) },
                  { label: 'سابقه اعمال محدودیت معاملاتی در سامانه‌های کارگزاری', value: fmt(displayRestrictions, locale) },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-background rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-semibold mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </>)}
      </div>

      <div className="col-span-1">
        <ReportSidebar
          person={filterPerson}
          personFullName={showSample ? 'علی محمدی' : personFullName}
          brokerageName={showSample ? displayBrokName : (filterBrokerageId ? brokerageName : undefined)}
          riskTier={displayCalc?.riskTier}
          riskScore={displayCalc?.riskScore ?? undefined}
          lastDate={showSample ? '2025-05-04' : latest?.updatedAt}
        />
      </div>
    </div>
    </div>
  );
}
