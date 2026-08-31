import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const DEFAULT_LOCAL_BACKEND_URL = 'http://127.0.0.1:5000';
const DEFAULT_REMOTE_BACKEND_URL = 'https://academy-backend-git-dev-fixes-adilmohd04s-projects.vercel.app';

const resolveBackendUrl = () => {
  const envUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  if (!envUrl) {
    return process.env.NODE_ENV === 'development'
      ? DEFAULT_LOCAL_BACKEND_URL
      : DEFAULT_REMOTE_BACKEND_URL;
  }
  return envUrl.replace(/\/$/, '');
};

const resolveFallbackBackendUrl = () => {
  const envUrl = process.env.BACKEND_API_FALLBACK_URL || process.env.NEXT_PUBLIC_API_FALLBACK_URL || '';
  return envUrl ? envUrl.replace(/\/$/, '') : '';
};

const getProtectionBypassSecret = () => {
  return (
    process.env.BACKEND_VERCEL_BYPASS_SECRET ||
    process.env.BACKEND_VERCEL_AUTOMATION_BYPASS_SECRET ||
    process.env.VERCEL_PROTECTION_BYPASS ||
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
    ''
  );
};

const isLikelyVercelProtectionBlock = (status: number, contentType: string, body: string) => {
  if (status !== 401 && status !== 403) return false;
  if (!contentType.toLowerCase().includes('text/html')) return false;
  return /vercel|deployment protection|authentication required|access denied/i.test(body);
};

const fetchFromBackend = async (
  backendUrl: string,
  path: string,
  proxyHeaders: Record<string, string>,
  bypassSecret: string
) => {
  const targetUrl = new URL(`${backendUrl}${path}`);
  if (bypassSecret) {
    targetUrl.searchParams.set('x-vercel-protection-bypass', bypassSecret);
  }

  const response = await fetch(targetUrl.toString(), {
    method: 'GET',
    headers: proxyHeaders,
    cache: 'no-store',
  });

  const text = await response.text();
  const contentType = response.headers.get('content-type') || 'application/json';

  return { response, text, contentType };
};

const BACKEND_PATH = '/api/student/courses/browse';

export async function GET() {
  try {
    // The backend route serving this path is behind requireAuth, and the browse
    // page needs `is_enrolled` to hide courses the student already has. Without
    // a forwarded token every request came back 401. Resolved server-side, the
    // same way the sibling my-courses proxy does it.
    const { userId, getToken } = await auth();
    const token = await getToken();

    const backendUrl = resolveBackendUrl();
    const fallbackBackendUrl = resolveFallbackBackendUrl();
    const bypassSecret = getProtectionBypassSecret();
    const internalAuthSecret = process.env.INTERNAL_AUTH_SHARED_SECRET || '';

    const proxyHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(internalAuthSecret && userId
        ? {
            'x-internal-auth-user-id': userId,
            'x-internal-auth-secret': internalAuthSecret,
          }
        : {}),
      ...(bypassSecret
        ? {
            'x-vercel-protection-bypass': bypassSecret,
            'x-vercel-set-bypass-cookie': 'true',
          }
        : {}),
    };

    let { response, text, contentType } = await fetchFromBackend(
      backendUrl,
      BACKEND_PATH,
      proxyHeaders,
      bypassSecret
    );

    const shouldRetryWithFallback =
      !!fallbackBackendUrl &&
      fallbackBackendUrl !== backendUrl &&
      isLikelyVercelProtectionBlock(response.status, contentType, text);

    if (shouldRetryWithFallback) {
      console.warn('[Proxy] Primary backend blocked by Vercel protection, retrying fallback backend.');
      const fallbackResult = await fetchFromBackend(
        fallbackBackendUrl,
        BACKEND_PATH,
        proxyHeaders,
        bypassSecret
      );
      response = fallbackResult.response;
      text = fallbackResult.text;
      contentType = fallbackResult.contentType;
    }

    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/student/courses/browse proxy:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch browse courses' },
      { status: 500 }
    );
  }
}
