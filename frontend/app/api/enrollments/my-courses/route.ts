import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const DEFAULT_BACKEND_URL = 'https://academy-backend-git-dev-fixes-adilmohd04s-projects.vercel.app';

const resolveBackendUrl = () => {
  const envUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  if (!envUrl) return DEFAULT_BACKEND_URL;
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: proxyHeaders,
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const text = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';

    return { response, text, contentType };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export async function GET(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    const backendUrl = resolveBackendUrl();
    const fallbackBackendUrl = resolveFallbackBackendUrl();
    const bypassSecret = getProtectionBypassSecret();
    const token = await getToken();

    const resolvedUserId = userId || request.headers.get('x-clerk-user-id') || '';
    const resolvedAuthorization = request.headers.get('authorization') || (token ? `Bearer ${token}` : '');

    const proxyHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(resolvedUserId ? { 'x-clerk-user-id': resolvedUserId } : {}),
      ...(resolvedAuthorization
        ? { Authorization: resolvedAuthorization }
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
      '/api/enrollments/my-courses',
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
        '/api/enrollments/my-courses',
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
    console.error('Error in GET /api/enrollments/my-courses proxy:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch my courses' },
      { status: 500 }
    );
  }
}
