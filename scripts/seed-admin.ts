import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';
import { usernameToEmail } from '../lib/auth';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  console.error('Missing Supabase keys in .env.local');
  process.exit(1);
}

const adminClient = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function seedAdmin() {
  console.log('Seeding super admin account...');

  const { data: vistar, error: vErr } = await adminClient
    .from('vistars')
    .select('id')
    .eq('name_en', 'Paldi')
    .single();

  if (vErr || !vistar) {
    console.error('Failed to find Paldi vistar:', vErr);
    process.exit(1);
  }

  const username = 'admin';
  const email = usernameToEmail(username);
  const password = 'Password123!';

  const { data: userList } = await adminClient.auth.admin.listUsers();
  let user = userList?.users?.find((u) => u.email === email);

  if (!user) {
    const { data: createdUser, error: cErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (cErr || !createdUser.user) {
      console.error('Failed to create admin auth user:', cErr);
      process.exit(1);
    }
    user = createdUser.user;
    console.log(`Created auth user: ${email}`);
  } else {
    await adminClient.auth.admin.updateUserById(user.id, { password });
    console.log(`Updated existing auth user password for: ${email}`);
  }

  const { error: kErr } = await adminClient.from('karyakars').upsert({
    id: user.id,
    vistar_id: vistar.id,
    full_name_gu: 'સુપર એડમિન',
    full_name_en: 'Super Admin',
    mobile: '9876543210',
    role: 'super_admin',
    is_active: true,
    must_change_password: false,
  });

  if (kErr) {
    console.error('Failed to upsert karyakar:', kErr);
    process.exit(1);
  }

  console.log('\n=== ADMIN ACCOUNT READY ===');
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
}

seedAdmin();
