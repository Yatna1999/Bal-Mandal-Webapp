import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { cleanMobile } from '@/lib/format';
import type { RoleT, Database } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

function generateTempPassword(length = 10): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user: caller },
    } = await supabase.auth.getUser();

    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerKaryakar } = await supabase
      .from('karyakars')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (!callerKaryakar || callerKaryakar.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'reset_password') {
      const tempPassword = generateTempPassword(10);
      const { error: authErr } = await adminClient.auth.admin.updateUserById(id, {
        password: tempPassword,
      });

      if (authErr) {
        return NextResponse.json({ error: authErr.message }, { status: 400 });
      }

      await adminClient
        .from('karyakars')
        .update({ must_change_password: true })
        .eq('id', id);

      return NextResponse.json({ success: true, tempPassword });
    }

    if (action === 'toggle_active') {
      const { is_active } = body;
      const { error: kErr } = await adminClient
        .from('karyakars')
        .update({ is_active })
        .eq('id', id);

      if (kErr) {
        return NextResponse.json({ error: kErr.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    // Update details
    const {
      full_name_gu,
      full_name_en,
      mobile,
      role,
      sabha_ids,
    }: {
      full_name_gu?: string;
      full_name_en?: string;
      mobile?: string;
      role?: RoleT;
      sabha_ids?: string[];
    } = body;

    const updates: Database['public']['Tables']['karyakars']['Update'] = {};
    if (full_name_gu) updates.full_name_gu = full_name_gu;
    if (full_name_en) updates.full_name_en = full_name_en;
    if (mobile) updates.mobile = cleanMobile(mobile);
    if (role) updates.role = role;

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await adminClient
        .from('karyakars')
        .update(updates)
        .eq('id', id);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }
    }

    if (sabha_ids !== undefined) {
      await adminClient.from('karyakar_sabhas').delete().eq('karyakar_id', id);

      if (sabha_ids.length > 0) {
        const rows = sabha_ids.map((sabha_id) => ({
          karyakar_id: id,
          sabha_id,
        }));
        await adminClient.from('karyakar_sabhas').insert(rows);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
