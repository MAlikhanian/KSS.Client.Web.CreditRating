'use client';

import { Fragment } from 'react';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { useSettings } from '@/providers/settings-provider';
import { Container } from '@/components/common/container';
import { ListContent } from './content';
import { PageNavbar } from '@/app/page-navbar';
import { useTranslation } from '@/hooks/useTranslation';

export default function CreditRatingListPage() {
  const { settings } = useSettings();
  const { t } = useTranslation('credit-rating-list');

  return (
    <Fragment>
      <PageNavbar />
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('pageTitle', { defaultValue: 'Cases' })} />
              <ToolbarDescription>
                {t('toolbarDescription', { defaultValue: 'Manage and view recorded credit assessments' })}
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </Container>
      )}
      <Container>
        <ListContent />
      </Container>
    </Fragment>
  );
}
