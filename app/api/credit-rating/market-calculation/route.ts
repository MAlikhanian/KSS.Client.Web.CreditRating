import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { getMarketCalculation } from '@/services/credit-rating-api';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const personId = request.nextUrl.searchParams.get('personId');
  if (!personId) {
    return NextResponse.json({ message: 'personId is required' }, { status: 400 });
  }
  try {
    const data = await getMarketCalculation(session.accessToken, personId);
    if (!data) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed.' },
      { status: 500 },
    );
  }
}
