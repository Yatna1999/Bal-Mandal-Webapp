import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminClient } from '@/lib/supabase/admin';
import {
  generateSessions,
  seedUpcomingAttendance,
  markHeldSessions,
} from '@/lib/sessions';
import {
  createTasksForUpcoming,
  recomputeOpenTasks,
  escalateOverdue,
} from '@/lib/tasks';
import { expireNiyams } from '@/lib/niyams';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function safeCompareSecret(headerSecret: string | null, envSecret: string | undefined): boolean {
  if (!headerSecret || !envSecret) return false;
  const bufHeader = Buffer.from(headerSecret);
  const bufEnv = Buffer.from(envSecret);
  if (bufHeader.length !== bufEnv.length) return false;
  return crypto.timingSafeEqual(bufHeader, bufEnv);
}

// Stubs for WO-31 push notifications
async function sendReminders() {
  return { sent: 0 };
}

async function pruneDeadSubscriptions() {
  return { pruned: 0 };
}

export async function POST(request: Request) {
  const cronHeader = request.headers.get('x-cron-secret');

  if (!safeCompareSecret(cronHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const stepResults: Record<string, unknown> = {};

  const stepList: Array<[string, () => Promise<unknown>]> = [
    ['generateSessions', () => generateSessions()],
    ['seedUpcomingAttendance', () => seedUpcomingAttendance()],
    ['createTasksForUpcoming', () => createTasksForUpcoming()],
    ['recomputeOpenTasks', () => recomputeOpenTasks()],
    ['markHeldSessions', () => markHeldSessions()],
    ['expireNiyams', () => expireNiyams()],
    ['escalateOverdue', () => escalateOverdue()],
    ['sendReminders', () => sendReminders()],
    ['pruneDeadSubs', () => pruneDeadSubscriptions()],
    [
      'touchSupabaseSettings',
      async () => {
        const { error } = await adminClient.from('app_settings').upsert({
          key: 'last_cron_ping',
          value: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);
        return { touched: true };
      },
    ],
  ];

  for (const [name, fn] of stepList) {
    const sStart = Date.now();
    try {
      const res = await fn();
      const sDuration = Date.now() - sStart;
      console.log(`[Cron Dispatch] ${name} completed in ${sDuration}ms`);
      stepResults[name] = { result: res, durationMs: sDuration };
    } catch (err: unknown) {
      const sDuration = Date.now() - sStart;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Cron Dispatch] ${name} failed in ${sDuration}ms:`, errMsg);
      stepResults[name] = { error: errMsg, durationMs: sDuration };
    }
  }

  const totalDurationMs = Date.now() - startTime;

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    totalDurationMs,
    steps: stepResults,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
