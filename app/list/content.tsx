'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Pencil, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import {
  listAssessments,
  deleteAssessment,
  STATUS_PENDING_APPROVAL,
  STATUS_APPROVED,
  STATUS_REJECTED,
  STATUS_CALCULATED,
  STATUS_DELETED,
  type AssessmentDraft,
  type AssessmentStatusCode,
} from '../components/assessment-store';
import { formatDateTime } from '@/app/components/person/format-utils';
import { ListSidebar } from '../components/list-sidebar';
import { useBrokerages } from '@/hooks/use-brokerages';
import { PersonSearch, type PersonSearchResult } from '@/components/common/person-search';
import { CompanySelect } from '@/components/common/company-select';
import { saveReportPerson, loadReportPerson, saveReportBrokerageId, loadReportBrokerageId } from '../report/use-report-filters';

interface PersonRow {
  id: string;
  nationalId: string;
  translations?: Array<{ languageId: number; firstName: string; lastName: string }>;
}

interface CalculationRow {
  assessmentId: string;
  riskScore: number | null;
  riskTier: string | null;
}

const FA_LANG = 12;
const EN_LANG = 10;

const STATUS_VARIANT: Record<AssessmentStatusCode, 'secondary' | 'primary' | 'success' | 'destructive'> = {
  [STATUS_PENDING_APPROVAL]: 'secondary',
  [STATUS_APPROVED]: 'primary',
  [STATUS_REJECTED]: 'destructive',
  [STATUS_CALCULATED]: 'success',
  [STATUS_DELETED]: 'secondary',
};

const STATUS_KEY: Record<AssessmentStatusCode, string> = {
  [STATUS_PENDING_APPROVAL]: 'statusPendingApproval',
  [STATUS_APPROVED]: 'statusApproved',
  [STATUS_REJECTED]: 'statusRejected',
  [STATUS_CALCULATED]: 'statusCalculated',
  [STATUS_DELETED]: 'statusDeleted',
};

export function ListContent() {
  const { t, i18n } = useTranslation('credit-rating-list');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const langId = i18n.language === 'fa' ? FA_LANG : EN_LANG;

  const [items, setItems] = useState<AssessmentDraft[]>([]);
  const [persons, setPersons] = useState<PersonRow[]>([]);
  const [calculations, setCalculations] = useState<CalculationRow[]>([]);
  // Shared filters — synced with the report pages via the same localStorage keys
  const [filterPerson, setFilterPerson] = useState<PersonSearchResult | null>(
    () => loadReportPerson()
  );
  const [filterBrokerageId, setFilterBrokerageId] = useState<string>(
    () => loadReportBrokerageId()
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const { brokerages } = useBrokerages();

  // Save filter selections whenever they change (shared with report pages).
  useEffect(() => {
    saveReportPerson(filterPerson);
    saveReportBrokerageId(filterBrokerageId);
  }, [filterPerson, filterBrokerageId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listAssessments(),
      fetch('/api/person?query=&limit=1000').then((r) => (r.ok ? r.json() : { data: [] })),
      fetch('/credit-rating/api/credit-rating/calculation').then((r) => (r.ok ? r.json() : [])),
    ]).then(([rows, personPayload, calcPayload]) => {
      if (cancelled) return;
      setItems(rows);
      setPersons(Array.isArray(personPayload?.data) ? personPayload.data : []);
      setCalculations(Array.isArray(calcPayload) ? calcPayload : []);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const personMap = useMemo(() => {
    const m = new Map<string, { fullName: string; nationalId: string }>();
    persons.forEach((p) => {
      const tr = p.translations?.find((x) => x.languageId === langId) || p.translations?.[0];
      const fullName = tr ? `${tr.firstName} ${tr.lastName}`.trim() : p.nationalId || p.id;
      m.set(p.id.toLowerCase(), { fullName, nationalId: p.nationalId });
    });
    return m;
  }, [persons, langId]);

  const brokerageMap = useMemo(() => {
    const m = new Map<string, string>();
    brokerages.forEach((b) => m.set(b.id.toLowerCase(), b.name));
    return m;
  }, [brokerages]);

  const calcMap = useMemo(() => {
    const m = new Map<string, CalculationRow>();
    calculations.forEach((c) => m.set(c.assessmentId.toLowerCase(), c));
    return m;
  }, [calculations]);

  const enrich = (a: AssessmentDraft) => {
    const personId = a.customer?.personId?.toLowerCase();
    const personRecord = personId ? personMap.get(personId) : undefined;
    const brokerageId = a.brokerageId?.toLowerCase();
    const calc = calcMap.get(a.id.toLowerCase());
    return {
      fullName: personRecord?.fullName ?? a.customer?.fullName ?? '-',
      nationalId: personRecord?.nationalId ?? a.customer?.nationalId ?? '-',
      brokerageName: (brokerageId && brokerageMap.get(brokerageId)) || a.brokerageName || '-',
      riskTier: calc?.riskTier ?? null,
      riskScore: calc?.riskScore ?? null,
    };
  };

  const filtered = useMemo(() => {
    const pid = filterPerson?.id.toLowerCase();
    const bid = filterBrokerageId?.toLowerCase();

    return items.filter((a) => {
      if (pid && a.customer?.personId?.toLowerCase() !== pid) return false;
      if (bid && a.brokerageId?.toLowerCase() !== bid) return false;
      return true;
    });
  }, [items, filterPerson, filterBrokerageId]);

  const handleDelete = async (id: string) => {
    try {
      await deleteAssessment(id);
      setRefreshKey((k) => k + 1);
      toast.custom(
        () => (
          <Alert variant="mono" icon="success">
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>{t('deleteConfirm', { defaultValue: 'Assessment deleted' })}</AlertTitle>
          </Alert>
        ),
        { position: 'top-center' },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete.');
    }
  };

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
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t('filterByBrokerage', { defaultValue: 'Filter by brokerage' })}</CardTitle>
            <CardDescription className="mx-auto max-w-2xl">
              {t('filterByBrokerageDescription', { defaultValue: 'Pick a brokerage to narrow the list.' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <CompanySelect
                  source="brokerage"
                  value={filterBrokerageId}
                  onValueChange={(id) => { setFilterBrokerageId(id); saveReportBrokerageId(id); }}
                  placeholder={t('filterAllBrokerages', { defaultValue: 'All brokerages' })}
                  label={t('colBrokerage', { defaultValue: 'Brokerage' })}
                />
              </div>
              {filterBrokerageId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => { setFilterBrokerageId(''); saveReportBrokerageId(''); }}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {filterBrokerageId && (() => {
              const selected = brokerages.find((b) => b.id === filterBrokerageId);
              if (!selected) return null;
              return (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-950 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {t('brokerageSelectedBanner', {
                      defaultValue: 'Brokerage {{name}} with national ID {{nationalId}} has been selected',
                      name: selected.name,
                      nationalId: selected.nationalId ?? '-',
                    })}
                  </p>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t('filterByCustomer', { defaultValue: 'Filter by customer' })}</CardTitle>
            <CardDescription className="mx-auto max-w-2xl">
              {t('filterByCustomerDescription', { defaultValue: 'Pick a customer to narrow the list to their assessments.' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PersonSearch
              onSelect={(p) => { setFilterPerson(p); saveReportPerson(p); }}
              value={filterPerson}
              label={t('selectCustomer', { defaultValue: 'Select Customer' })}
            />
            {filterPerson && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-950 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {(() => {
                    const tr = filterPerson.translations?.find((x) => x.languageId === langId) || filterPerson.translations?.[0];
                    const fullName = tr ? `${tr.firstName} ${tr.lastName}`.trim() : filterPerson.nationalId;
                    return t('personSelectedBanner', {
                      defaultValue: '{{name}} with national code {{nationalId}} has been selected',
                      name: fullName,
                      nationalId: filterPerson.nationalId,
                    });
                  })()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('pageTitle', { defaultValue: 'Cases' })}</CardTitle>
          </CardHeader>
          <CardContent>
            {!filterPerson && !filterBrokerageId ? (
              <div className="text-center py-12 text-muted-foreground italic">
                {t('selectFilterFirstHint', { defaultValue: 'Select a customer or brokerage filter above to see assessments.' })}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {t('noResults', { defaultValue: 'No assessments recorded yet' })}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('colDate', { defaultValue: 'Date' })}</TableHead>
                      <TableHead>{t('colCustomer', { defaultValue: 'Customer' })}</TableHead>
                      <TableHead>{t('colNationalId', { defaultValue: 'National ID' })}</TableHead>
                      <TableHead>{t('colBrokerage', { defaultValue: 'Brokerage' })}</TableHead>
                      <TableHead>{t('colRiskTier', { defaultValue: 'Risk Tier' })}</TableHead>
                      <TableHead>{t('colStatus', { defaultValue: 'Status' })}</TableHead>
                      <TableHead>{t('colActions', { defaultValue: 'Actions' })}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => {
                      const e = enrich(a);
                      const canDelete = a.status === STATUS_PENDING_APPROVAL;
                      const rowClass =
                        a.status === STATUS_REJECTED
                          ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60'
                          : a.status === STATUS_APPROVED || a.status === STATUS_CALCULATED
                            ? 'bg-green-50 hover:bg-green-100 dark:bg-green-950/40 dark:hover:bg-green-950/60'
                            : a.status === STATUS_PENDING_APPROVAL
                              ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60'
                              : '';
                      return (
                      <TableRow key={a.id} className={rowClass}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(a.updatedAt, locale)}
                        </TableCell>
                        <TableCell className="font-medium">{e.fullName}</TableCell>
                        <TableCell className="font-mono text-sm">{e.nationalId}</TableCell>
                        <TableCell>{e.brokerageName}</TableCell>
                        <TableCell>
                          {e.riskTier ? (
                            <Badge variant="primary">{e.riskTier}</Badge>
                          ) : (
                            <span className="text-muted-foreground italic">
                              {t('tierPending', { defaultValue: 'Pending calculation' })}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[a.status]}>
                            {t(STATUS_KEY[a.status], { defaultValue: String(a.status) })}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {a.customer?.personId && (
                              <Link
                                href={`/report/general?personId=${a.customer.personId}`}
                              >
                                <Button variant="ghost" size="icon" title={t('actionInquiry', { defaultValue: 'Inquiry' })}>
                                  <Search className="w-4 h-4" />
                                </Button>
                              </Link>
                            )}
                            <Link href={`/${a.id}`}>
                              <Button variant="ghost" size="icon" title={t('actionDetails', { defaultValue: 'Details' })}>
                                <FileText className="w-4 h-4" />
                              </Button>
                            </Link>
                            {canDelete && (
                              <Link href={`/${a.id}/edit`}>
                                <Button variant="ghost" size="icon" title={t('actionEdit', { defaultValue: 'Edit' })}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </Link>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title={t('actionDelete', { defaultValue: 'Delete' })}
                                onClick={() => handleDelete(a.id)}
                              >
                                <Trash2 className="w-4 h-4 text-rose-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="col-span-1">
        <div className="grid gap-5 lg:gap-7.5">
          <ListSidebar items={items} />
        </div>
      </div>
    </div>
    </div>
  );
}
