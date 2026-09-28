import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import {
  revokeCreditRatingRoleAccessByPair,
  type CreditRatingSubjectType,
} from '@/services/credit-rating-api';

// DELETE /api/credit-rating/role-access/by-pair?grantedToRoleId=…&subjectType=…&subjectId=…
// Omitting subjectType + subjectId revokes a global grant.
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const grantedToRoleId = request.nextUrl.searchParams.get('grantedToRoleId');
    const subjectTypeRaw = request.nextUrl.searchParams.get('subjectType');
    const subjectId = request.nextUrl.searchParams.get('subjectId');

    if (!grantedToRoleId) {
      return NextResponse.json({ message: 'grantedToRoleId is required' }, { status: 400 });
    }

    let subjectType: CreditRatingSubjectType | null = null;
    if (subjectTypeRaw !== null && subjectTypeRaw !== '') {
      const n = Number(subjectTypeRaw);
      if (n !== 1 && n !== 2) {
        return NextResponse.json({ message: 'subjectType must be 1 or 2' }, { status: 400 });
      }
      subjectType = n as CreditRatingSubjectType;
    }

    await revokeCreditRatingRoleAccessByPair(
      session.accessToken,
      grantedToRoleId,
      subjectType,
      subjectId,
    );
    return NextResponse.json({ message: 'Role access revoked.' });
  } catch (error) {
    console.error('Error revoking credit-rating role access:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
