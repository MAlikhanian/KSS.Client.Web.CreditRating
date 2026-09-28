import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';

/**
 * GET: List all assets and their translations.
 *
 * Lightweight endpoint used by the Person Asset combobox so the user can
 * search by asset symbol or translated name.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.MARKET_DATA_API_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { message: 'MARKET_DATA_API_BASE_URL is not set.' },
        { status: 500 },
      );
    }

    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: 'application/json',
    };

    const [assetsRes, translationsRes] = await Promise.all([
      fetch(`${baseUrl}/Api/Asset/ToListAll`, { headers, cache: 'no-store' }),
      fetch(`${baseUrl}/Api/AssetTranslation/ToListAll`, { headers, cache: 'no-store' }),
    ]);

    const assets = assetsRes.ok ? await assetsRes.json() : [];
    const translations = translationsRes.ok ? await translationsRes.json() : [];

    return NextResponse.json({ assets, translations });
  } catch (error) {
    console.error('Error listing market assets:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
