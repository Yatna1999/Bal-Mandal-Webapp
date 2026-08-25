import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { addDays, getDay } from 'date-fns';
import { adminClient } from '@/lib/supabase/admin';
import { TZ } from '@/lib/format';
import type { Database } from '@/lib/database.types';

// TODO: WO-23 - Seed attendance records for newly registered balak across upcoming sessions
export async function seedAttendanceForBalak(balakId: string): Promise<void> {
  // Stub implementation for WO-05
  console.log('seedAttendanceForBalak stub called for balakId:', balakId);
}

/** Task 1: Karyakram predicate */
export function isKaryakramDone(session: { karyakram_text?: string | null }): boolean {
  return !!(session.karyakram_text && session.karyakram_text.trim().length > 0);
}

/** Task 2: Presabha predicate */
export function isPresabhaDone(attendanceRows: Array<{ presabha_status: string }>): boolean {
  return attendanceRows.length > 0 && attendanceRows.every((r) => r.presabha_status !== 'pending');
}

/** Task 3: Attendance predicate */
export function isAttendanceDone(attendanceRows: Array<{ attendance_status: string | null }>): boolean {
  return attendanceRows.length > 0 && attendanceRows.every((r) => r.attendance_status !== null);
}

/** Task 4: Ahnik predicate */
export function isAhnikDone(enrolledBalakCount: number, ahnikWeeksCount: number): boolean {
  return enrolledBalakCount > 0 && ahnikWeeksCount >= enrolledBalakCount;
}

/** Task 5: Aheval predicate */
export function isAhevalDone(session: { aheval_done: boolean }): boolean {
  return !!session.aheval_done;
}

/**
 * Ensure a scheduled session exists for every occurrence of each active
 * sabha's default_weekday within the next `horizonDays`.
 * MUST be idempotent. The cron will call this twice sometimes.
 */
export async function generateSessions(horizonDays?: number): Promise<{
  created: number;
  skipped: number;
}> {
  let horizon = horizonDays;

  if (horizon === undefined) {
    const { data: horizonSetting } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', 'session_horizon_days')
      .single();

    if (horizonSetting?.value) {
      horizon = typeof horizonSetting.value === 'number'
        ? horizonSetting.value
        : Number(horizonSetting.value) || 14;
    } else {
      horizon = 14;
    }
  }

  // 1. Fetch active sabhas
  const { data: sabhas } = await adminClient
    .from('sabhas')
    .select('id, default_weekday, default_start_time, default_end_time, sabha_type')
    .eq('is_active', true);

  if (!sabhas || sabhas.length === 0) {
    return { created: 0, skipped: 0 };
  }

  // 2. Date calculations in Asia/Kolkata timezone
  const now = new Date();
  const nowIST = toZonedTime(now, TZ);
  const todayStr = formatInTimeZone(now, TZ, 'yyyy-MM-dd');

  const rowsToInsert: Database['public']['Tables']['sabha_sessions']['Insert'][] = [];
  let totalCandidates = 0;

  for (let i = 0; i <= horizon; i++) {
    const candidateDate = addDays(nowIST, i);
    const candidateWeekday = getDay(candidateDate); // 0 = Sunday, 1 = Monday ... 6 = Saturday
    const dateStr = formatInTimeZone(candidateDate, TZ, 'yyyy-MM-dd');

    // Never create a session for a date in the past
    if (dateStr < todayStr) continue;

    for (const sabha of sabhas) {
      if (sabha.default_weekday === candidateWeekday) {
        totalCandidates++;
        rowsToInsert.push({
          sabha_id: sabha.id,
          session_date: dateStr,
          start_time: sabha.default_start_time,
          end_time: sabha.default_end_time,
          sabha_type: sabha.sabha_type,
          status: 'scheduled',
        });
      }
    }
  }

  if (rowsToInsert.length === 0) {
    return { created: 0, skipped: 0 };
  }

  // 3. Upsert with ignoreDuplicates: true to prevent overwriting existing sessions
  const { data: insertedRows, error } = await adminClient
    .from('sabha_sessions')
    .upsert(rowsToInsert, {
      onConflict: 'sabha_id,session_date',
      ignoreDuplicates: true,
    })
    .select('id');

  if (error) {
    console.error('Failed to generate sessions:', error);
    throw new Error(error.message);
  }

  const createdCount = insertedRows ? insertedRows.length : 0;
  const skippedCount = totalCandidates - createdCount;

  return {
    created: createdCount,
    skipped: Math.max(0, skippedCount),
  };
}

/**
 * Sessions whose end_time has passed and are still 'scheduled' -> 'held'.
 * Never mark a cancelled session as held.
 */
export async function markHeldSessions(): Promise<{ updated: number }> {
  const now = new Date();
  const currentDateStr = formatInTimeZone(now, TZ, 'yyyy-MM-dd');
  const currentTimeStr = formatInTimeZone(now, TZ, 'HH:mm:ss');

  // Query past scheduled sessions
  const { data: pastScheduled } = await adminClient
    .from('sabha_sessions')
    .select('id, session_date, end_time')
    .eq('status', 'scheduled')
    .or(`session_date.lt.${currentDateStr},and(session_date.eq.${currentDateStr},end_time.lte.${currentTimeStr})`);

  if (!pastScheduled || pastScheduled.length === 0) {
    return { updated: 0 };
  }

  const targetIds = pastScheduled.map((s) => s.id);

  const { data: updatedRows, error } = await adminClient
    .from('sabha_sessions')
    .update({ status: 'held' })
    .in('id', targetIds)
    .eq('status', 'scheduled') // Safety guard: never mark cancelled sessions
    .select('id');

  if (error) {
    console.error('Failed to mark held sessions:', error);
    throw new Error(error.message);
  }

  return {
    updated: updatedRows ? updatedRows.length : 0,
  };
}
