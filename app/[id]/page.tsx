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
import { ViewAssessmentContent } from './content';
import { PageNavbar } from '@/app/page-navbar';
import { useTranslation } from '@/hooks/useTranslation';

export default function ViewAssessmentPage() {
  const { settings } = useSettings();
  const { t } = useTranslation('credit-rating-form');

  return (
    <Fragment>
      <PageNavbar />
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('viewTitle', { defaultValue: 'View Assessment' })} />
              <ToolbarDescription>
                {t('toolbarDescription', { defaultValue: 'Record and calculate customer credit rating' })}
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </Container>
      )}
      <Container>
        <ViewAssessmentContent />
      </Container>
    </Fragment>
  );
}
