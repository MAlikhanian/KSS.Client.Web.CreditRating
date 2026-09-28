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
import type { Role } from '@/services/auth-api';
import { formatDateTime } from '@/app/components/person/format-utils';

const LEVEL_NONE = 0;
const LEVEL_VIEW = 1;
const LEVEL_EDIT = 2;
const FA_LANGUAGE_ID = 12;
const EN_LANGUAGE_ID = 10;

type SubjectType = 1 | 2;

interface RoleAccessGrantSummary {
  subjectType: SubjectType | null;
  subjectId: string | null;
  grantedToRoleId: string;
  assessmentLevel: number;
  createdAt: string;
  updatedAt: string | null;
}

interface RoleAccessManagementSectionProps {
  subjectType: SubjectType;
  subjectId: string;
  canEdit: boolean;
}

type ScopeKey = 'subject' | 'global';

export function RoleAccessManagementSection({
  subjectType,
  subjectId,
  canEdit,
}: RoleAccessManagementSectionProps) {
  const { t, i18n } = useTranslation('credit-rating-access');
  const queryClient = useQueryClient();
  const uiLangId = i18n.language === 'fa' ? FA_LANGUAGE_ID : EN_LANGUAGE_ID;
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';

  const [dialogOpen, setDialogOpen] = useState(false);
  // When non-null, dialog is editing this (subjectType|null, subjectId|null, roleId) tuple.
  const [editingPair, setEditingPair] = useState<{
    subjectType: SubjectType | null;
    subjectId: string | null;
    roleId: string;
  } | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [scope, setScope] = useState<ScopeKey>('subject');
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

  // Per-subject + global role grants visible on this subject's access page.
  const { data: grants = [] } = useQuery<RoleAccessGrantSummary[]>({
    queryKey: ['credit-rating-role-access', subjectType, subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      const res = await fetch(
        `/credit-rating/api/credit-rating/role-access/by-pair/${subjectType}/${subjectId}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load role access grants');
      }
      return res.json();
    },
    enabled: !!subjectId,
  });

  // Full role catalog for the role picker and labels.
  const { data: allRoles = [] } = useQuery<Role[]>({
    queryKey: ['auth-roles-all'],
    queryFn: async () => {
      const res = await fetch('/api/auth/role/all');
      if (!res.ok) return [];
      const json = await res.json().catch(() => []);
      return Array.isArray(json) ? (json as Role[]) : [];
    },
  });

  const rolesById = useMemo(() => {
    const map = new Map<string, Role>();
    for (const r of allRoles) map.set(r.id, r);
    return map;
  }, [allRoles]);

  const getRoleDisplay = useCallback(
    (id: string): string => {
      const r = rolesById.get(id);
      if (!r) return id;
      const tr = r.translations?.find((tt) => tt.languageId === uiLangId) || r.translations?.[0];
      return tr?.name || r.code;
    },
    [rolesById, uiLangId],
  );

  useEffect(() => {
    if (!dialogOpen) {
      setEditingPair(null);
      setSelectedRoleId('');
      setScope('subject');
      setLevel(LEVEL_NONE);
    }
  }, [dialogOpen]);

  const handleOpenAdd = useCallback(() => {
    setEditingPair(null);
    setSelectedRoleId('');
    setScope('subject');
    setLevel(LEVEL_NONE);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((g: RoleAccessGrantSummary) => {
    setEditingPair({
      subjectType: g.subjectType,
      subjectId: g.subjectId,
      roleId: g.grantedToRoleId,
    });
    setSelectedRoleId(g.grantedToRoleId);
    setScope(g.subjectType === null ? 'global' : 'subject');
    setLevel(g.assessmentLevel);
    setDialogOpen(true);
  }, []);

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!subjectId) throw new Error('subjectId missing');
      const roleId = editingPair?.roleId || selectedRoleId;
      if (!roleId) throw new Error('Pick a role');

      // Editing keeps the original scope; adding uses the form's scope toggle.
      const useGlobal = editingPair ? editingPair.subjectType === null : scope === 'global';
      const targetSubjectType: SubjectType | null = useGlobal ? null : subjectType;
      const targetSubjectId: string | null = useGlobal ? null : subjectId;

      const res = await fetch('/credit-rating/api/credit-rating/role-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectType: targetSubjectType,
          subjectId: targetSubjectId,
          grantedToRoleId: roleId,
          assessmentLevel: level,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to grant role access');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-rating-role-access', subjectType, subjectId] });
      setDialogOpen(false);
      showToast(t('roleAccessGranted'), 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (g: RoleAccessGrantSummary) => {
      const params = new URLSearchParams({ grantedToRoleId: g.grantedToRoleId });
      if (g.subjectType !== null && g.subjectId) {
        params.set('subjectType', String(g.subjectType));
        params.set('subjectId', g.subjectId);
      }
      const res = await fetch(`/credit-rating/api/credit-rating/role-access/by-pair?${params.toString()}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to revoke role access');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-rating-role-access', subjectType, subjectId] });
      showToast(t('roleAccessRevoked'), 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });

  // Roles already granted at the active scope — hide in picker to avoid
  // accidental duplicates that would just upsert anyway.
  const usedRoleIdsForScope = useMemo(() => {
    const set = new Set<string>();
    for (const g of grants) {
      const isGlobal = g.subjectType === null;
      if ((scope === 'global' && isGlobal) || (scope === 'subject' && !isGlobal)) {
        set.add(g.grantedToRoleId);
      }
    }
    return set;
  }, [grants, scope]);

  const availableRolesForPicker = useMemo(
    () =>
      allRoles.filter((r) => editingPair?.roleId === r.id || !usedRoleIdsForScope.has(r.id)),
    [allRoles, usedRoleIdsForScope, editingPair],
  );

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
          <span className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center text-white text-sm font-bold"></span>
          {t('roleAccessManagement')}
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
                {t('noRoleGrantsYet')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('selectRole')}</TableHead>
                    <TableHead>{t('scope')}</TableHead>
                    <TableHead>{t('sectionAssessment')}</TableHead>
                    <TableHead>{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                    <TableHead>{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grants.map((g, idx) => (
                    <TableRow key={`${g.subjectType ?? 'global'}-${g.subjectId ?? ''}-${g.grantedToRoleId}`}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{getRoleDisplay(g.grantedToRoleId)}</TableCell>
                      <TableCell>
                        {g.subjectType === null ? (
                          <Badge variant="primary">{t('globalScopeBadge')}</Badge>
                        ) : (
                          <Badge variant="outline">{t('subjectScopeBadge')}</Badge>
                        )}
                      </TableCell>
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
                                aria-label={t('editRoleGrant')}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => revokeMutation.mutate(g)}
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
                {editingPair ? t('editRoleGrant') : t('addRoleAccess')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {editingPair ? (
                <div className="space-y-2">
                  <Label>{t('selectRole')}</Label>
                  <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                    {getRoleDisplay(editingPair.roleId)}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{t('selectRole')}</Label>
                  <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectRole')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRolesForPicker.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {getRoleDisplay(r.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!editingPair && (
                <div className="space-y-2">
                  <Label>{t('scope')}</Label>
                  <Select value={scope} onValueChange={(v) => setScope(v as ScopeKey)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subject">{t('scopeSubject')}</SelectItem>
                      <SelectItem value="global">{t('scopeGlobal')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                  (!editingPair && !selectedRoleId) || grantMutation.status === 'pending'
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
