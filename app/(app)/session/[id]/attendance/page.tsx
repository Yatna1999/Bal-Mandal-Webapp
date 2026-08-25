import { notFound } from 'next/navigation';
import { requireKaryakar } from '@/lib/auth.server';
import { createClient } from '@/lib/supabase/server';
import { seedAttendanceRows } from '@/lib/sessions';
import {
  AttendanceSheetClient,
  type AttendanceSheetRow,
} from './AttendanceSheetClient';

export default async function AttendanceSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = await params;
  const karyakar = await requireKaryakar();
  const supabase = await createClient();

  // 1. Fetch session details
  const { data: session } = await supabase
    .from('sabha_sessions')
    .select(`
      id,
      sabha_id,
      session_date,
      start_time,
      end_time,
      status,
      sabhas (
        name_gu
      )
    `)
    .eq('id', sessionId)
    .single();

  if (!session) {
    notFound();
  }

  const isCancelled = session.status === 'cancelled';
  const rawSabha = session.sabhas as unknown as { name_gu: string } | null;
  const sabhaNameGu = rawSabha?.name_gu || 'સભા';

  if (isCancelled) {
    return (
      <AttendanceSheetClient
        sessionId={session.id}
        sabhaNameGu={sabhaNameGu}
        sessionDate={session.session_date}
        startTime={session.start_time}
        endTime={session.end_time}
        isCancelled={true}
        initialRows={[]}
      />
    );
  }

  // 2. Ensure attendance rows are seeded for this session
  await seedAttendanceRows(sessionId);

  // 3. Fetch attendance rows joined with balako & standards
  const { data: attData } = await supabase
    .from('attendance')
    .select(`
      id,
      balak_id,
      presabha_status,
      attendance_status,
      updated_by,
      updated_at,
      balako (
        full_name_gu,
        photo_path,
        status,
        standard_code,
        standards (
          label_gu
        )
      )
    `)
    .eq('session_id', sessionId);

  const rawAtt = attData || [];

  // Filter out archived children
  const activeAtt = rawAtt.filter((a) => {
    const rawBalak = a.balako as unknown as { status: string } | null;
    return rawBalak?.status === 'active';
  });

  let latestUpdatedAt: string | null = null;
  let latestUpdatedByKaryakarId: string | null = null;

  activeAtt.forEach((a) => {
    if (a.updated_at) {
      if (!latestUpdatedAt || a.updated_at > latestUpdatedAt) {
        latestUpdatedAt = a.updated_at;
        latestUpdatedByKaryakarId = a.updated_by;
      }
    }
  });

  let lastUpdatedByKaryakarName: string | null = null;
  if (latestUpdatedByKaryakarId) {
    const { data: uKaryakar } = await supabase
      .from('karyakars')
      .select('full_name_gu')
      .eq('id', latestUpdatedByKaryakarId)
      .single();
    if (uKaryakar) {
      lastUpdatedByKaryakarName = uKaryakar.full_name_gu;
    }
  }

  const initialRows: AttendanceSheetRow[] = activeAtt.map((a) => {
    const rawBalak = a.balako as unknown as {
      full_name_gu: string;
      photo_path: string | null;
      standard_code: string;
      standards: { label_gu: string } | null;
    } | null;

    return {
      attendance_id: a.id,
      balak_id: a.balak_id,
      full_name_gu: rawBalak?.full_name_gu || 'બાળક',
      photo_path: rawBalak?.photo_path || null,
      standard_label_gu: rawBalak?.standards?.label_gu || rawBalak?.standard_code || '',
      presabha_status: a.presabha_status,
      attendance_status: a.attendance_status,
    };
  });

  // Sort rows alphabetically by full_name_gu
  initialRows.sort((a, b) => a.full_name_gu.localeCompare(b.full_name_gu, 'gu'));

  return (
    <AttendanceSheetClient
      sessionId={session.id}
      sabhaNameGu={sabhaNameGu}
      sessionDate={session.session_date}
      startTime={session.start_time}
      endTime={session.end_time}
      isCancelled={false}
      initialRows={initialRows}
      lastUpdatedByKaryakarName={lastUpdatedByKaryakarName}
      lastUpdatedAt={latestUpdatedAt}
    />
  );
}
