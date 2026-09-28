'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Plus, Trash2, Pencil, Check, ChevronsUpDown } from 'lucide-react';
import { RiCheckboxCircleFill, RiErrorWarningFill, RiInformationFill } from '@remixicon/react';
import { toast } from 'sonner';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { DatePickerComponent } from '@/components/ui/date-picker';
import {
  PersonSearch,
  type PersonSearchResult,
} from '@/components/common/person-search';
import { CompanySelect } from '@/components/common/company-select';
import { useBrokerages } from '@/hooks/use-brokerages';
import { AmountInput } from '@/components/ui/amount-input';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { useSession } from 'next-auth/react';
import {
  localizeDigits,
  formatDateTime,
  translateApiError,
} from '@/app/components/person/format-utils';
import {
  loadPersonSelection,
  savePersonSelection,
} from '@/app/components/person/use-person-selection';
import { Sidebar } from '@/app/components/person/person-sidebar';

interface PersonAssetItem {
  id: string;
  personId: string;
  assetId: string;
  companyId: string;
  quantity: number;
  acquisitionDate?: string | null;
  acquisitionPrice?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

interface AssetItem {
  id: string;
  symbol: string;
  marketTypeId?: number;
  assetTypeId?: number;
  sectorId?: number | null;
  isActive?: boolean;
  isDelisted?: boolean;
}

interface AssetTranslationItem {
  assetId: string;
  languageId: number;
  name: string;
  shortName?: string | null;
}

interface AssetListResponse {
  assets: AssetItem[];
  translations: AssetTranslationItem[];
}

export function CreditRatingAssetsContent() {
  const { t, i18n } = useTranslation('person-asset');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const langId = i18n.language === 'fa' ? 12 : 10;

  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [selectedPerson, setSelectedPerson] =
    useState<PersonSearchResult | null>(() => loadPersonSelection());

  const handleSelectPerson = useCallback(
    (p: PersonSearchResult | null) => {
      setSelectedPerson(p);
      savePersonSelection(p);
    },
    [],
  );

  // Access driven by Portfolio.PersonAsset.* permissions — the canonical
  // perm for managing this data after the Person.Assets → Portfolio.PersonAsset
  // rename. CreditRating* roles are granted Portfolio.PersonAsset.* directly
  // (Auth migration 021), so credit-rating analysts retain access.
  const perms = session?.user.permissions ?? [];
  const canEdit = perms.includes('Portfolio.PersonAsset.Modify');
  const isReadOnly =
    !!selectedPerson?.id &&
    !canEdit &&
    perms.includes('Portfolio.PersonAsset.Read');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);

  // Form state
  const [formAssetId, setFormAssetId] = useState<string>('');
  const [formCompanyId, setFormCompanyId] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState<string>('');
  const [formAcquisitionDate, setFormAcquisitionDate] = useState<string>('');
  const [formAcquisitionPrice, setFormAcquisitionPrice] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  const showToast = useCallback(
    (message: string, type: 'success' | 'error') => {
      toast.custom(
        () => (
          <Alert
            variant="mono"
            icon={type === 'success' ? 'success' : 'destructive'}
          >
            <AlertIcon>
              {type === 'success' ? (
                <RiCheckboxCircleFill />
              ) : (
                <RiErrorWarningFill />
              )}
            </AlertIcon>
            <AlertTitle>{message}</AlertTitle>
          </Alert>
        ),
        { position: 'top-center' },
      );
    },
    [],
  );

  // Fetch all assets + translations for the combobox
  const { data: assetListData } = useQuery<AssetListResponse>({
    queryKey: ['market-asset-list'],
    queryFn: async () => {
      const response = await fetch('/credit-rating/api/market/asset/list');
      if (!response.ok) throw new Error('Failed to fetch assets');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Wrap in useMemo so identity is stable across renders — otherwise the
  // `?? []` fallback creates a new array on every render and downstream
  // useCallback/useMemo hooks re-fire continuously.
  const assets = useMemo(
    () => assetListData?.assets ?? [],
    [assetListData?.assets],
  );
  const assetTranslations = useMemo(
    () => assetListData?.translations ?? [],
    [assetListData?.translations],
  );

  const getAssetName = useCallback(
    (assetId: string) => {
      const tr =
        assetTranslations.find(
          (t) => t.assetId?.toLowerCase() === assetId?.toLowerCase() && t.languageId === langId,
        ) ||
        assetTranslations.find(
          (t) => t.assetId?.toLowerCase() === assetId?.toLowerCase(),
        );
      return tr?.name || '';
    },
    [assetTranslations, langId],
  );

  const getAssetSymbol = useCallback(
    (assetId: string) => {
      const a = assets.find((x) => x.id?.toLowerCase() === assetId?.toLowerCase());
      return a?.symbol || '';
    },
    [assets],
  );

  // Holdings are assigned to a BROKERAGE (sourced from the ERP Members service).
  // A brokerage's id IS its Company id, so it stores straight into PersonAsset.CompanyId.
  // Resolving the name from the same source the picker uses keeps the grid in sync and
  // avoids the per-caller access scoping that /api/company/select applies.
  const { brokerages } = useBrokerages();
  const getCompanyName = useCallback(
    (companyId?: string | null) => {
      if (!companyId) return '';
      const b = brokerages.find((x) => x.id?.toLowerCase() === companyId.toLowerCase());
      return b?.name || '';
    },
    [brokerages],
  );

  // Fetch person assets when person selected
  const personAssetsQueryKey = ['person-assets', selectedPerson?.id];
  const { data: personAssets = [] } = useQuery<PersonAssetItem[]>({
    queryKey: personAssetsQueryKey,
    queryFn: async () => {
      if (!selectedPerson?.id) return [];
      const response = await fetch(
        `/api/person/asset?personId=${encodeURIComponent(selectedPerson.id)}`,
      );
      if (!response.ok) throw new Error('Failed to fetch person assets');
      return response.json();
    },
    enabled: !!selectedPerson?.id,
  });

  // Build combobox options sorted by symbol
  const assetOptions = useMemo(() => {
    return [...assets]
      .filter((a) => !a.isDelisted)
      .map((a) => ({
        id: a.id,
        symbol: a.symbol,
        name: getAssetName(a.id),
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [assets, getAssetName]);

  const resetForm = () => {
    setEditingId(null);
    setFormAssetId('');
    setFormCompanyId('');
    setFormQuantity('');
    setFormAcquisitionDate('');
    setFormAcquisitionPrice('');
    setFormNotes('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: PersonAssetItem) => {
    setEditingId(item.id);
    setFormAssetId(item.assetId);
    setFormCompanyId(item.companyId || '');
    setFormQuantity(String(item.quantity ?? ''));
    setFormAcquisitionDate(
      item.acquisitionDate
        ? (item.acquisitionDate as string).split('T')[0]
        : '',
    );
    // AmountInput is integer-only, so feed it a whole-number digit string.
    setFormAcquisitionPrice(
      item.acquisitionPrice !== null && item.acquisitionPrice !== undefined
        ? String(Math.trunc(Number(item.acquisitionPrice)))
        : '',
    );
    setFormNotes(item.notes || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedPerson?.id) {
      showToast(
        t('noPersonSelected', { defaultValue: 'Please select a person' }),
        'error',
      );
      return;
    }
    if (!formAssetId) {
      showToast(
        t('selectAsset', { defaultValue: 'Please select an asset' }),
        'error',
      );
      return;
    }
    if (!formCompanyId) {
      showToast(
        t('brokerageRequired', { defaultValue: 'Please select a brokerage' }),
        'error',
      );
      return;
    }
    const quantityNumber = Number(formQuantity);
    if (!formQuantity || Number.isNaN(quantityNumber) || quantityNumber <= 0) {
      showToast(
        t('quantityRequired', {
          defaultValue: 'Please enter a valid quantity',
        }),
        'error',
      );
      return;
    }

    if (!formAcquisitionDate) {
      showToast(
        t('acquisitionDateRequired', {
          defaultValue: 'Please select an acquisition date',
        }),
        'error',
      );
      return;
    }

    if (!formAcquisitionPrice) {
      showToast(
        t('acquisitionPriceRequired', {
          defaultValue: 'Please enter an acquisition price',
        }),
        'error',
      );
      return;
    }
    const priceNumber = Number(formAcquisitionPrice);
    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      showToast(
        t('priceInvalid', { defaultValue: 'Invalid acquisition price' }),
        'error',
      );
      return;
    }

    try {
      if (editingId) {
        const body = {
          id: editingId,
          companyId: formCompanyId,
          quantity: quantityNumber,
          acquisitionDate: formAcquisitionDate,
          acquisitionPrice: priceNumber,
          notes: formNotes || null,
        };
        const response = await fetch('/api/person/asset', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to update asset');
        }
        showToast(t('updated', { defaultValue: 'Asset updated' }), 'success');
      } else {
        const body = {
          personId: selectedPerson.id,
          assetId: formAssetId,
          companyId: formCompanyId,
          quantity: quantityNumber,
          acquisitionDate: formAcquisitionDate,
          acquisitionPrice: priceNumber,
          notes: formNotes || null,
        };
        const response = await fetch('/api/person/asset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to add asset');
        }
        showToast(t('added', { defaultValue: 'Asset added' }), 'success');
      }

      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: personAssetsQueryKey });
    } catch (error) {
      showToast(
        error instanceof Error
          ? translateApiError(error.message, t)
          : t('common:error', { defaultValue: 'An error occurred' }),
        'error',
      );
    }
  };

  const handleDelete = async (item: PersonAssetItem) => {
    try {
      const response = await fetch('/api/person/asset', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete asset');
      }
      showToast(t('deleted', { defaultValue: 'Asset deleted' }), 'error');
      await queryClient.invalidateQueries({ queryKey: personAssetsQueryKey });
    } catch (error) {
      showToast(
        error instanceof Error
          ? translateApiError(error.message, t)
          : t('deleteFailed', { defaultValue: 'Failed to delete asset' }),
        'error',
      );
    }
  };

  const formatNumber = (n: number | null | undefined) => {
    if (n === null || n === undefined) return '-';
    return localizeDigits(n.toLocaleString(locale), locale);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return localizeDigits(
      new Date(dateStr).toLocaleDateString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
      locale,
    );
  };

  const selectedAssetLabel = formAssetId
    ? `${getAssetSymbol(formAssetId)}${getAssetName(formAssetId) ? ` - ${getAssetName(formAssetId)}` : ''}`
    : '';

  return (
    <div className="space-y-5 lg:space-y-7.5">
      {/*
        Title Card lives OUTSIDE the descendant-tint wrapper below so its
        color override actually wins (descendant selectors beat Card-level
        classes on specificity even with `!`).
      */}
      <Card
        className={
          isReadOnly
            // Red tint — view-only warning.
            ? 'bg-red-50/25! border-red-100! dark:bg-red-950/25! dark:border-red-900! shadow-lg shadow-black/5'
            // Blue tint — matches the rest of the assets page.
            : 'bg-blue-50/25! border-blue-100! dark:bg-blue-950/25! dark:border-blue-900! shadow-lg shadow-black/5'
        }
      >
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('pageTitle', { defaultValue: 'Person Assets' })} />
              <ToolbarDescription>
                {t('toolbar.description', { defaultValue: 'Manage asset assignments per person' })}
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
          {isReadOnly && (
            <div className="mt-3 flex items-center gap-3">
              <RiInformationFill className="text-red-700 dark:text-red-400 size-5 shrink-0" />
              <span className="text-red-900 dark:text-red-200 font-medium">
                {t('person-access:assetsViewOnlyBanner', {
                  defaultValue: 'You have view-only access to assets',
                })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/*
        Green glass tint on every section Card via descendant selector.
        Title Card is intentionally above this wrapper so it can flip to red
        without competing with the green rule.
      */}
      <div
        className={
          // Light theme
          '[&_div.rounded-xl.bg-card]:bg-blue-50/25! ' +
          '[&_div.rounded-xl.bg-card]:border-blue-100! ' +
          // Dark theme
          'dark:[&_div.rounded-xl.bg-card]:bg-blue-950/25! ' +
          'dark:[&_div.rounded-xl.bg-card]:border-blue-900! ' +
          // Both themes
          '[&_div.rounded-xl.bg-card]:shadow-lg ' +
          '[&_div.rounded-xl.bg-card]:shadow-black/5'
        }
      >
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 lg:gap-7.5">
        <div className="col-span-3">
          <div className="grid gap-5 lg:gap-7.5">
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{t('selectPerson', { defaultValue: 'Select Person' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <PersonSearch onSelect={handleSelectPerson} value={selectedPerson} />
        </CardContent>
      </Card>

      {!selectedPerson ? (
        <Card>
          <CardContent className="py-10">
            <p className="text-sm text-muted-foreground text-center">
              {t('noPersonSelected', {
                defaultValue: 'Please select a person',
              })}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-sm font-bold"></span>
              {t('pageTitle', { defaultValue: 'Person Assets' })}
              <Badge variant="outline">
                {personAssets.length.toLocaleString(locale)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {canEdit && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAdd}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    {t('common:add', { defaultValue: 'Add' })}
                  </Button>
                </div>
              )}

              {personAssets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('noItems', { defaultValue: 'No assets registered' })}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{t('symbol', { defaultValue: 'Symbol' })}</TableHead>
                      <TableHead>{t('name', { defaultValue: 'Name' })}</TableHead>
                      <TableHead>{t('brokerage', { defaultValue: 'Brokerage' })}</TableHead>
                      <TableHead>{t('quantity', { defaultValue: 'Quantity' })}</TableHead>
                      <TableHead>
                        {t('acquisitionDate', { defaultValue: 'Acquisition Date' })}
                      </TableHead>
                      <TableHead>
                        {t('acquisitionPrice', { defaultValue: 'Acquisition Price' })}
                      </TableHead>
                      <TableHead>{t('notes', { defaultValue: 'Notes' })}</TableHead>
                      <TableHead>
                        {t('common:createdAt', { defaultValue: 'Created At' })}
                      </TableHead>
                      <TableHead>
                        {t('common:updatedAt', { defaultValue: 'Last Modified' })}
                      </TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personAssets.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{(index + 1).toLocaleString(locale)}</TableCell>
                        <TableCell className="font-mono">
                          {getAssetSymbol(item.assetId) || '-'}
                        </TableCell>
                        <TableCell>{getAssetName(item.assetId) || '-'}</TableCell>
                        <TableCell style={{ unicodeBidi: 'plaintext' }}>
                          {getCompanyName(item.companyId) || '-'}
                        </TableCell>
                        <TableCell>{formatNumber(item.quantity)}</TableCell>
                        <TableCell style={{ unicodeBidi: 'plaintext' }}>
                          {formatDate(item.acquisitionDate)}
                        </TableCell>
                        <TableCell>{formatNumber(item.acquisitionPrice)}</TableCell>
                        <TableCell className="max-w-xs truncate" title={item.notes || ''}>
                          {item.notes || '-'}
                        </TableCell>
                        <TableCell style={{ unicodeBidi: 'plaintext' }}>
                          {formatDateTime(item.createdAt, locale)}
                        </TableCell>
                        <TableCell style={{ unicodeBidi: 'plaintext' }}>
                          {formatDateTime(item.updatedAt, locale)}
                        </TableCell>
                        <TableCell>
                          {canEdit && (
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenEdit(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDelete(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t('editDialog', { defaultValue: 'Edit Asset' })
                : t('addDialog', { defaultValue: 'Add Asset' })}
            </DialogTitle>
          </DialogHeader>
          <fieldset disabled={!canEdit} className="space-y-4 contents">
          <div className="space-y-4">
            {/* Asset combobox */}
            <div className="space-y-2">
              <Label>
                {t('asset', { defaultValue: 'Asset' })}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Popover open={assetPickerOpen} onOpenChange={setAssetPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={assetPickerOpen}
                    className="w-full justify-between"
                    disabled={!!editingId}
                  >
                    {selectedAssetLabel ||
                      t('selectAsset', { defaultValue: 'Select asset...' })}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder={t('searchAssetPlaceholder', {
                        defaultValue: 'Search by symbol or name...',
                      })}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {t('noAssetFound', { defaultValue: 'No asset found' })}
                      </CommandEmpty>
                      <CommandGroup>
                        {assetOptions.map((option) => (
                          <CommandItem
                            key={option.id}
                            value={`${option.symbol} ${option.name}`}
                            onSelect={() => {
                              setFormAssetId(option.id);
                              setAssetPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                formAssetId === option.id
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                            <span className="font-mono mr-2">
                              {option.symbol}
                            </span>
                            <span className="flex-1 text-muted-foreground">
                              {option.name}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Company the holding is recorded under */}
            <div className="space-y-2">
              <CompanySelect
                value={formCompanyId}
                onValueChange={setFormCompanyId}
                source="brokerage"
                label={t('brokerage', { defaultValue: 'Brokerage' })}
                required
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label>
                {t('quantity', { defaultValue: 'Quantity' })}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                placeholder={t('quantityPlaceholder', { defaultValue: '0' })}
              />
            </div>

            {/* Acquisition Date */}
            <div className="space-y-2">
              <Label>
                {t('acquisitionDate', { defaultValue: 'Acquisition Date' })}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <DatePickerComponent
                value={formAcquisitionDate}
                onChange={(value) => setFormAcquisitionDate(value)}
                placeholder={t('selectDate', { defaultValue: 'Select Date' })}
                forcePersian={true}
              />
            </div>

            {/* Acquisition Price */}
            <div className="space-y-2">
              <Label>
                {t('acquisitionPrice', { defaultValue: 'Acquisition Price' })}{' '}
                <span className="text-destructive">*</span>
              </Label>
              {/* Grouped with thousands separators while typing; emits the raw
                  digit string, so the Number() parse below is unchanged. */}
              <AmountInput
                value={formAcquisitionPrice}
                onChange={setFormAcquisitionPrice}
                placeholder={t('acquisitionPricePlaceholder', {
                  defaultValue: '0',
                })}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t('notes', { defaultValue: 'Notes' })}</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder={t('notesPlaceholder', {
                  defaultValue: 'Optional notes...',
                })}
                rows={3}
              />
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
            <Button type="button" onClick={handleSave} disabled={!canEdit}>
              {t('common:save', { defaultValue: 'Save' })}
            </Button>
          </DialogFooter>
          </fieldset>
        </DialogContent>
      </Dialog>
    </div>
        </div>
      </div>
          <div className="col-span-1">
            <div className="grid gap-5 lg:gap-7.5">
              <Sidebar personId={selectedPerson?.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
