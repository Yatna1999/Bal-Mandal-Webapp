import { requireKaryakar } from '@/lib/auth.server';
import { isVistarScope } from '@/lib/auth';
import Forbidden from '@/components/ui/Forbidden';
import { createClient } from '@/lib/supabase/server';
import { AuditLogClient } from './AuditLogClient';
import type { AuditLogRow } from './AuditLogClient';

export default async function AuditLogPage() {
  const karyakar = await requireKaryakar();

  // Role Guard: super_admin, agresar, nirikshak
  if (!isVistarScope(karyakar.role)) {
    return <Forbidden />;
  }

  const supabase = await createClient();

  // Fetch recent audit_log entries
  const { data: rawLogs, count } = await supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(200);

  const logs = rawLogs || [];

  // Pre-fetch reference data for record_id resolution
  const balakIds = logs.filter((l) => l.table_name === 'balako').map((l) => l.record_id);
  const karyakarIds = logs.filter((l) => l.table_name === 'karyakars').map((l) => l.record_id);
  const sabhaIds = logs.filter((l) => l.table_name === 'sabhas').map((l) => l.record_id);

  const balakMap = new Map<string, string>();
  if (balakIds.length > 0) {
    const { data: bData } = await supabase.from('balako').select('id, full_name_gu').in('id', balakIds);
    (bData || []).forEach((b) => balakMap.set(b.id, b.full_name_gu));
  }

  const karyakarMap = new Map<string, string>();
  if (karyakarIds.length > 0) {
    const { data: kData } = await supabase.from('karyakars').select('id, full_name_gu').in('id', karyakarIds);
    (kData || []).forEach((k) => karyakarMap.set(k.id, k.full_name_gu));
  }

  const sabhaMap = new Map<string, string>();
  if (sabhaIds.length > 0) {
    const { data: sData } = await supabase.from('sabhas').select('id, name_gu').in('id', sabhaIds);
    (sData || []).forEach((s) => sabhaMap.set(s.id, s.name_gu));
  }

  const formattedLogs: AuditLogRow[] = logs.map((log) => {
    let resolvedName = '';

    if (log.table_name === 'balako') {
      resolvedName = balakMap.get(log.record_id) || 'બાળક પ્રોફાઇલ';
    } else if (log.table_name === 'karyakars') {
      resolvedName = karyakarMap.get(log.record_id) || 'કાર્યકર પ્રોફાઇલ';
    } else if (log.table_name === 'sabhas') {
      resolvedName = sabhaMap.get(log.record_id) || 'સભા વિગત';
    } else if (log.table_name === 'attendance') {
      resolvedName = 'હાજરી પત્રક';
    } else if (log.table_name === 'sabha_sessions') {
      resolvedName = 'સભા આયોજન';
    } else if (log.table_name === 'niyams') {
      resolvedName = 'વિશેષ નિયમ';
    }

    return {
      id: log.id,
      table_name: log.table_name,
      record_id: log.record_id,
      action: log.action,
      changed_fields: log.changed_fields,
      actor_id: log.actor_id,
      actor_name_snapshot: log.actor_name_snapshot,
      created_at: log.created_at,
      resolved_record_name: resolvedName,
    };
  });

  return (
    <AuditLogClient
      initialLogs={formattedLogs}
      totalCount={count || formattedLogs.length}
      pageSize={50}
    />
  );
}
