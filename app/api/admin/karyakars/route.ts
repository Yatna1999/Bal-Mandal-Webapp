import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { usernameToEmail } from '@/lib/auth';
import { cleanMobile } from '@/lib/format';
import type { RoleT } from '@/lib/database.types';

function generateTempPassword(length = 10): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export async function POST(request: Request) {
  try {
    // 1. Validate caller authentication and role
    const supabase = await createClient();
    const {
      data: { user: caller },
    } = await supabase.auth.getUser();

    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerKaryakar } = await supabase
      .from('karyakars')
      .select('role, vistar_id')
      .eq('id', caller.id)
      .single();

    if (!callerKaryakar || callerKaryakar.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      full_name_gu,
      full_name_en,
      mobile,
      username,
      role,
      sabha_ids,
    }: {
      full_name_gu: string;
      full_name_en: string;
      mobile: string;
      username: string;
      role: RoleT;
      sabha_ids: string[];
    } = body;

    const cleanedMobile = cleanMobile(mobile);
    if (!cleanedMobile || cleanedMobile.length !== 10) {
      return NextResponse.json({ error: 'Invalid mobile' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!cleanUsername) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }

    const email = usernameToEmail(cleanUsername);
    const tempPassword = generateTempPassword(10);

    // Step 1: Create Auth user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError || !authUser.user) {
      return NextResponse.json({ error: authError?.message || 'User creation failed' }, { status: 400 });
    }

    const newUserId = authUser.user.id;

    // Step 2: Insert into karyakars table
    const { error: kError } = await adminClient.from('karyakars').insert({
      id: newUserId,
      vistar_id: callerKaryakar.vistar_id,
      full_name_gu,
      full_name_en,
      mobile: cleanedMobile,
      role,
      is_active: true,
      must_change_password: true,
    });

    if (kError) {
      // Rollback Auth user creation
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: kError.message }, { status: 400 });
    }

    // Step 3: Insert into karyakar_sabhas
    if (sabha_ids && sabha_ids.length > 0) {
      const sabhaRows = sabha_ids.map((sabha_id) => ({
        karyakar_id: newUserId,
        sabha_id,
      }));

      const { error: ksError } = await adminClient.from('karyakar_sabhas').insert(sabhaRows);

      if (ksError) {
        // Rollback karyakars & Auth user
        await adminClient.from('karyakars').delete().eq('id', newUserId);
        await adminClient.auth.admin.deleteUser(newUserId);
        return NextResponse.json({ error: ksError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, tempPassword });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
