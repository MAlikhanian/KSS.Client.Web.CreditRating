'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SectionShellProps {
  number?: ReactNode;
  title: string;
  badgeColor: string;
  children: ReactNode;
}

export function SectionShell({ number, title, badgeColor, children }: SectionShellProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {number !== undefined && (
            <span
              className={`w-8 h-8 ${badgeColor} rounded-lg flex items-center justify-center text-white text-sm font-bold`}
            >
              {number}
            </span>
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
