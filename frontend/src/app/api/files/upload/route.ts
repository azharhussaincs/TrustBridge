import { NextRequest } from 'next/server';

const BACKEND_URL = (process.env.BACKEND_PROXY_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Stream multipart uploads to the API without Next.js rewrite body buffering. */
export async function POST(request: NextRequest) {
  try {
    const headers = new Headers();
    const auth = request.headers.get('authorization');
    const contentType = request.headers.get('content-type');
    if (auth) headers.set('Authorization', auth);
    if (contentType) headers.set('Content-Type', contentType);

    const init: RequestInit & { duplex?: 'half' } = {
      method: 'POST',
      headers,
      body: request.body,
      duplex: 'half',
    };

    const backendResponse = await fetch(`${BACKEND_URL}/api/files/upload`, init);
    const responseHeaders = new Headers();
    const responseType = backendResponse.headers.get('content-type');
    if (responseType) responseHeaders.set('Content-Type', responseType);

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload proxy failed';
    console.error('File upload proxy error:', message);
    return Response.json({ success: false, message }, { status: 500 });
  }
}
