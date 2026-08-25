import { adminClient } from '@/lib/supabase/admin';
import { formatDateGu, formatDateEn, toGu } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { Lang, Report, Col } from './types';

function formatNum(val: number, lang: Lang): string {
  return lang === 'gu' ? toGu(val) : String(val);
}

function formatDate(dateStr: string | null | undefined, lang: Lang): string {
  if (!dateStr) return '';
  return lang === 'gu' ? formatDateGu(dateStr) : formatDateEn(dateStr);
}

function formatDateShort(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  if (lang === 'gu') {
    return `${toGu(day)}/${toGu(month)}`;
  }
  return `${day}/${month}`;
}

// ---------------------------------------------------------
// 1. BUILD BALAK REGISTER
// ---------------------------------------------------------
export async function buildBalakRegister({
  sabhaId,
  actorName = 'સિસ્ટમ',
  lang = 'gu',
}: {
  sabhaId?: string;
  actorName?: string;
  lang?: Lang;
}): Promise<Report> {
  let sabhaName = 'બધી સભા';
  let vistarName = 'બધા વિસ્તાર';

  if (sabhaId) {
    const { data: sabhaRow } = await adminClient
      .from('sabhas')
      .select('name_gu, vistar_id, vistars(name_gu)')
      .eq('id', sabhaId)
      .single();
    if (sabhaRow) {
      sabhaName = sabhaRow.name_gu;
      const rawV = sabhaRow.vistars as unknown as { name_gu: string } | null;
      if (rawV?.name_gu) vistarName = rawV.name_gu;
    }
  }

  const { data: rawBalako } = await adminClient
    .from('balako')
    .select(`
      id,
      full_name_gu,
      full_name_en,
      dob,
      father_mobile,
      mother_mobile,
      status,
      standards ( name_gu, name_en ),
      balak_sabhas (
        sabhas ( id, name_gu, vistar_id, vistars ( name_gu ) )
      )
    `)
    .order('full_name_gu', { ascending: true });

  let balakoList = rawBalako || [];
  if (sabhaId) {
    balakoList = balakoList.filter((b) => {
      const bsList = b.balak_sabhas as unknown as Array<{ sabhas: { id: string } | null }>;
      return bsList?.some((bs) => bs.sabhas?.id === sabhaId);
    });
  }

  const columns: Col[] = [
    { key: 'sr', header: lang === 'gu' ? 'ક્રમ' : 'Sr.', width: 6 },
    { key: 'name_gu', header: 'બાળકનું નામ (ગુજરાતી)', width: 24 },
    { key: 'name_en', header: 'Child Name (English)', width: 24 },
    { key: 'standard', header: lang === 'gu' ? 'ધોરણ' : 'Standard', width: 12 },
    { key: 'dob', header: lang === 'gu' ? 'જન્મતારીખ' : 'DOB', width: 14 },
    { key: 'father_mobile', header: lang === 'gu' ? 'પિતાનો મોબાઈલ' : 'Father Mobile', width: 14 },
    { key: 'mother_mobile', header: lang === 'gu' ? 'માતાનો મોબાઈલ' : 'Mother Mobile', width: 14 },
    { key: 'sabha', header: lang === 'gu' ? 'સભા' : 'Sabha', width: 20 },
    { key: 'status', header: lang === 'gu' ? 'સ્થિતિ' : 'Status', width: 12 },
  ];

  const rows = balakoList.map((b, idx) => {
    const stdRaw = b.standards as unknown as { name_gu: string; name_en: string } | null;
    const stdStr = lang === 'gu' ? stdRaw?.name_gu || '' : stdRaw?.name_en || '';
    const bsList = b.balak_sabhas as unknown as Array<{ sabhas: { name_gu: string } | null }>;
    const sabhaNames = (bsList || []).map((bs) => bs.sabhas?.name_gu).filter(Boolean).join(', ');

    return {
      sr: formatNum(idx + 1, lang),
      name_gu: b.full_name_gu,
      name_en: b.full_name_en,
      standard: stdStr,
      dob: formatDate(b.dob, lang),
      father_mobile: b.father_mobile ? formatNum(Number(b.father_mobile), lang) : '',
      mother_mobile: b.mother_mobile ? formatNum(Number(b.mother_mobile), lang) : '',
      sabha: sabhaNames,
      status: b.status === 'active' ? (lang === 'gu' ? 'સક્રિય' : 'Active') : (lang === 'gu' ? 'આર્કાઇવ' : 'Archived'),
    };
  });

  const nowStr = new Date().toISOString().slice(0, 10);

  return {
    meta: {
      vistar: vistarName,
      sabha: sabhaName,
      period: lang === 'gu' ? 'તમામ બાળકો' : 'All Children',
      by: actorName,
      on: formatDate(nowStr, lang),
      sheetName: 'બાળક નોંધપોથી',
      orientation: 'landscape',
    },
    columns,
    rows,
  };
}

// ---------------------------------------------------------
// 2. BUILD ATTENDANCE SHEET (MATRIX)
// ---------------------------------------------------------
export async function buildAttendanceSheet({
  sabhaId,
  from,
  to,
  actorName = 'સિસ્ટમ',
  lang = 'gu',
}: {
  sabhaId: string;
  from: string;
  to: string;
  actorName?: string;
  lang?: Lang;
}): Promise<Report> {
  const { data: sabhaRow } = await adminClient
    .from('sabhas')
    .select('name_gu, vistar_id, vistars(name_gu)')
    .eq('id', sabhaId)
    .single();

  const sabhaName = sabhaRow?.name_gu || 'સભા';
  const rawV = sabhaRow?.vistars as unknown as { name_gu: string } | null;
  const vistarName = rawV?.name_gu || 'વિસ્તાર';

  // 1. Fetch held/scheduled sessions (EXCLUDING CANCELLED)
  const { data: sessions } = await adminClient
    .from('sabha_sessions')
    .select('id, session_date, status')
    .eq('sabha_id', sabhaId)
    .neq('status', 'cancelled')
    .gte('session_date', from)
    .lte('session_date', to)
    .order('session_date', { ascending: true });

  const validSessions = sessions || [];

  // 2. Fetch balako enrolled in this sabha
  const { data: enrolledBalako } = await adminClient
    .from('balak_sabhas')
    .select(`
      balako!inner(
        id,
        full_name_gu,
        full_name_en,
        status,
        standards(name_gu, name_en)
      )
    `)
    .eq('sabha_id', sabhaId);

  const balako = (enrolledBalako || []).map((e) => e.balako as unknown as {
    id: string;
    full_name_gu: string;
    full_name_en: string;
    status: string;
    standards: { name_gu: string; name_en: string } | null;
  }).sort((a, b) => a.full_name_gu.localeCompare(b.full_name_gu, 'gu'));

  // 3. Fetch attendance records
  const sessionIds = validSessions.map((s) => s.id);
  let attendanceRows: Array<{ session_id: string; balak_id: string; attendance_status: string | null }> = [];
  if (sessionIds.length > 0) {
    const { data: att } = await adminClient
      .from('attendance')
      .select('session_id, balak_id, attendance_status')
      .in('session_id', sessionIds);
    attendanceRows = (att || []) as unknown as typeof attendanceRows;
  }

  // Build attendance lookup map: `balakId_sessionId` -> status
  const attMap = new Map<string, string | null>();
  attendanceRows.forEach((r) => {
    attMap.set(`${r.balak_id}_${r.session_id}`, r.attendance_status);
  });

  // Build matrix columns
  const columns: Col[] = [
    { key: 'sr', header: lang === 'gu' ? 'ક્રમ' : 'Sr.', width: 6 },
    { key: 'name_gu', header: 'નામ (ગુજરાતી)', width: 22 },
    { key: 'name_en', header: 'Name (English)', width: 22 },
    { key: 'standard', header: lang === 'gu' ? 'ધોરણ' : 'Standard', width: 10 },
  ];

  validSessions.forEach((s) => {
    columns.push({
      key: `s_${s.id}`,
      header: formatDateShort(s.session_date, lang),
      width: 10,
    });
  });

  columns.push(
    { key: 'total_present', header: lang === 'gu' ? 'કુલ હાજર' : 'Total Present', width: 12 },
    { key: 'total_sessions', header: lang === 'gu' ? 'કુલ સભા' : 'Total Sessions', width: 12 },
    { key: 'percentage', header: lang === 'gu' ? 'ટકાવારી (%)' : 'Percentage (%)', width: 14 }
  );

  // Per-session counters for footer rows
  const sessionPresentCount: Record<string, number> = {};
  const sessionTotalCount: Record<string, number> = {};
  validSessions.forEach((s) => {
    sessionPresentCount[s.id] = 0;
    sessionTotalCount[s.id] = 0;
  });

  const rows = balako.map((b, idx) => {
    const stdStr = lang === 'gu' ? b.standards?.name_gu || '' : b.standards?.name_en || '';
    let presentCount = 0;
    let totalEligible = 0;

    const rowObj: Record<string, string | number> = {
      sr: formatNum(idx + 1, lang),
      name_gu: b.full_name_gu,
      name_en: b.full_name_en,
      standard: stdStr,
    };

    validSessions.forEach((s) => {
      const status = attMap.get(`${b.id}_${s.id}`);
      if (status === 'present') {
        rowObj[`s_${s.id}`] = 'હ';
        presentCount++;
        totalEligible++;
        sessionPresentCount[s.id]++;
        sessionTotalCount[s.id]++;
      } else if (status === 'absent') {
        rowObj[`s_${s.id}`] = 'ગે';
        totalEligible++;
        sessionTotalCount[s.id]++;
      } else {
        rowObj[`s_${s.id}`] = ''; // blank when not enrolled or unrecorded
      }
    });

    const pct = totalEligible > 0 ? Math.round((presentCount / totalEligible) * 100) : 0;

    rowObj.total_present = formatNum(presentCount, lang);
    rowObj.total_sessions = formatNum(totalEligible, lang);
    rowObj.percentage = `${formatNum(pct, lang)}%`;

    return rowObj;
  });

  // Footer Rows
  const footerRow1: Record<string, string | number> = {
    sr: '',
    name_gu: 'કુલ હાજર',
    name_en: 'Total Present',
    standard: '',
  };

  const footerRow2: Record<string, string | number> = {
    sr: '',
    name_gu: 'હાજરી ટકાવારી',
    name_en: 'Attendance Rate',
    standard: '',
  };

  const footerRow3: Record<string, string | number> = {
    sr: '',
    name_gu: 'સંપર્ક કરનાર',
    name_en: 'Contact Person',
    standard: '',
  };

  validSessions.forEach((s) => {
    const pCount = sessionPresentCount[s.id];
    const tCount = sessionTotalCount[s.id];
    const rate = tCount > 0 ? Math.round((pCount / tCount) * 100) : 0;

    footerRow1[`s_${s.id}`] = formatNum(pCount, lang);
    footerRow2[`s_${s.id}`] = `${formatNum(rate, lang)}%`;
    footerRow3[`s_${s.id}`] = '-';
  });

  footerRow1.total_present = '';
  footerRow1.total_sessions = '';
  footerRow1.percentage = '';

  footerRow2.total_present = '';
  footerRow2.total_sessions = '';
  footerRow2.percentage = '';

  footerRow3.total_present = '';
  footerRow3.total_sessions = '';
  footerRow3.percentage = '';

  return {
    meta: {
      vistar: vistarName,
      sabha: sabhaName,
      period: `${formatDate(from, lang)} થી ${formatDate(to, lang)}`,
      by: actorName,
      on: formatDate(new Date().toISOString().slice(0, 10), lang),
      sheetName: 'હાજરી પત્રક',
      orientation: 'landscape',
    },
    columns,
    rows,
    footerRows: [footerRow1, footerRow2, footerRow3],
  };
}

// ---------------------------------------------------------
// 3. BUILD AHNIK BY SABHA
// ---------------------------------------------------------
export async function buildAhnikBySabha({
  sabhaId,
  weekStart,
  actorName = 'સિસ્ટમ',
  lang = 'gu',
}: {
  sabhaId: string;
  weekStart: string;
  actorName?: string;
  lang?: Lang;
}): Promise<Report> {
  const { data: sabhaRow } = await adminClient
    .from('sabhas')
    .select('name_gu, vistar_id, vistars(name_gu)')
    .eq('id', sabhaId)
    .single();

  const sabhaName = sabhaRow?.name_gu || 'સભા';
  const rawV = sabhaRow?.vistars as unknown as { name_gu: string } | null;
  const vistarName = rawV?.name_gu || 'વિસ્તાર';

  // 1. Fetch ahnik items sorted by sort_order
  const { data: items } = await adminClient
    .from('ahnik_items')
    .select('id, label_gu, label_en, sort_order')
    .order('sort_order', { ascending: true });

  const ahnikItems = items || [];

  // 2. Fetch enrolled active balako
  const { data: enrolledBalako } = await adminClient
    .from('balak_sabhas')
    .select(`
      balako!inner(
        id,
        full_name_gu,
        full_name_en,
        standards(name_gu, name_en)
      )
    `)
    .eq('sabha_id', sabhaId);

  const balako = (enrolledBalako || []).map((e) => e.balako as unknown as {
    id: string;
    full_name_gu: string;
    full_name_en: string;
    standards: { name_gu: string; name_en: string } | null;
  }).sort((a, b) => a.full_name_gu.localeCompare(b.full_name_gu, 'gu'));

  const balakIds = balako.map((b) => b.id);

  // 3. Fetch ahnik_weeks and ahnik_entries for this weekStart
  let weekRecords: Array<{ id: string; balak_id: string; captured_by: string | null; karyakars: { full_name_gu: string } | null }> = [];
  if (balakIds.length > 0) {
    const { data: wRecs } = await adminClient
      .from('ahnik_weeks')
      .select('id, balak_id, captured_by, karyakars!captured_by(full_name_gu)')
      .in('balak_id', balakIds)
      .eq('week_start_date', weekStart);
    weekRecords = (wRecs || []) as unknown as typeof weekRecords;
  }

  const weekIds = weekRecords.map((w) => w.id);
  const weekMap = new Map<string, { id: string; recorder: string }>();
  weekRecords.forEach((w) => {
    const recName = w.karyakars?.full_name_gu || 'કાર્યકર';
    weekMap.set(w.balak_id, { id: w.id, recorder: recName });
  });

  let entryRows: Array<{ ahnik_week_id: string; ahnik_item_id: string; done: boolean }> = [];
  if (weekIds.length > 0) {
    const { data: entries } = await adminClient
      .from('ahnik_entries')
      .select('ahnik_week_id, ahnik_item_id, done')
      .in('ahnik_week_id', weekIds);
    entryRows = (entries || []) as unknown as typeof entryRows;
  }

  const entryMap = new Map<string, boolean>();
  entryRows.forEach((e) => {
    entryMap.set(`${e.ahnik_week_id}_${e.ahnik_item_id}`, e.done);
  });

  const columns: Col[] = [
    { key: 'sr', header: lang === 'gu' ? 'ક્રમ' : 'Sr.', width: 6 },
    { key: 'name_gu', header: 'નામ (ગુજરાતી)', width: 22 },
    { key: 'name_en', header: 'Name (English)', width: 22 },
    { key: 'standard', header: lang === 'gu' ? 'ધોરણ' : 'Standard', width: 10 },
  ];

  ahnikItems.forEach((item) => {
    columns.push({
      key: `item_${item.id}`,
      header: lang === 'gu' ? item.label_gu : item.label_en,
      width: 12,
    });
  });

  columns.push(
    { key: 'total', header: lang === 'gu' ? 'કુલ (૭ માંથી)' : 'Total (/7)', width: 14 },
    { key: 'recorder', header: lang === 'gu' ? 'નોંધનાર' : 'Recorder', width: 16 }
  );

  const rows = balako.map((b, idx) => {
    const stdStr = lang === 'gu' ? b.standards?.name_gu || '' : b.standards?.name_en || '';
    const wInfo = weekMap.get(b.id);

    const rowObj: Record<string, string | number> = {
      sr: formatNum(idx + 1, lang),
      name_gu: b.full_name_gu,
      name_en: b.full_name_en,
      standard: stdStr,
    };

    let completedCount = 0;

    ahnikItems.forEach((item) => {
      if (!wInfo) {
        rowObj[`item_${item.id}`] = ''; // blank when week never recorded
      } else {
        const val = entryMap.get(`${wInfo.id}_${item.id}`);
        if (val === true) {
          rowObj[`item_${item.id}`] = 'હા';
          completedCount++;
        } else {
          rowObj[`item_${item.id}`] = 'ના';
        }
      }
    });

    rowObj.total = wInfo ? formatNum(completedCount, lang) : '';
    rowObj.recorder = wInfo ? wInfo.recorder : '';

    return rowObj;
  });

  return {
    meta: {
      vistar: vistarName,
      sabha: sabhaName,
      period: `અઠવાડિયું ${formatDate(weekStart, lang)}`,
      by: actorName,
      on: formatDate(new Date().toISOString().slice(0, 10), lang),
      sheetName: 'આહ્નિક નોંધ',
      orientation: 'landscape',
    },
    columns,
    rows,
  };
}

// ---------------------------------------------------------
// 4. BUILD AHNIK BY BALAK
// ---------------------------------------------------------
export async function buildAhnikByBalak({
  balakId,
  from,
  to,
  actorName = 'સિસ્ટમ',
  lang = 'gu',
}: {
  balakId: string;
  from: string;
  to: string;
  actorName?: string;
  lang?: Lang;
}): Promise<Report> {
  const { data: balak } = await adminClient
    .from('balako')
    .select('full_name_gu, full_name_en, balak_sabhas(sabhas(name_gu, vistar_id, vistars(name_gu)))')
    .eq('id', balakId)
    .single();

  const balakNameGu = balak?.full_name_gu || '';
  const bsList = balak?.balak_sabhas as unknown as Array<{ sabhas: { name_gu: string; vistars: { name_gu: string } | null } | null }>;
  const sabhaName = bsList?.[0]?.sabhas?.name_gu || 'સભા';
  const vistarName = bsList?.[0]?.sabhas?.vistars?.name_gu || 'વિસ્તાર';

  const { data: items } = await adminClient
    .from('ahnik_items')
    .select('id, label_gu, label_en, sort_order')
    .order('sort_order', { ascending: true });

  const ahnikItems = items || [];

  const { data: weekRecords } = await adminClient
    .from('ahnik_weeks')
    .select('id, week_start_date, captured_by, karyakars!captured_by(full_name_gu)')
    .eq('balak_id', balakId)
    .gte('week_start_date', from)
    .lte('week_start_date', to)
    .order('week_start_date', { ascending: true });

  const weeks = (weekRecords || []) as unknown as Array<{
    id: string;
    week_start_date: string;
    karyakars: { full_name_gu: string } | null;
  }>;

  const weekIds = weeks.map((w) => w.id);
  let entryRows: Array<{ ahnik_week_id: string; ahnik_item_id: string; done: boolean }> = [];
  if (weekIds.length > 0) {
    const { data: entries } = await adminClient
      .from('ahnik_entries')
      .select('ahnik_week_id, ahnik_item_id, done')
      .in('ahnik_week_id', weekIds);
    entryRows = (entries || []) as unknown as typeof entryRows;
  }

  const entryMap = new Map<string, boolean>();
  entryRows.forEach((e) => {
    entryMap.set(`${e.ahnik_week_id}_${e.ahnik_item_id}`, e.done);
  });

  const columns: Col[] = [
    { key: 'sr', header: lang === 'gu' ? 'ક્રમ' : 'Sr.', width: 6 },
    { key: 'week', header: lang === 'gu' ? 'અઠવાડિયું' : 'Week', width: 16 },
  ];

  ahnikItems.forEach((item) => {
    columns.push({
      key: `item_${item.id}`,
      header: lang === 'gu' ? item.label_gu : item.label_en,
      width: 12,
    });
  });

  columns.push(
    { key: 'total', header: lang === 'gu' ? 'કુલ (૭ માંથી)' : 'Total (/7)', width: 14 },
    { key: 'recorder', header: lang === 'gu' ? 'નોંધનાર' : 'Recorder', width: 16 }
  );

  const rows = weeks.map((w, idx) => {
    const rowObj: Record<string, string | number> = {
      sr: formatNum(idx + 1, lang),
      week: formatDate(w.week_start_date, lang),
    };

    let completedCount = 0;
    ahnikItems.forEach((item) => {
      const val = entryMap.get(`${w.id}_${item.id}`);
      if (val === true) {
        rowObj[`item_${item.id}`] = 'હા';
        completedCount++;
      } else {
        rowObj[`item_${item.id}`] = 'ના';
      }
    });

    rowObj.total = formatNum(completedCount, lang);
    rowObj.recorder = w.karyakars?.full_name_gu || 'કાર્યકર';

    return rowObj;
  });

  return {
    meta: {
      vistar: vistarName,
      sabha: sabhaName,
      period: `${balakNameGu} (${formatDate(from, lang)} થી ${formatDate(to, lang)})`,
      by: actorName,
      on: formatDate(new Date().toISOString().slice(0, 10), lang),
      sheetName: 'આહ્નિક અહેવાલ',
      orientation: 'portrait',
    },
    columns,
    rows,
  };
}

// ---------------------------------------------------------
// 5. BUILD NIYAM REGISTER
// ---------------------------------------------------------
export async function buildNiyamRegister({
  sabhaId,
  actorName = 'સિસ્ટમ',
  lang = 'gu',
}: {
  sabhaId?: string;
  actorName?: string;
  lang?: Lang;
}): Promise<Report> {
  let sabhaName = 'બધી સભા';
  let vistarName = 'બધા વિસ્તાર';

  if (sabhaId) {
    const { data: sabhaRow } = await adminClient
      .from('sabhas')
      .select('name_gu, vistar_id, vistars(name_gu)')
      .eq('id', sabhaId)
      .single();
    if (sabhaRow) {
      sabhaName = sabhaRow.name_gu;
      const rawV = sabhaRow.vistars as unknown as { name_gu: string } | null;
      if (rawV?.name_gu) vistarName = rawV.name_gu;
    }
  }

  const { data: niyams } = await adminClient
    .from('niyams')
    .select(`
      id,
      title_gu,
      start_date,
      duration_months,
      end_date,
      status,
      notes_gu,
      balako!inner(
        id,
        full_name_gu,
        full_name_en,
        standards(name_gu, name_en),
        balak_sabhas(sabha_id)
      )
    `)
    .order('start_date', { ascending: false });

  let niyamList = (niyams || []) as unknown as Array<{
    id: string;
    title_gu: string;
    start_date: string;
    duration_months: number;
    end_date: string | null;
    status: string;
    notes_gu: string | null;
    balako: {
      full_name_gu: string;
      full_name_en: string;
      standards: { name_gu: string; name_en: string } | null;
      balak_sabhas: Array<{ sabha_id: string }>;
    };
  }>;

  if (sabhaId) {
    niyamList = niyamList.filter((n) =>
      n.balako.balak_sabhas?.some((bs) => bs.sabha_id === sabhaId)
    );
  }

  const columns: Col[] = [
    { key: 'sr', header: lang === 'gu' ? 'ક્રમ' : 'Sr.', width: 6 },
    { key: 'name_gu', header: 'નામ (ગુજરાતી)', width: 22 },
    { key: 'name_en', header: 'Name (English)', width: 22 },
    { key: 'standard', header: lang === 'gu' ? 'ધોરણ' : 'Standard', width: 10 },
    { key: 'title', header: lang === 'gu' ? 'નિયમનું નામ' : 'Niyam Title', width: 20 },
    { key: 'start_date', header: lang === 'gu' ? 'શરૂઆત તારીખ' : 'Start Date', width: 14 },
    { key: 'duration', header: lang === 'gu' ? 'સમયગાળો' : 'Duration', width: 12 },
    { key: 'end_date', header: lang === 'gu' ? 'પૂરી તારીખ' : 'End Date', width: 14 },
    { key: 'status', header: lang === 'gu' ? 'સ્થિતિ' : 'Status', width: 12 },
    { key: 'notes', header: lang === 'gu' ? 'નોંધ' : 'Notes', width: 20 },
  ];

  const statusLabel = (st: string) => {
    if (st === 'active') return lang === 'gu' ? 'ચાલુ' : 'Active';
    if (st === 'expired') return lang === 'gu' ? 'મુદત પૂરી' : 'Expired';
    if (st === 'completed') return lang === 'gu' ? 'પૂર્ણ' : 'Completed';
    return lang === 'gu' ? 'છૂટી ગયેલ' : 'Lapsed';
  };

  const rows = niyamList.map((n, idx) => {
    const stdStr = lang === 'gu' ? n.balako.standards?.name_gu || '' : n.balako.standards?.name_en || '';
    return {
      sr: formatNum(idx + 1, lang),
      name_gu: n.balako.full_name_gu,
      name_en: n.balako.full_name_en,
      standard: stdStr,
      title: n.title_gu,
      start_date: formatDate(n.start_date, lang),
      duration: `${formatNum(n.duration_months, lang)} ${lang === 'gu' ? 'મહિના' : 'Months'}`,
      end_date: formatDate(n.end_date, lang),
      status: statusLabel(n.status),
      notes: n.notes_gu || '',
    };
  });

  return {
    meta: {
      vistar: vistarName,
      sabha: sabhaName,
      period: lang === 'gu' ? 'તમામ વિશેષ નિયમ' : 'All Special Niyams',
      by: actorName,
      on: formatDate(new Date().toISOString().slice(0, 10), lang),
      sheetName: 'નિયમ નોંધ',
      orientation: 'landscape',
    },
    columns,
    rows,
  };
}

// ---------------------------------------------------------
// 6. BUILD KARYAKAR ACCOUNTABILITY REPORT (VISTAR SCOPE)
// Sort by percentage ASCENDING so whoever needs conversation comes first
// ---------------------------------------------------------
export async function buildKaryakarAccountability({
  from,
  to,
  actorName = 'સિસ્ટમ',
  lang = 'gu',
}: {
  from: string;
  to: string;
  actorName?: string;
  lang?: Lang;
}): Promise<Report> {
  const { data: karyakars } = await adminClient
    .from('karyakars')
    .select(`
      id,
      full_name_gu,
      full_name_en,
      role,
      vistar_id,
      vistars ( name_gu ),
      karyakar_sabhas ( sabhas ( id, name_gu ) )
    `)
    .eq('is_active', true);

  const karyakarList = karyakars || [];
  const vistarName = karyakarList[0]?.vistars?.name_gu || 'વિસ્તાર';

  const columns: Col[] = [
    { key: 'sr', header: lang === 'gu' ? 'ક્રમ' : 'Sr.', width: 6 },
    { key: 'name', header: lang === 'gu' ? 'કાર્યકરનું નામ' : 'Karyakar Name', width: 22 },
    { key: 'role', header: lang === 'gu' ? 'હૌદ્દો' : 'Role', width: 14 },
    { key: 'sabhas', header: lang === 'gu' ? 'સંભાળતી સભાઓ' : 'Assigned Sabhas', width: 22 },
    { key: 'total_tasks', header: lang === 'gu' ? 'કુલ કામ' : 'Total Tasks', width: 12 },
    { key: 'on_time', header: lang === 'gu' ? 'સમયસર પૂરાં' : 'On-Time', width: 12 },
    { key: 'late', header: lang === 'gu' ? 'મોડાં પૂરાં' : 'Late', width: 12 },
    { key: 'pending', header: lang === 'gu' ? 'બાકી' : 'Pending', width: 12 },
    { key: 'percentage', header: lang === 'gu' ? 'ટકાવારી (%)' : 'Percentage (%)', width: 14 },
  ];

  const reportData = [];

  for (const k of karyakarList) {
    const ksList = k.karyakar_sabhas as unknown as Array<{ sabhas: { id: string; name_gu: string } | null }>;
    const sabhaIds = (ksList || []).map((ks) => ks.sabhas?.id).filter(Boolean) as string[];
    const sabhaNames = (ksList || []).map((ks) => ks.sabhas?.name_gu).filter(Boolean).join(', ');

    if (sabhaIds.length === 0) {
      reportData.push({
        name: lang === 'gu' ? k.full_name_gu : k.full_name_en,
        role: k.role,
        sabhas: sabhaNames || '-',
        total_tasks: 0,
        on_time: 0,
        late: 0,
        pending: 0,
        percentageNum: 100, // No tasks assigned
      });
      continue;
    }

    // Fetch tasks for these sabhas within date range (excluding cancelled sessions!)
    const { data: tasks } = await adminClient
      .from('tasks')
      .select(`
        id,
        due_at,
        status,
        completed_at,
        sabha_sessions!inner ( session_date, status )
      `)
      .in('sabha_id', sabhaIds)
      .neq('sabha_sessions.status', 'cancelled')
      .gte('sabha_sessions.session_date', from)
      .lte('sabha_sessions.session_date', to);

    const taskList = tasks || [];
    const totalTasks = taskList.length;

    let onTimeCount = 0;
    let lateCount = 0;
    let pendingCount = 0;

    taskList.forEach((t) => {
      if (t.status === 'done') {
        if (t.completed_at && t.completed_at <= t.due_at) {
          onTimeCount++;
        } else {
          lateCount++;
        }
      } else if (t.status === 'open') {
        pendingCount++;
      }
    });

    const completedCount = onTimeCount + lateCount;
    const percentageNum = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 100;

    reportData.push({
      name: lang === 'gu' ? k.full_name_gu : k.full_name_en,
      role: t(`role.${k.role}` as Parameters<typeof t>[0]) || k.role,
      sabhas: sabhaNames,
      total_tasks: totalTasks,
      on_time: onTimeCount,
      late: lateCount,
      pending: pendingCount,
      percentageNum,
    });
  }

  // SORT BY percentageNum ASCENDING (lowest score first)
  reportData.sort((a, b) => a.percentageNum - b.percentageNum);

  const rows = reportData.map((d, idx) => ({
    sr: formatNum(idx + 1, lang),
    name: d.name,
    role: d.role,
    sabhas: d.sabhas,
    total_tasks: formatNum(d.total_tasks, lang),
    on_time: formatNum(d.on_time, lang),
    late: formatNum(d.late, lang),
    pending: formatNum(d.pending, lang),
    percentage: `${formatNum(d.percentageNum, lang)}%`,
  }));

  return {
    meta: {
      vistar: vistarName,
      sabha: 'તમામ સભાઓ',
      period: `${formatDate(from, lang)} થી ${formatDate(to, lang)}`,
      by: actorName,
      on: formatDate(new Date().toISOString().slice(0, 10), lang),
      sheetName: 'કાર્યકર જવાબદારી',
      orientation: 'landscape',
    },
    columns,
    rows,
  };
}
