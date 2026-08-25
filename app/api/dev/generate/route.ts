import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateSessions, markHeldSessions, seedUpcomingAttendance } from '@/lib/sessions';

export const dynamic = 'force-dynamic';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET || 'dev-cron-secret-key-12345';
    const headerSecret = request.headers.get('x-cron-secret') || '';

    if (!headerSecret || !safeCompare(headerSecret, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const genRes = await generateSessions();
    const seedRes = await seedUpcomingAttendance();
    const markRes = await markHeldSessions();

    return NextResponse.json({
      generate: genRes,
      seedAttendance: seedRes,
      markHeld: markRes,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
