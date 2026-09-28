import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import {
  getCreditRatingMyLevels,
  type CreditRatingSubjectType,
} from '@/services/credit-rating-api';

// GET /api/credit-rating/access/my-levels/{subjectType}/{subjectId}
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ subjectType: string; subjectId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { subjectType, subjectId } = await params;
    const stNum = Number(subjectType);
    if (stNum !== 1 && stNum !== 2) {
      return NextResponse.json({ message: 'subjectType must be 1 or 2' }, { status: 400 });
    }
    if (!subjectId) {
      return NextResponse.json({ message: 'subjectId is required' }, { status: 400 });
    }

    const levels = await getCreditRatingMyLevels(
      session.accessToken,
      stNum as CreditRatingSubjectType,
      subjectId,
    );
    return NextResponse.json(levels);
  } catch (error) {
    console.error('Error fetching credit-rating access levels:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
