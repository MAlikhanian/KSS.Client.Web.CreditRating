'use client';

import { Navbar } from '@/partials/navbar/navbar';
import { NavbarMenu } from '@/partials/navbar/navbar-menu';
import { useSettings } from '@/providers/settings-provider';
import { Container } from '@/components/common/container';
import { useTranslation } from 'react-i18next';

const PageNavbar = () => {
  const { settings } = useSettings();
  const { t } = useTranslation();

  const items = [
    { title: t('menu.creditRatingInquiry', { defaultValue: 'Inquiry' }), path: '/credit-rating/report/general' },
    { title: t('menu.creditRatingDataEntry', { defaultValue: 'Data Entry' }), path: '/credit-rating/new' },
    { title: t('menu.creditRatingCases', { defaultValue: 'Cases' }), path: '/credit-rating/list' },
    { title: t('menu.assets', { defaultValue: 'Assets' }), path: '/credit-rating/assets' },
  ];

  if (settings?.layout === 'demo1') {
    return (
      <Navbar>
        <Container>
          <NavbarMenu items={items} />
        </Container>
      </Navbar>
    );
  }
  return <></>;
};

export { PageNavbar };
