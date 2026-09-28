'use client';

import { Fragment, Suspense } from 'react';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { useSettings } from '@/providers/settings-provider';
import { Container } from '@/components/common/container';
import { GeneralInquiryContent } from './content';
import { PageNavbar } from '@/app/page-navbar';
import { useTranslation } from '@/hooks/useTranslation';

export default function GeneralInquiryPage() {
  const { settings } = useSettings();
  const { t } = useTranslation('credit-rating-report');

  return (
    <Fragment>
      <PageNavbar />
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('pageTitleGeneral', { defaultValue: 'General Inquiry' })} />
              <ToolbarDescription>
                {t('selectCustomerCardDescription', { defaultValue: 'Pick a customer to look up their credit ratings.' })}
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </Container>
      )}
      <Container>
        {/* Suspense required because GeneralInquiryContent uses useSearchParams */}
        <Suspense fallback={null}>
          <GeneralInquiryContent />
        </Suspense>
      </Container>
    </Fragment>
  );
}
