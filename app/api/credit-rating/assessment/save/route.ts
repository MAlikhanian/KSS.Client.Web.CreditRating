import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { saveAndCalculate, UpstreamError } from '@/services/credit-rating-api';
import { extractUpstreamMessage } from '@/services/upstream-error';

// One-shot endpoint used by the form: upsert assessment + snapshot + trigger calc.
// Replaces the old "save then separately submit" two-call dance.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const result = await saveAndCalculate(session.accessToken, body);
    return NextResponse.json(result);
  } catch (error) {
    const message = extractUpstreamMessage(error);
    const status = error instanceof UpstreamError ? error.status : 400;
    console.error('[credit-rating/save] upstream error:', message);
    return NextResponse.json({ message }, { status });
  }
}
