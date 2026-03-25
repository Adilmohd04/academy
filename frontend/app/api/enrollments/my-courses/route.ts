import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_BACKEND_URL = 'https://academy-backend-git-dev-fixes-adilmohd04s-projects.vercel.app';

const resolveBackendUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || '';
  if (!envUrl) return DEFAULT_BACKEND_URL;
  return envUrl.replace(/\/$/, '');
};

export async function GET(request: NextRequest) {
  try {
    const backendUrl = resolveBackendUrl();

    const response = await fetch(`${backendUrl}/api/enrollments/my-courses`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-clerk-user-id': request.headers.get('x-clerk-user-id') || '',
        ...(request.headers.get('authorization')
          ? { Authorization: request.headers.get('authorization') as string }
          : {}),
      },
      cache: 'no-store',
    });

    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/enrollments/my-courses proxy:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch my courses' },
      { status: 500 }
    );
  }
}
