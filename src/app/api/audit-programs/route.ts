import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: implementar GET /api/audit-programs con withAuth + org scoping
  return NextResponse.json({ success: true, data: [], total: 0 });
}

export async function POST() {
  // TODO: implementar POST /api/audit-programs con withAuth + validación
  return NextResponse.json(
    { success: false, error: 'Not implemented yet' },
    { status: 501 }
  );
}
