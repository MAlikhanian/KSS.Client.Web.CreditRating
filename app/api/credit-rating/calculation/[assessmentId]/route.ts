import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { getCalculation } from '@/services/credit-rating-api';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { assessmentId } = await params;
    const data = await getCalculation(session.accessToken, assessmentId);
    if (!data) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed.' },
      { status: 500 },
    );
  }
}
