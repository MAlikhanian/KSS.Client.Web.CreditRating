'use client';

import { AssessmentForm } from '../components/assessment-form';

export function NewAssessmentContent() {
  return (
    <div
      className={
        'space-y-5 lg:space-y-7.5 ' +
        '[&_div.rounded-xl.bg-card]:bg-blue-50/25! ' +
        '[&_div.rounded-xl.bg-card]:border-blue-100! ' +
        'dark:[&_div.rounded-xl.bg-card]:bg-blue-950/25! ' +
        'dark:[&_div.rounded-xl.bg-card]:border-blue-900! ' +
        '[&_div.rounded-xl.bg-card]:shadow-lg ' +
        '[&_div.rounded-xl.bg-card]:shadow-black/5'
      }
    >
      <AssessmentForm />
    </div>
  );
}
