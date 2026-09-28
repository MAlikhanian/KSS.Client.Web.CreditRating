'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { PersonSearch, type PersonSearchResult } from '@/components/common/person-search';
import { formatDateTime } from '@/app/components/person/format-utils';

const LEVEL_NONE = 0;
const LEVEL_VIEW = 1;
const LEVEL_EDIT = 2;
const FA_LANGUAGE_ID = 12;
const EN_LANGUAGE_ID = 10;

type SubjectType = 1 | 2;

interface AccessGrantSummary {
  subjectType: SubjectType;
  subjectId: string;
  grantedToPersonId: string;
  assessmentLevel: number;
  createdAt: string;
  updatedAt: string | null;
}

interface PersonLite {
  id: string;
  nationalId: string;
  translations: Array<{ languageId: number; firstName: string; lastName: string }>;
}

interface AccessManagementSectionProps {
  subjectType: SubjectType;
  subjectId: string;
  onReadOnlyChange?: (isReadOnly: boolean) => void;
}

export function AccessManagementSection({
  subjectType,
  subjectId,
  onReadOnlyChange,
}: AccessManagementSectionProps) {
  const { t, i18n } = useTranslation('credit-rating-access');
  const queryClient = useQueryClient();
  const uiLangId = i18n.language === 'fa' ? FA_LANGUAGE_ID : EN_LANGUAGE_ID;
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';

  // Caller's own access on this subject — used to lock the section down for
  // non-editors. Banner only fires for view-only (level 1).
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
  const assessmentLevel = myLevels?.assessment ?? 0;
  const canEdit = assessmentLevel >= LEVEL_EDIT;

  useEffect(() => {
    onReadOnlyChange?.(!!subjectId && assessmentLevel === LEVEL_VIEW);
  }, [subjectId, assessmentLevel, onReadOnlyChange]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchResult | null>(null);
  const [level, setLevel] = useState<number>(LEVEL_NONE);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    toast.custom(
      () => (
        <Alert variant="mono" icon={type === 'success' ? 'success' : 'destructive'}>
          <AlertIcon>
            {type === 'success' ? <RiCheckboxCircleFill /> : <RiErrorWarningFill />}
          </AlertIcon>
          <AlertTitle>{message}</AlertTitle>
        </Alert>
      ),
      { position: 'top-center' },
    );
  }, []);

  // Existing grants for this subject.
  const { data: grants = [] } = useQuery<AccessGrantSummary[]>({
    queryKey: ['credit-rating-access', subjectType, subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      const res = await fetch(
        `/credit-rating/api/credit-rating/access?subjectType=${subjectType}&subjectId=${subjectId}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load access grants');
      }
      return res.json();
    },
    enabled: !!subjectId,
  });

  // Person directory for grantee name rendering.
  const { data: peopleDirectory = [] } = useQuery<PersonLite[]>({
    queryKey: ['person-directory-for-access'],
    queryFn: async () => {
      const res = await fetch('/api/person/directory?query=&limit=1000');
      if (!res.ok) return [];
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!subjectId,
  });

  const peopleById = useMemo(() => {
    const map = new Map<string, PersonLite>();
    for (const p of peopleDirectory) map.set(p.id, p);
    return map;
  }, [peopleDirectory]);

  const getPersonDisplay = useCallback((id: string): string => {
    const p = peopleById.get(id);
    if (!p) return id;
    const tr = p.translations?.find((tt) => tt.languageId === uiLangId) || p.translations?.[0];
    const name = tr ? `${tr.firstName} ${tr.lastName}`.trim() : '';
    return name ? `${name}${p.nationalId ? ` (${p.nationalId})` : ''}` : p.nationalId || id;
  }, [peopleById, uiLangId]);

  useEffect(() => {
    if (!dialogOpen) {
      setEditingPersonId(null);
      setSelectedPerson(null);
      setLevel(LEVEL_NONE);
    }
  }, [dialogOpen]);

  const handleOpenAdd = useCallback(() => {
    setEditingPersonId(null);
    setSelectedPerson(null);
    setLevel(LEVEL_NONE);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((g: AccessGrantSummary) => {
    setEditingPersonId(g.grantedToPersonId);
    const lookup = peopleById.get(g.grantedToPersonId);
    if (lookup) {
      setSelectedPerson({
        id: lookup.id,
        nationalId: lookup.nationalId,
        translations: lookup.translations,
      } as PersonSearchResult);
    } else {
      setSelectedPerson(null);
    }
    setLevel(g.assessmentLevel);
    setDialogOpen(true);
  }, [peopleById]);

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!subjectId) throw new Error('subjectId missing');
      const granteeId = editingPersonId || selectedPerson?.id;
      if (!granteeId) throw new Error('Pick a person');
      const res = await fetch('/credit-rating/api/credit-rating/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectType,
          subjectId,
          grantedToPersonId: granteeId,
          assessmentLevel: level,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to grant access');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-rating-access', subjectType, subjectId] });
      setDialogOpen(false);
      showToast(t('accessGranted'), 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (grantedToPersonId: string) => {
      if (!subjectId) throw new Error('subjectId missing');
      const res = await fetch(
        `/credit-rating/api/credit-rating/access/by-pair/${subjectType}/${subjectId}/${grantedToPersonId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to revoke access');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-rating-access', subjectType, subjectId] });
      showToast(t('accessRevoked'), 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });

  if (!subjectId) return null;

  const renderLevelBadge = (lvl: number) => {
    if (lvl === LEVEL_EDIT) return <Badge variant="primary">{t('levelEdit')}</Badge>;
    if (lvl === LEVEL_VIEW) return <Badge variant="secondary">{t('levelView')}</Badge>;
    return <Badge variant="outline">{t('levelNone')}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-sm font-bold"></span>
          {t('accessManagement')}
          <Badge variant="outline">{grants.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <fieldset disabled={!canEdit} className="space-y-4 contents">
          <div className="space-y-4">
            {canEdit && (
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={handleOpenAdd}>
                  <Plus className="h-4 w-4 ml-1" />
                  {t('add')}
                </Button>
              </div>
            )}

            {grants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('noAccessGrantsYet')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('person-search:label', { defaultValue: 'Person' })}</TableHead>
                    <TableHead>{t('sectionAssessment')}</TableHead>
                    <TableHead>{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                    <TableHead>{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grants.map((g, idx) => (
                    <TableRow key={g.grantedToPersonId}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{getPersonDisplay(g.grantedToPersonId)}</TableCell>
                      <TableCell>{renderLevelBadge(g.assessmentLevel)}</TableCell>
                      <TableCell style={{ unicodeBidi: 'plaintext' }}>{formatDateTime(g.createdAt, locale)}</TableCell>
                      <TableCell style={{ unicodeBidi: 'plaintext' }}>{formatDateTime(g.updatedAt, locale)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenEdit(g)}
                                aria-label={t('editGrant')}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => revokeMutation.mutate(g.grantedToPersonId)}
                                disabled={revokeMutation.status === 'pending'}
                                aria-label={t('removeAccess')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </fieldset>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPersonId ? t('editGrant') : t('addAccess')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {editingPersonId ? (
                <div className="space-y-2">
                  <Label>{t('person-search:label', { defaultValue: 'Person' })}</Label>
                  <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                    {getPersonDisplay(editingPersonId)}
                  </div>
                </div>
              ) : (
                <PersonSearch
                  onSelect={(p) => setSelectedPerson(p)}
                  value={selectedPerson}
                  label={t('person-search:label', { defaultValue: 'Person' })}
                  apiUrl="/api/person/directory"
                />
              )}
              <div className="space-y-2">
                <Label>{t('sectionAssessment')}</Label>
                <Select
                  value={String(level)}
                  onValueChange={(v) => setLevel(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(LEVEL_NONE)}>{t('levelNone')}</SelectItem>
                    <SelectItem value={String(LEVEL_VIEW)}>{t('levelView')}</SelectItem>
                    <SelectItem value={String(LEVEL_EDIT)}>{t('levelEdit')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                {t('common:cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                type="button"
                onClick={() => grantMutation.mutate()}
                disabled={
                  (!editingPersonId && !selectedPerson) || grantMutation.status === 'pending'
                }
              >
                {t('common:save', { defaultValue: 'Save' })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
