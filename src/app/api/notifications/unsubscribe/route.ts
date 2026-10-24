import { NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse('Invalid or missing unsubscribe token', { status: 400 });
  }

  const success = await unsubscribeByToken(token);

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Unsubscribed - TechRadar</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { font-family: monospace; background: #070b0e; color: #e4e4e7; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      .card { background: #0d1319; border: 1px solid ${success ? '#10b981' : '#ef4444'}; padding: 32px; border-radius: 12px; max-width: 480px; text-align: center; }
      h1 { font-size: 18px; margin-bottom: 12px; color: ${success ? '#34d399' : '#f87171'}; }
      p { font-size: 13px; color: #a1a1aa; line-height: 1.5; }
      a { color: #60a5fa; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${success ? '✓ Unsubscribed Successfully' : '⚠ Invalid Token'}</h1>
      <p>${
        success
          ? 'You have been opted out from all automated email digests. In-app notifications will remain active in your dashboard.'
          : 'Could not process unsubscription. The link may have expired or is invalid.'
      }</p>
      <p style="margin-top: 20px;"><a href="/">← Return to TechRadar</a></p>
    </div>
  </body>
</html>
  `.trim();

  return new NextResponse(html, {
    status: success ? 200 : 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
