import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import {
  revokeCreditRatingAccessByPair,
  type CreditRatingSubjectType,
} from '@/services/credit-rating-api';

// DELETE /api/credit-rating/access/by-pair/{subjectType}/{subjectId}/{grantedToPersonId}
export async function DELETE(
  _request: NextRequest,
  { params }: {
    params: Promise<{ subjectType: string; subjectId: string; grantedToPersonId: string }>;
  },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { subjectType, subjectId, grantedToPersonId } = await params;
    const stNum = Number(subjectType);
    if (stNum !== 1 && stNum !== 2) {
      return NextResponse.json({ message: 'subjectType must be 1 or 2' }, { status: 400 });
    }
    if (!subjectId || !grantedToPersonId) {
      return NextResponse.json(
        { message: 'subjectId and grantedToPersonId are required' },
        { status: 400 },
      );
    }

    await revokeCreditRatingAccessByPair(
      session.accessToken,
      stNum as CreditRatingSubjectType,
      subjectId,
      grantedToPersonId,
    );
    return NextResponse.json({ message: 'Access revoked.' });
  } catch (error) {
    console.error('Error revoking credit-rating access by pair:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
