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
import { BrokerageInquiryContent } from './content';
import { PageNavbar } from '@/app/page-navbar';
import { useTranslation } from '@/hooks/useTranslation';

export default function BrokerageInquiryPage() {
  const { settings } = useSettings();
  const { t } = useTranslation('credit-rating-report');

  return (
    <Fragment>
      <PageNavbar />
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('pageTitleBrokerage', { defaultValue: 'Brokerage Inquiry' })} />
              <ToolbarDescription>
                {t('selectBrokerageCardDescription', { defaultValue: 'Pick a brokerage to scope the inquiry.' })}
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </Container>
      )}
      <Container>
        {/* Suspense required because BrokerageInquiryContent uses useSearchParams */}
        <Suspense fallback={null}>
          <BrokerageInquiryContent />
        </Suspense>
      </Container>
    </Fragment>
  );
}
