'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';

interface SidebarProps {
  subjectType?: 1 | 2;
  subjectId?: string;
}

export function Sidebar(_props: SidebarProps = {}) {
  // subjectType / subjectId are accepted for forward compatibility — the
  // sidebar UI does not currently key on them.
  void _props;
  const { t } = useTranslation('credit-rating-access');

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('creditRatingAccessPageTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('accessManagementDescription')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
