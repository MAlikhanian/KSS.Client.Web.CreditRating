import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { rejectAssessmentApi, UpstreamError } from '@/services/credit-rating-api';
import { extractUpstreamMessage } from '@/services/upstream-error';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason: string | null = typeof body?.reason === 'string' ? body.reason : null;
    const dto = await rejectAssessmentApi(session.accessToken, id, reason);
    return NextResponse.json(dto);
  } catch (error) {
    const message = extractUpstreamMessage(error);
    const status = error instanceof UpstreamError ? error.status : 400;
    console.error('[credit-rating/reject] upstream error:', message);
    return NextResponse.json({ message }, { status });
  }
}
