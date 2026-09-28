'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { CreditRatingAccessContent } from './content';

export default function CreditRatingAccessPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <CreditRatingAccessContent />
      </Container>
    </Fragment>
  );
}
