import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import {
  getAssessment,
  updateAssessment,
  softDeleteAssessmentApi,
} from '@/services/credit-rating-api';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const data = await getAssessment(session.accessToken, id);
    if (!data) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed.' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    await updateAssessment(session.accessToken, { ...body, id });
    return NextResponse.json({ message: 'Updated.' });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed.' },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    await softDeleteAssessmentApi(session.accessToken, id);
    return NextResponse.json({ message: 'Deleted.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed.';
    console.error('[credit-rating/delete] upstream error:', message);
    return NextResponse.json({ message }, { status: 400 });
  }
}
