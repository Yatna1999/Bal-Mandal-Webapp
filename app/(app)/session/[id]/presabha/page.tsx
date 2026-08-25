import { notFound } from 'next/navigation';
import { requireKaryakar } from '@/lib/auth.server';
import { createClient } from '@/lib/supabase/server';
import { seedAttendanceRows } from '@/lib/sessions';
import {
  PresabhaClient,
  type PresabhaBalakRow,
  type SabhaKaryakar,
} from './PresabhaClient';

export default async function PresabhaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = await params;
  const karyakar = await requireKaryakar();
  const supabase = await createClient();

  // 1. Fetch session info
  const { data: session } = await supabase
    .from('sabha_sessions')
    .select(`
      id,
      sabha_id,
      session_date,
      sabhas (
        name_gu
      )
    `)
    .eq('id', sessionId)
    .single();

  if (!session) {
    notFound();
  }

  // 2. Ensure attendance rows are seeded for this session
  await seedAttendanceRows(sessionId);

  // 3. Fetch attendance rows with balako details
  const { data: attData } = await supabase
    .from('attendance')
    .select(`
      id,
      balak_id,
      presabha_status,
      presabha_contacted,
      presabha_by,
      balako (
        full_name_gu,
        photo_path,
        mother_mobile,
        father_mobile,
        status
      )
    `)
    .eq('session_id', sessionId);

  const rawAtt = attData || [];

  // Filter out archived children if any exist in old attendance rows
  const activeAtt = rawAtt.filter((a) => {
    const rawBalak = a.balako as unknown as { status: string } | null;
    return rawBalak?.status === 'active';
  });

  const rows: PresabhaBalakRow[] = activeAtt.map((a) => {
    const rawBalak = a.balako as unknown as {
      full_name_gu: string;
      photo_path: string | null;
      mother_mobile: string;
      father_mobile: string;
    } | null;

    return {
      attendance_id: a.id,
      balak_id: a.balak_id,
      full_name_gu: rawBalak?.full_name_gu || 'બાળક',
      photo_path: rawBalak?.photo_path || null,
      mother_mobile: rawBalak?.mother_mobile || '',
      father_mobile: rawBalak?.father_mobile || '',
      presabha_status: a.presabha_status,
      presabha_contacted: a.presabha_contacted,
      presabha_by: a.presabha_by,
    };
  });

  // Sort rows alphabetically by full_name_gu
  rows.sort((a, b) => a.full_name_gu.localeCompare(b.full_name_gu, 'gu'));

  // 4. Fetch assigned karyakars for this sabha
  const { data: kSabhas } = await supabase
    .from('karyakar_sabhas')
    .select(`
      karyakar_id,
      karyakars (
        id,
        full_name_gu
      )
    `)
    .eq('sabha_id', session.sabha_id);

  const sabhaKaryakars: SabhaKaryakar[] = (kSabhas || []).map((ks) => {
    const rawK = ks.karyakars as unknown as { id: string; full_name_gu: string } | null;
    return {
      id: rawK?.id || ks.karyakar_id,
      full_name_gu: rawK?.full_name_gu || 'કાર્યકર',
    };
  });

  // 5. Fetch existing session_followup_karyakars
  const { data: existingFollowup } = await supabase
    .from('session_followup_karyakars')
    .select('karyakar_id')
    .eq('session_id', sessionId);

  const existingFollowupIds = new Set(
    (existingFollowup || []).map((f) => f.karyakar_id)
  );

  // Pre-select any karyakar who has a presabha_by stamp on at least one row in this session
  rows.forEach((r) => {
    if (r.presabha_by) {
      existingFollowupIds.add(r.presabha_by);
    }
  });

  const initialFollowupKaryakarIds = Array.from(existingFollowupIds);

  const rawSabha = session.sabhas as unknown as { name_gu: string } | null;

  return (
    <PresabhaClient
      sessionId={session.id}
      sabhaNameGu={rawSabha?.name_gu || 'સભા'}
      rows={rows}
      sabhaKaryakars={sabhaKaryakars}
      initialFollowupKaryakarIds={initialFollowupKaryakarIds}
    />
  );
}
