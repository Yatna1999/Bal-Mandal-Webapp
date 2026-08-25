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

async function seedDemoData() {
  console.log('🌱 Starting Demo Data Seeding...\n');

  // 1. Get Paldi Vistar
  const { data: vistar } = await adminClient
    .from('vistars')
    .select('id')
    .eq('name_en', 'Paldi')
    .single();

  if (!vistar) {
    console.error('Failed to find Paldi vistar');
    process.exit(1);
  }

  // 2. Fetch Paldi Sabhas
  const { data: sabhas } = await adminClient
    .from('sabhas')
    .select('id, name_gu')
    .eq('vistar_id', vistar.id)
    .eq('is_active', true);

  if (!sabhas || sabhas.length === 0) {
    console.error('No active sabhas found for Paldi vistar');
    process.exit(1);
  }

  // 3. Seed Demo Karyakars
  const demoKaryakars = [
    {
      username: 'demo_nirikshak',
      role: 'nirikshak' as const,
      name_gu: 'ડેમો નિરીક્ષક ભાઈ',
      name_en: 'Demo Nirikshak',
      mobile: '9900011101',
    },
    {
      username: 'demo_agresar',
      role: 'agresar' as const,
      name_gu: 'ડેમો અગ્રેસર ભાઈ',
      name_en: 'Demo Agresar',
      mobile: '9900011102',
    },
    {
      username: 'demo_sanchalak',
      role: 'sanchalak' as any,
      name_gu: 'ડેમો સંચાલક ભાઈ',
      name_en: 'Demo Sanchalak',
      mobile: '9900011103',
    },
    {
      username: 'demo_sahsanchalak',
      role: 'sah_sanchalak' as any,
      name_gu: 'ડેમો સહ-સંચાલક ભાઈ',
      name_en: 'Demo Sah-Sanchalak',
      mobile: '9900011104',
    },
  ];

  const defaultPassword = 'Password123!';
  const seededKaryakarIds: string[] = [];

  for (const k of demoKaryakars) {
    const email = usernameToEmail(k.username);

    const { data: userList } = await adminClient.auth.admin.listUsers();
    let user = userList?.users?.find((u) => u.email === email);

    if (!user) {
      const { data: createdUser, error: cErr } = await adminClient.auth.admin.createUser({
        email,
        password: defaultPassword,
        email_confirm: true,
      });
      if (cErr || !createdUser.user) {
        console.error(`Failed to create auth user ${k.username}:`, cErr);
        continue;
      }
      user = createdUser.user;
      console.log(`✓ Created auth user: ${k.username}`);
    } else {
      await adminClient.auth.admin.updateUserById(user.id, { password: defaultPassword });
      console.log(`✓ Updated auth user password: ${k.username}`);
    }

    // Upsert Karyakar row
    const { error: kErr } = await adminClient.from('karyakars').upsert({
      id: user.id,
      vistar_id: vistar.id,
      full_name_gu: k.name_gu,
      full_name_en: k.name_en,
      mobile: k.mobile,
      role: k.role,
      is_active: true,
      must_change_password: false,
    });

    if (kErr) {
      console.error(`Failed to upsert karyakar ${k.username}:`, kErr);
    } else {
      seededKaryakarIds.push(user.id);

      // Assign to sabhas
      for (const s of sabhas) {
        await adminClient.from('karyakar_sabhas').upsert({
          karyakar_id: user.id,
          sabha_id: s.id,
        });
      }
    }
  }

  // 4. Seed 10 Demo Balako with identifiable prefix [DEMO]
  const demoBalakoData = [
    {
      full_name_gu: 'આરવ પટેલ',
      full_name_en: '[DEMO] Aarav Patel',
      dob: '2015-06-15',
      standard_code: 'std_5',
      medium: 'gujarati' as const,
      school_gu: 'સરસ્વતી વિદ્યાલય, પાલડી',
      school_en: 'Saraswati Vidyalaya, Paldi',
      address_gu: '૧૨, નવરંગપાર્ક સોસાયટી, પાલડી, અમદાવાદ',
      satsang_status: 'satsangi' as const,
      mother_name_gu: 'ભાવનાબેન પટેલ',
      mother_mobile: '9898012341',
      father_name_gu: 'મહેશભાઈ પટેલ',
      father_mobile: '9898012342',
    },
    {
      full_name_gu: 'વિવિધ શાહ',
      full_name_en: '[DEMO] Vivaan Shah',
      dob: '2016-03-20',
      standard_code: 'std_4',
      medium: 'english' as const,
      school_gu: 'સેન્ટ ઝેવિયર્સ સ્કૂલ, પાલડી',
      school_en: 'St. Xavier School, Paldi',
      address_gu: '૪૫, શાંતિનિકેતન સોસાયટી, પાલડી',
      satsang_status: 'satsangi' as const,
      mother_name_gu: 'રેખાબેન શાહ',
      mother_mobile: '9898023451',
      father_name_gu: 'રાજેશભાઈ શાહ',
      father_mobile: '9898023452',
    },
    {
      full_name_gu: 'દિયા શર્મા',
      full_name_en: '[DEMO] Diya Sharma',
      dob: '2014-11-10',
      standard_code: 'std_6',
      medium: 'gujarati' as const,
      school_gu: 'અંકુર વિદ્યામંદિર, પાલડી',
      school_en: 'Ankur Vidyamandir, Paldi',
      address_gu: '૭૮, સરદાર એપાર્ટમેન્ટ, પાલડી',
      satsang_status: 'gunbhavi' as const,
      mother_name_gu: 'અનિતાબેન શર્મા',
      mother_mobile: '9898034561',
      father_name_gu: 'સુરેશભાઈ શર્મા',
      father_mobile: '9898034562',
    },
    {
      full_name_gu: 'કબીર મહેતા',
      full_name_en: '[DEMO] Kabir Mehta',
      dob: '2017-01-05',
      standard_code: 'std_3',
      medium: 'english' as const,
      school_gu: 'દીવાન બલ્લુભાઈ સ્કૂલ',
      school_en: 'Diwan Ballubhai School',
      address_gu: '૫, લક્ષ્મીકૃપા ફ્લેટ, પાલડી',
      satsang_status: 'satsangi' as const,
      mother_name_gu: 'પ્રિયાબેન મહેતા',
      mother_mobile: '9898045671',
      father_name_gu: 'કેતનભાઈ મહેતા',
      father_mobile: '9898045672',
    },
    {
      full_name_gu: 'અનન્યા જોશી',
      full_name_en: '[DEMO] Ananya Joshi',
      dob: '2015-08-25',
      standard_code: 'std_5',
      medium: 'gujarati' as const,
      school_gu: 'સરસ્વતી વિદ્યાપીઠ',
      school_en: 'Saraswati Vidyapeeth',
      address_gu: '૨૩, ગોપાલનગર, પાલડી',
      satsang_status: 'binsatsangi' as const,
      mother_name_gu: 'સુનીતાબેન જોશી',
      mother_mobile: '9898056781',
      father_name_gu: 'ધર્મેશભાઈ જોશી',
      father_mobile: '9898056782',
    },
    {
      full_name_gu: 'દેવ દવે',
      full_name_en: '[DEMO] Dev Dave',
      dob: '2014-04-12',
      standard_code: 'std_7',
      medium: 'english' as const,
      school_gu: 'પ્રકાશ હાઇસ્કૂલ',
      school_en: 'Prakash High School',
      address_gu: '૧૪, યોગી કૃપા ફ્લેટ, પાલડી',
      satsang_status: 'satsangi' as const,
      mother_name_gu: 'ગીતાબેન દવે',
      mother_mobile: '9898067891',
      father_name_gu: 'પરેશભાઈ દવે',
      father_mobile: '9898067892',
    },
    {
      full_name_gu: 'ઈશાન વોરા',
      full_name_en: '[DEMO] Ishan Vora',
      dob: '2016-09-18',
      standard_code: 'std_4',
      medium: 'gujarati' as const,
      school_gu: 'બાલભારતી વિદ્યાલય',
      school_en: 'Balbharati Vidyalaya',
      address_gu: '૩૬, હરિઓમ રો-હાઉસ, પાલડી',
      satsang_status: 'satsangi' as const,
      mother_name_gu: 'નિશાબેન વોરા',
      mother_mobile: '9898078901',
      father_name_gu: 'જીગ્નેશભાઈ વોરા',
      father_mobile: '9898078902',
    },
    {
      full_name_gu: 'રિયા સોલંકી',
      full_name_en: '[DEMO] Riya Solanki',
      dob: '2015-12-01',
      standard_code: 'std_5',
      medium: 'gujarati' as const,
      school_gu: 'વિદ્યાવિહાર પ્રાથમિક શાળા',
      school_en: 'Vidyavihar Primary School',
      address_gu: '૮૯, શિવશક્તિ સોસાયટી, પાલડી',
      satsang_status: 'gunbhavi' as const,
      mother_name_gu: 'મીનાબેન સોલંકી',
      mother_mobile: '9898089011',
      father_name_gu: 'દિનેશભાઈ સોલંકી',
      father_mobile: '9898089012',
    },
    {
      full_name_gu: 'યશ ત્રિવેદી',
      full_name_en: '[DEMO] Yash Trivedi',
      dob: '2017-05-14',
      standard_code: 'std_3',
      medium: 'english' as const,
      school_gu: 'રોયલ ઇન્ટરનેશનલ સ્કૂલ',
      school_en: 'Royal International School',
      address_gu: '૬૭, આનંદકુંજ સોસાયટી, પાલડી',
      satsang_status: 'satsangi' as const,
      mother_name_gu: 'કલ્પનાબેન ત્રિવેદી',
      mother_mobile: '9898090121',
      father_name_gu: 'હર્ષદભાઈ ત્રિવેદી',
      father_mobile: '9898090122',
    },
    {
      full_name_gu: 'પ્રિયા ભટ્ટ',
      full_name_en: '[DEMO] Priya Bhatt',
      dob: '2014-07-22',
      standard_code: 'std_7',
      medium: 'gujarati' as const,
      school_gu: 'નવજીવન વિદ્યામંદિર',
      school_en: 'Navjivan Vidyamandir',
      address_gu: '૧૧, અક્ષર ટાવર, પાલડી',
      satsang_status: 'satsangi' as const,
      mother_name_gu: 'જાગૃતિબેન ભટ્ટ',
      mother_mobile: '9898001231',
      father_name_gu: 'સંજયભાઈ ભટ્ટ',
      father_mobile: '9898001232',
    },
  ];

  let seededBalakCount = 0;

  for (let i = 0; i < demoBalakoData.length; i++) {
    const b = demoBalakoData[i];
    const targetSabha = sabhas[i % sabhas.length];

    // Check if demo balak already exists
    const { data: existing } = await adminClient
      .from('balako')
      .select('id')
      .eq('vistar_id', vistar.id)
      .eq('full_name_en', b.full_name_en)
      .maybeSingle();

    let balakId = existing?.id;

    if (!balakId) {
      const { data: newBalak, error: bErr } = await adminClient
        .from('balako')
        .insert({
          vistar_id: vistar.id,
          full_name_gu: b.full_name_gu,
          full_name_en: b.full_name_en,
          dob: b.dob,
          standard_code: b.standard_code,
          medium: b.medium,
          school_gu: b.school_gu,
          school_en: b.school_en,
          address_gu: b.address_gu,
          satsang_status: b.satsang_status,
          mother_name_gu: b.mother_name_gu,
          mother_mobile: b.mother_mobile,
          father_name_gu: b.father_name_gu,
          father_mobile: b.father_mobile,
          status: 'active',
        })
        .select('id')
        .single();

      if (bErr || !newBalak) {
        console.error(`Failed to insert balak ${b.full_name_en}:`, bErr);
        continue;
      }
      balakId = newBalak.id;
    }

    // Link to primary sabha
    await adminClient.from('balak_sabhas').upsert({
      balak_id: balakId,
      sabha_id: targetSabha.id,
      is_primary: true,
    });

    seededBalakCount++;
  }

  console.log(`✓ Seeded ${seededBalakCount} demo balako across active sabhas`);

  // 5. Seed Attendance Rows for demo balako across upcoming sessions
  const { seedUpcomingAttendance } = await import('../lib/sessions');
  const seedRes = await seedUpcomingAttendance();
  console.log(`✓ Seeded ${seedRes.created} attendance rows for upcoming sessions\n`);

  console.log('=== DEMO DATA SEEDING COMPLETE ===');
  console.log('Demo Accounts Created:');
  demoKaryakars.forEach((k) => {
    console.log(` - Username: ${k.username} | Password: ${defaultPassword} | Role: ${k.role}`);
  });
  console.log('Demo Children Tag: [DEMO]');
  console.log('To easily remove all demo data later, run: npm run clean:demo');
}

seedDemoData();
