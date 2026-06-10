import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST() {
  try {
    await clearAuthCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
