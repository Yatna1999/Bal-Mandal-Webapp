import { requireKaryakar } from '@/lib/auth.server';
import {
  buildBalakRegister,
  buildAttendanceSheet,
  buildAhnikBySabha,
  buildAhnikByBalak,
  buildNiyamRegister,
  buildKaryakarAccountability,
} from '@/lib/export/reports';
import type { Lang } from '@/lib/export/types';
import { PrintReportClient } from './PrintReportClient';

export default async function PrintReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{
    sabhaId?: string;
    from?: string;
    to?: string;
    weekStart?: string;
    balakId?: string;
    lang?: Lang;
  }>;
}) {
  const karyakar = await requireKaryakar();
  const resolvedParams = await params;
  const resolvedQuery = await searchParams;

  const type = resolvedParams.type;
  const sabhaId = resolvedQuery.sabhaId;
  const from = resolvedQuery.from || new Date().toISOString().slice(0, 10);
  const to = resolvedQuery.to || new Date().toISOString().slice(0, 10);
  const weekStart = resolvedQuery.weekStart || from;
  const balakId = resolvedQuery.balakId;
  const lang = resolvedQuery.lang || 'gu';
  const actorName = karyakar.full_name_gu;

  let report;

  if (type === 'balakRegister') {
    report = await buildBalakRegister({ sabhaId, actorName, lang });
  } else if (type === 'attendance') {
    report = await buildAttendanceSheet({
      sabhaId: sabhaId || '',
      from,
      to,
      actorName,
      lang,
    });
  } else if (type === 'ahnik') {
    report = await buildAhnikBySabha({
      sabhaId: sabhaId || '',
      weekStart,
      actorName,
      lang,
    });
  } else if (type === 'ahnikBalak') {
    report = await buildAhnikByBalak({
      balakId: balakId || '',
      from,
      to,
      actorName,
      lang,
    });
  } else if (type === 'niyam') {
    report = await buildNiyamRegister({ sabhaId, actorName, lang });
  } else if (type === 'karyakar') {
    report = await buildKaryakarAccountability({
      from,
      to,
      actorName,
      lang,
    });
  } else {
    report = await buildBalakRegister({ sabhaId, actorName, lang });
  }

  return <PrintReportClient report={report} />;
}
