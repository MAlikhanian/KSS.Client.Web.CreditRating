import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import {
  listCreditRatingAccessByPair,
  upsertCreditRatingAccessGrant,
  type CreditRatingSubjectType,
} from '@/services/credit-rating-api';

function parseSubjectType(raw: string | null): CreditRatingSubjectType | null {
  if (raw === '1') return 1;
  if (raw === '2') return 2;
  return null;
}

// GET /api/credit-rating/access?subjectType=…&subjectId=… — list grants for the subject.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const subjectType = parseSubjectType(request.nextUrl.searchParams.get('subjectType'));
    const subjectId = request.nextUrl.searchParams.get('subjectId');
    if (!subjectType || !subjectId) {
      return NextResponse.json(
        { message: 'subjectType (1 or 2) and subjectId are required' },
        { status: 400 },
      );
    }

    const data = await listCreditRatingAccessByPair(session.accessToken, subjectType, subjectId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error listing credit-rating access grants:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}

// POST /api/credit-rating/access — upsert per-(subjectType, subjectId, grantee) grant.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    await upsertCreditRatingAccessGrant(session.accessToken, body);
    return NextResponse.json({ message: 'Access grant saved.' }, { status: 200 });
  } catch (error) {
    console.error('Error granting credit-rating access:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
