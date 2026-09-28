import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import {
  listAssessmentsAll,
  listAssessmentsByPerson,
  createAssessment,
} from '@/services/credit-rating-api';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const personId = request.nextUrl.searchParams.get('personId');
    const data = personId
      ? await listAssessmentsByPerson(session.accessToken, personId)
      : await listAssessmentsAll(session.accessToken);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const result = await createAssessment(session.accessToken, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed.' },
      { status: 400 },
    );
  }
}
