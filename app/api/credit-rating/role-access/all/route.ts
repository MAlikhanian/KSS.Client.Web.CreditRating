import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { listAllCreditRatingRoleAccess } from '@/services/credit-rating-api';

// GET /api/credit-rating/role-access/all — every role grant in the credit-rating service.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const data = await listAllCreditRatingRoleAccess(session.accessToken);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error listing all credit-rating role-access grants:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
