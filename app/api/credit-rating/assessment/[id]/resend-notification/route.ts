import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { resendApprovalNotificationApi, UpstreamError } from '@/services/credit-rating-api';
import { extractUpstreamMessage } from '@/services/upstream-error';

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    await resendApprovalNotificationApi(session.accessToken, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = extractUpstreamMessage(error);
    const status = error instanceof UpstreamError ? error.status : 400;
    console.error('[credit-rating/resend-notification] upstream error:', message);
    return NextResponse.json({ message }, { status });
  }
}
