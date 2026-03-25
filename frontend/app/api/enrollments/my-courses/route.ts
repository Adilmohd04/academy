import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_BACKEND_URL = 'https://academy-backend-git-dev-fixes-adilmohd04s-projects.vercel.app';

const resolveBackendUrl = () => {
  const envUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  if (!envUrl) return DEFAULT_BACKEND_URL;
  return envUrl.replace(/\/$/, '');
};

const getProtectionBypassSecret = () => {
  return (
    process.env.BACKEND_VERCEL_BYPASS_SECRET ||
    process.env.VERCEL_PROTECTION_BYPASS ||
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
    ''
  );
};

export async function GET(request: NextRequest) {
  try {
    const backendUrl = resolveBackendUrl();
    const bypassSecret = getProtectionBypassSecret();

    const proxyHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-clerk-user-id': request.headers.get('x-clerk-user-id') || '',
      ...(request.headers.get('authorization')
        ? { Authorization: request.headers.get('authorization') as string }
        : {}),
      ...(bypassSecret
        ? {
            'x-vercel-protection-bypass': bypassSecret,
            'x-vercel-set-bypass-cookie': 'true',
          }
        : {}),
    };

    const response = await fetch(`${backendUrl}/api/enrollments/my-courses`, {
      method: 'GET',
      headers: proxyHeaders,
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
