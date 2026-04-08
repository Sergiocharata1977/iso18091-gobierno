import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const code = search.get('code');
  const error = search.get('error');
  const errorReason = search.get('error_reason') ?? search.get('error_description');
  const baseUrl = request.nextUrl.origin;

  // Embedded Signup in UI uses FB.login and exchanges the code via /api/whatsapp/connect.
  // This callback route is kept for compatibility/future OAuth redirect flow.
  if (error) {
    const url = new URL('/crm/whatsapp/config', baseUrl);
    url.searchParams.set('meta_oauth', 'error');
    url.searchParams.set('reason', errorReason ?? error);
    return NextResponse.redirect(url);
  }

  if (code) {
    const url = new URL('/crm/whatsapp/config', baseUrl);
    url.searchParams.set('meta_oauth', 'code_received');
    return NextResponse.redirect(url);
  }

  return NextResponse.json(
    {
      success: false,
      error: 'Callback OAuth sin parametros validos.',
    },
    { status: 400 }
  );
}
