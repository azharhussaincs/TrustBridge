import { NextRequest } from 'next/server';

const BACKEND_URL = (process.env.BACKEND_PROXY_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Stream file downloads from the API without buffering through Next.js rewrites. */
export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('Authorization', auth);

  const backendResponse = await fetch(
    `${BACKEND_URL}/api/files/download/${params.fileId}`,
    { method: 'GET', headers }
  );

  const responseHeaders = new Headers();
  for (const name of ['content-type', 'content-disposition', 'content-length']) {
    const value = backendResponse.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}
