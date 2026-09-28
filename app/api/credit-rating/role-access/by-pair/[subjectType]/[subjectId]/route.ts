import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import {
  listCreditRatingRoleAccessByPair,
  type CreditRatingSubjectType,
} from '@/services/credit-rating-api';

// GET /api/credit-rating/role-access/by-pair/{subjectType}/{subjectId} —
// per-subject + global role grants for this subject's access page.
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

    const data = await listCreditRatingRoleAccessByPair(
      session.accessToken,
      stNum as CreditRatingSubjectType,
      subjectId,
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error listing credit-rating role-access grants:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
