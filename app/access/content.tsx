'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiInformationFill } from '@remixicon/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { CompanySelect } from '@/components/common/company-select';
import { PersonSearch, type PersonSearchResult } from '@/components/common/person-search';
import { AccessManagementSection } from './components/access-management-section';
import { RoleAccessManagementSection } from './components/role-access-management-section';
import { Sidebar } from './components/sidebar';

type SubjectType = 1 | 2;

const SELECTION_KEY = 'credit-rating-access-current-selection';

interface PersistedSelection {
  subjectType: SubjectType;
  subjectId: string;
}

function loadSelection(): PersistedSelection | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SELECTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if ((parsed.subjectType === 1 || parsed.subjectType === 2) && typeof parsed.subjectId === 'string') {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveSelection(value: PersistedSelection | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value && value.subjectId) {
      window.localStorage.setItem(SELECTION_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(SELECTION_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function CreditRatingAccessContent() {
  const { t } = useTranslation('credit-rating-access');

  const initial = typeof window === 'undefined' ? null : loadSelection();
  const [subjectType, setSubjectType] = useState<SubjectType>(initial?.subjectType ?? 1);
  const [subjectId, setSubjectId] = useState<string>(initial?.subjectId ?? '');
  // Cache the picked PersonSearchResult so the PersonSearch input shows the
  // chosen person without an extra round-trip to the directory.
  const [pickedPerson, setPickedPerson] = useState<PersonSearchResult | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const handleSubjectTypeChange = useCallback((v: string) => {
    const next = Number(v) === 2 ? 2 : 1;
    setSubjectType(next as SubjectType);
    // Changing the subject type clears the selection — a Person Id is not a
    // valid Brokerage Id and vice versa.
    setSubjectId('');
    setPickedPerson(null);
    saveSelection(null);
  }, []);

  const handlePickPerson = useCallback((p: PersonSearchResult | null) => {
    setPickedPerson(p);
    const id = p?.id ?? '';
    setSubjectId(id);
    saveSelection(id ? { subjectType: 1, subjectId: id } : null);
  }, []);

  const handlePickBrokerage = useCallback((id: string) => {
    setSubjectId(id);
    saveSelection(id ? { subjectType: 2, subjectId: id } : null);
  }, []);

  // Gate the role-access editor by the caller's access level on the active subject.
  const { data: myLevels } = useQuery<{ assessment: number }>({
    queryKey: ['credit-rating-access-my-levels', subjectType, subjectId],
    queryFn: async () => {
      if (!subjectId) return { assessment: 0 };
      const res = await fetch(`/credit-rating/api/credit-rating/access/my-levels/${subjectType}/${subjectId}`);
      if (!res.ok) return { assessment: 0 };
      return res.json();
    },
    enabled: !!subjectId,
  });
  const canEditRoleAccess = (myLevels?.assessment ?? 0) >= 2;

  return (
    <div className="space-y-5 lg:space-y-7.5">
      {/*
        Title Card lives OUTSIDE the descendant-tint wrapper below so its
        color override actually wins. Default theme is blue; on view-only
        the title flips to red and a banner appears under the description.
      */}
      <Card
        className={
          isReadOnly
            ? 'bg-red-50/25! border-red-100! dark:bg-red-950/25! dark:border-red-900! shadow-lg shadow-black/5'
            : 'bg-blue-50/25! border-blue-100! dark:bg-blue-950/25! dark:border-blue-900! shadow-lg shadow-black/5'
        }
      >
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle
                text={t('creditRatingAccessPageTitle', {
                  defaultValue: 'Credit Rating Access Management',
                })}
              />
              <ToolbarDescription>
                {t('accessManagementDescription', {
                  defaultValue: 'Grant view or edit access to a person or brokerage credit assessments',
                })}
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
          {isReadOnly && (
            <div className="mt-3 flex items-center gap-3">
              <RiInformationFill className="text-red-700 dark:text-red-400 size-5 shrink-0" />
              <span className="text-red-900 dark:text-red-200 font-medium">
                {t('accessViewOnlyBanner', {
                  defaultValue: 'You have view-only access to access management',
                })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/*
        Blue glass tint on every section Card via descendant selector.
      */}
      <div
        className={
          '[&_div.rounded-xl.bg-card]:bg-blue-50/25! ' +
          '[&_div.rounded-xl.bg-card]:border-blue-100! ' +
          'dark:[&_div.rounded-xl.bg-card]:bg-blue-950/25! ' +
          'dark:[&_div.rounded-xl.bg-card]:border-blue-900! ' +
          '[&_div.rounded-xl.bg-card]:shadow-lg ' +
          '[&_div.rounded-xl.bg-card]:shadow-black/5'
        }
      >
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 lg:gap-7.5">
          <div className="col-span-3">
            <div className="grid gap-5 lg:gap-7.5">
              <Card>
                <CardHeader>
                  <CardTitle>{t('selectSubject', { defaultValue: 'Select Subject' })}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('subjectType', { defaultValue: 'Subject Type' })}</Label>
                      <Select value={String(subjectType)} onValueChange={handleSubjectTypeChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{t('subjectTypePerson', { defaultValue: 'Person' })}</SelectItem>
                          <SelectItem value="2">{t('subjectTypeBrokerage', { defaultValue: 'Brokerage' })}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {subjectType === 1 ? (
                      <PersonSearch
                        onSelect={handlePickPerson}
                        value={pickedPerson}
                        label={t('selectPerson', { defaultValue: 'Select Person' })}
                        apiUrl="/api/person/directory"
                      />
                    ) : (
                      <CompanySelect
                        source="brokerage"
                        value={subjectId}
                        onValueChange={handlePickBrokerage}
                        label={t('selectBrokerage', { defaultValue: 'Select Brokerage' })}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {subjectId && (
                <AccessManagementSection
                  subjectType={subjectType}
                  subjectId={subjectId}
                  onReadOnlyChange={setIsReadOnly}
                />
              )}

              {subjectId && (
                <RoleAccessManagementSection
                  subjectType={subjectType}
                  subjectId={subjectId}
                  canEdit={canEditRoleAccess}
                />
              )}
            </div>
          </div>
          <div className="col-span-1">
            <div className="grid gap-5 lg:gap-7.5">
              <Sidebar subjectType={subjectType} subjectId={subjectId || undefined} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
