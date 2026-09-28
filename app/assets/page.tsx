'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { CreditRatingAssetsContent } from './content';

export default function CreditRatingAssetsPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <CreditRatingAssetsContent />
      </Container>
    </Fragment>
  );
}
