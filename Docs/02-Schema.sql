-- ============================================================
-- બાળ સભા સંચાલન પ્રણાલી — Supabase schema
-- Run top to bottom in the Supabase SQL editor.
-- Requires: pgcrypto (Supabase enables it by default)
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- ============================================================
-- 1. ENUMS
-- ============================================================

do $$ begin
  create type role_t            as enum ('super_admin','agresar','nirikshak','sanchalak','sah_sanchalak');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sabha_type_t      as enum ('pakki','kachi');
exception when duplicate_object then null; end $$;

do $$ begin
  create type satsang_status_t  as enum ('satsangi','binsatsangi','gunbhavi');
exception when duplicate_object then null; end $$;

do $$ begin
  create type balak_status_t    as enum ('active','archived','transferred_kishore');
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_status_t  as enum ('scheduled','held','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type presabha_t        as enum ('pending','will_come','wont_come','no_response');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attendance_t      as enum ('present','absent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contacted_t       as enum ('mother','father','both','none');
exception when duplicate_object then null; end $$;

do $$ begin
  create type medium_t          as enum ('gujarati','english','hindi','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_type_t       as enum ('prepare_karyakram','presabha_followup','mark_attendance','ahnik_followup','aheval');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status_t     as enum ('open','done','auto_closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type niyam_status_t    as enum ('active','expired','completed','lapsed');
exception when duplicate_object then null; end $$;

-- ============================================================
-- 2. ORG HIERARCHY
-- ============================================================

create table if not exists cities (
  id uuid primary key default gen_random_uuid(),
  name_gu text not null,
  name_en text not null,
  created_at timestamptz not null default now()
);

create table if not exists zones (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities(id) on delete restrict,
  name_gu text not null,
  name_en text not null
);

create table if not exists xetras (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references zones(id) on delete restrict,
  name_gu text not null,
  name_en text not null
);

create table if not exists vistars (
  id uuid primary key default gen_random_uuid(),
  xetra_id uuid not null references xetras(id) on delete restrict,
  name_gu text not null,
  name_en text not null
);

create table if not exists sabhas (
  id uuid primary key default gen_random_uuid(),
  vistar_id uuid not null references vistars(id) on delete restrict,
  name_gu text not null,
  name_en text not null,
  sabha_type sabha_type_t not null,
  -- 0 = Sunday ... 6 = Saturday, matches JS getDay()
  default_weekday smallint not null check (default_weekday between 0 and 6),
  default_start_time time not null,
  default_end_time time not null,
  venue_gu text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sabhas_vistar_active_idx on sabhas (vistar_id) where is_active;

-- ============================================================
-- 3. STANDARDS LOOKUP
-- ============================================================

create table if not exists standards (
  code text primary key,
  label_gu text not null,
  label_en text not null,
  sort_order smallint not null
);

insert into standards (code, label_gu, label_en, sort_order) values
  ('nursery','નર્સરી','Nursery',1),
  ('jr_kg','જુ. કે.જી.','Jr. KG',2),
  ('sr_kg','સી. કે.જી.','Sr. KG',3),
  ('std_1','ધોરણ ૧','Std 1',4),
  ('std_2','ધોરણ ૨','Std 2',5),
  ('std_3','ધોરણ ૩','Std 3',6),
  ('std_4','ધોરણ ૪','Std 4',7),
  ('std_5','ધોરણ ૫','Std 5',8),
  ('std_6','ધોરણ ૬','Std 6',9),
  ('std_7','ધોરણ ૭','Std 7',10),
  ('std_8','ધોરણ ૮','Std 8',11)
on conflict (code) do nothing;

-- ============================================================
-- 4. KARYAKARS
-- ============================================================
-- id mirrors auth.users.id. Created by Super Admin only.

create table if not exists karyakars (
  id uuid primary key references auth.users(id) on delete cascade,
  vistar_id uuid not null references vistars(id) on delete restrict,
  full_name_gu text not null,
  full_name_en text not null,
  mobile text not null,
  role role_t not null,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists karyakars_vistar_role_idx on karyakars (vistar_id, role) where is_active;

create table if not exists karyakar_sabhas (
  karyakar_id uuid not null references karyakars(id) on delete cascade,
  sabha_id uuid not null references sabhas(id) on delete cascade,
  primary key (karyakar_id, sabha_id)
);

-- ============================================================
-- 5. BALAKO
-- ============================================================

create table if not exists balako (
  id uuid primary key default gen_random_uuid(),
  vistar_id uuid not null references vistars(id) on delete restrict,

  full_name_gu text not null,
  full_name_en text not null,
  photo_path text,                       -- Supabase storage path, null until uploaded
  dob date not null,
  standard_code text not null references standards(code),
  medium medium_t not null,
  school_gu text not null,
  school_en text not null,
  address_gu text not null,
  satsang_status satsang_status_t not null,

  mother_name_gu text not null,
  mother_mobile text not null,
  father_name_gu text not null,
  father_mobile text not null,

  status balak_status_t not null default 'active',
  archive_reason_gu text,
  archived_at timestamptz,
  archived_by uuid references karyakars(id),

  -- search helper, maintained by trigger
  search_blob text,

  created_by uuid references karyakars(id),
  created_at timestamptz not null default now(),
  updated_by uuid references karyakars(id),
  updated_at timestamptz not null default now(),

  constraint archive_needs_reason check (
    status = 'active' or (archive_reason_gu is not null and length(trim(archive_reason_gu)) > 0)
  )
);

create index if not exists balako_vistar_active_idx on balako (vistar_id) where status = 'active';
create index if not exists balako_search_idx on balako using gin (to_tsvector('simple', coalesce(search_blob,'')));

create or replace function balako_build_search() returns trigger
language plpgsql as $$
begin
  new.search_blob :=
    lower(unaccent(coalesce(new.full_name_gu,'') || ' ' ||
                   coalesce(new.full_name_en,'') || ' ' ||
                   coalesce(new.school_en,'')    || ' ' ||
                   coalesce(new.mother_mobile,'')|| ' ' ||
                   coalesce(new.father_mobile,'')));
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists balako_search_trg on balako;
create trigger balako_search_trg
  before insert or update on balako
  for each row execute function balako_build_search();

create table if not exists balak_sabhas (
  balak_id uuid not null references balako(id) on delete cascade,
  sabha_id uuid not null references sabhas(id) on delete cascade,
  is_primary boolean not null default false,
  joined_on date not null default current_date,
  primary key (balak_id, sabha_id)
);

-- exactly one primary sabha per balak
create unique index if not exists balak_one_primary on balak_sabhas (balak_id) where is_primary;

-- ============================================================
-- 6. SABHA SESSIONS
-- ============================================================

create table if not exists sabha_sessions (
  id uuid primary key default gen_random_uuid(),
  sabha_id uuid not null references sabhas(id) on delete cascade,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  sabha_type sabha_type_t not null,      -- snapshot at generation time
  status session_status_t not null default 'scheduled',

  cancel_reason_gu text,
  cancelled_by uuid references karyakars(id),
  cancelled_at timestamptz,

  karyakram_text text,
  notes_text text,

  aheval_done boolean not null default false,
  aheval_done_by uuid references karyakars(id),
  aheval_done_at timestamptz,

  created_at timestamptz not null default now(),
  updated_by uuid references karyakars(id),
  updated_at timestamptz not null default now(),

  unique (sabha_id, session_date),
  constraint cancel_needs_reason check (
    status <> 'cancelled' or (cancel_reason_gu is not null and length(trim(cancel_reason_gu)) > 0)
  )
);

create index if not exists sessions_date_status_idx on sabha_sessions (session_date, status);
create index if not exists sessions_sabha_date_idx on sabha_sessions (sabha_id, session_date desc);

-- karyakars who performed the pre-sabha follow-up for this session (multi-select at sheet footer)
create table if not exists session_followup_karyakars (
  session_id uuid not null references sabha_sessions(id) on delete cascade,
  karyakar_id uuid not null references karyakars(id) on delete cascade,
  primary key (session_id, karyakar_id)
);

-- ============================================================
-- 7. ATTENDANCE (one row per enrolled balak per session)
-- ============================================================

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sabha_sessions(id) on delete cascade,
  balak_id uuid not null references balako(id) on delete cascade,

  presabha_status presabha_t not null default 'pending',
  presabha_contacted contacted_t not null default 'none',
  presabha_by uuid references karyakars(id),
  presabha_at timestamptz,

  attendance_status attendance_t,
  marked_by uuid references karyakars(id),
  marked_at timestamptz,

  updated_by uuid references karyakars(id),
  updated_at timestamptz not null default now(),

  unique (session_id, balak_id)
);

create index if not exists attendance_session_idx on attendance (session_id);
create index if not exists attendance_balak_idx on attendance (balak_id, updated_at desc);

-- ============================================================
-- 8. AHNIK
-- ============================================================

create table if not exists ahnik_items (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label_gu text not null,
  label_en text not null,
  sort_order smallint not null,
  is_active boolean not null default true
);

insert into ahnik_items (code, label_gu, label_en, sort_order) values
  ('pooja','પૂજા','Pooja',1),
  ('tilak_chandlo','તિલક-ચાંદલો','Tilak-Chandlo',2),
  ('mansi','માનસી પૂજા','Mansi Pooja',3),
  ('aarti','આરતી','Aarti',4),
  ('vachanamrut_swamini_vato','વચનામૃત / સ્વામીની વાતો વાંચન','Vachanamrut / Swamini Vato',5),
  ('gharsabha','ઘરસભા','Gharsabha',6),
  ('ravi_sabha','રવિ સભા','Ravi Sabha',7)
on conflict (code) do nothing;

-- One record per balak per ISO week. week_start_date is always a Monday.
create table if not exists ahnik_weeks (
  id uuid primary key default gen_random_uuid(),
  balak_id uuid not null references balako(id) on delete cascade,
  week_start_date date not null,
  captured_at_session uuid references sabha_sessions(id) on delete set null,
  captured_by uuid references karyakars(id),
  created_at timestamptz not null default now(),
  updated_by uuid references karyakars(id),
  updated_at timestamptz not null default now(),
  unique (balak_id, week_start_date),
  constraint week_is_monday check (extract(isodow from week_start_date) = 1)
);

create index if not exists ahnik_weeks_date_idx on ahnik_weeks (week_start_date desc);

create table if not exists ahnik_entries (
  ahnik_week_id uuid not null references ahnik_weeks(id) on delete cascade,
  ahnik_item_id uuid not null references ahnik_items(id) on delete restrict,
  done boolean not null default false,
  primary key (ahnik_week_id, ahnik_item_id)
);

-- ============================================================
-- 9. વિશેષ નિયમ
-- ============================================================
-- NOTE: Postgres generated columns cannot reference other columns via
-- operators that need immutable casts.  We use a trigger instead.

create table if not exists niyams (
  id uuid primary key default gen_random_uuid(),
  balak_id uuid not null references balako(id) on delete cascade,
  title_gu text not null,
  start_date date not null,
  duration_months smallint not null check (duration_months between 1 and 60),
  end_date date,
  status niyam_status_t not null default 'active',
  notes_gu text,
  created_by uuid references karyakars(id),
  created_at timestamptz not null default now(),
  updated_by uuid references karyakars(id),
  updated_at timestamptz not null default now()
);

-- Trigger to auto-compute end_date from start_date + duration_months
create or replace function niyam_compute_end_date() returns trigger
language plpgsql as $$
begin
  new.end_date := (new.start_date + make_interval(months => new.duration_months))::date;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists niyam_end_date_trg on niyams;
create trigger niyam_end_date_trg
  before insert or update of start_date, duration_months on niyams
  for each row execute function niyam_compute_end_date();

create index if not exists niyams_balak_status_idx on niyams (balak_id, status);
create index if not exists niyams_end_date_idx on niyams (end_date) where status = 'active';

-- ============================================================
-- 10. TASK ENGINE
-- ============================================================

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sabha_sessions(id) on delete cascade,
  sabha_id uuid not null references sabhas(id) on delete cascade,
  task_type task_type_t not null,
  opens_at timestamptz not null,
  due_at timestamptz not null,
  status task_status_t not null default 'open',
  completed_at timestamptz,
  completed_by uuid references karyakars(id),
  escalated_at timestamptz,
  last_reminder_at timestamptz,
  reminder_count smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, task_type)
);

create index if not exists tasks_status_opens_idx on tasks (status, opens_at);
create index if not exists tasks_sabha_status_idx on tasks (sabha_id, status);
create index if not exists tasks_due_open_idx on tasks (due_at) where status = 'open';

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  karyakar_id uuid not null references karyakars(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz,
  failure_count smallint not null default 0
);

create index if not exists push_subs_karyakar_idx on push_subscriptions (karyakar_id);

create table if not exists inapp_notifications (
  id uuid primary key default gen_random_uuid(),
  karyakar_id uuid not null references karyakars(id) on delete cascade,
  kind text not null,                    -- 'task' | 'niyam_expired' | 'escalation' | 'system'
  title_gu text not null,
  body_gu text not null,
  link_url text,
  task_id uuid references tasks(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists inapp_notif_karyakar_idx on inapp_notifications (karyakar_id, read_at nulls first, created_at desc);

-- ============================================================
-- 11. AUDIT LOG (latest-value model, no previous values stored)
-- ============================================================

create table if not exists audit_log (
  id bigserial primary key,
  table_name text not null,
  record_id uuid not null,
  action text not null,                  -- 'insert' | 'update' | 'delete' | 'archive' | 'cancel'
  changed_fields text[],
  actor_id uuid,
  actor_name_snapshot text,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_table_record_idx on audit_log (table_name, record_id, created_at desc);
create index if not exists audit_log_actor_idx on audit_log (actor_id, created_at desc);

-- ============================================================
-- 12. APP SETTINGS
-- ============================================================

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into app_settings (key, value) values
  ('quiet_hours',          '{"start":"22:00","end":"07:00","tz":"Asia/Kolkata"}'),
  ('reminder_slots',       '["09:00","13:00","17:00","21:00"]'),
  ('session_horizon_days', '14'),
  ('photo_grace_days',     '10'),
  ('consecutive_absent_threshold', '3')
on conflict (key) do nothing;

-- ============================================================
-- 13. RLS HELPERS
-- ============================================================

create or replace function auth_karyakar() returns karyakars
language sql stable security definer set search_path = public as $$
  select * from karyakars where id = auth.uid() and is_active
$$;

create or replace function auth_role() returns role_t
language sql stable security definer set search_path = public as $$
  select role from karyakars where id = auth.uid() and is_active
$$;

create or replace function auth_vistar() returns uuid
language sql stable security definer set search_path = public as $$
  select vistar_id from karyakars where id = auth.uid() and is_active
$$;

-- true for super_admin, agresar, nirikshak
create or replace function is_vistar_scope() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role in ('super_admin','agresar','nirikshak')
     from karyakars where id = auth.uid() and is_active), false)
$$;

create or replace function is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'super_admin' from karyakars where id = auth.uid() and is_active), false)
$$;

create or replace function can_cancel_session() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('super_admin','nirikshak')
                   from karyakars where id = auth.uid() and is_active), false)
$$;

-- sabha ids this user may act on
create or replace function my_sabha_ids() returns setof uuid
language plpgsql stable security definer set search_path = public as $$
declare
  _ids uuid[];
begin
  if is_vistar_scope() then
    select array_agg(s.id) into _ids
    from sabhas s where s.vistar_id = auth_vistar();
  else
    select array_agg(ks.sabha_id) into _ids
    from karyakar_sabhas ks where ks.karyakar_id = auth.uid();
  end if;

  return query select unnest(coalesce(_ids, '{}'::uuid[]));
end $$;

-- can this user see this balak
create or replace function can_see_balak(p_balak uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when is_vistar_scope() then
      exists (select 1 from balako b where b.id = p_balak and b.vistar_id = auth_vistar())
    else
      exists (
        select 1 from balak_sabhas bs
        join karyakar_sabhas ks on ks.sabha_id = bs.sabha_id
        where bs.balak_id = p_balak and ks.karyakar_id = auth.uid()
      )
  end
$$;

create or replace function can_touch_sabha(p_sabha uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when is_vistar_scope() then
      exists (select 1 from sabhas s where s.id = p_sabha and s.vistar_id = auth_vistar())
    else
      exists (select 1 from karyakar_sabhas ks where ks.sabha_id = p_sabha and ks.karyakar_id = auth.uid())
  end
$$;

-- ============================================================
-- 14. RLS POLICIES
-- ============================================================

alter table cities        enable row level security;
alter table zones         enable row level security;
alter table xetras        enable row level security;
alter table vistars       enable row level security;
alter table sabhas        enable row level security;
alter table standards     enable row level security;
alter table karyakars     enable row level security;
alter table karyakar_sabhas enable row level security;
alter table balako        enable row level security;
alter table balak_sabhas  enable row level security;
alter table sabha_sessions enable row level security;
alter table session_followup_karyakars enable row level security;
alter table attendance    enable row level security;
alter table ahnik_items   enable row level security;
alter table ahnik_weeks   enable row level security;
alter table ahnik_entries enable row level security;
alter table niyams        enable row level security;
alter table tasks         enable row level security;
alter table push_subscriptions enable row level security;
alter table inapp_notifications enable row level security;
alter table audit_log     enable row level security;
alter table app_settings  enable row level security;

-- Drop existing policies if re-running (idempotent)
do $$ declare
  r record;
begin
  for r in (
    select policyname, tablename, schemaname
    from pg_policies
    where schemaname = 'public'
  ) loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Reference data: readable by any signed-in karyakar
create policy ref_read_standards on standards   for select using (auth.uid() is not null);
create policy ref_read_ahnik    on ahnik_items  for select using (auth.uid() is not null);
create policy ref_read_cities   on cities       for select using (auth.uid() is not null);
create policy ref_read_zones    on zones        for select using (auth.uid() is not null);
create policy ref_read_xetras   on xetras       for select using (auth.uid() is not null);
create policy ref_read_vistars  on vistars      for select using (auth.uid() is not null);

create policy settings_read  on app_settings for select using (auth.uid() is not null);
create policy settings_write on app_settings for all    using (is_super_admin()) with check (is_super_admin());

-- SABHAS
create policy sabhas_read on sabhas for select
  using (vistar_id = auth_vistar());
-- editing default weekday/time: vistar scope only. sabha_type: super admin only (enforce in app + trigger below)
create policy sabhas_update on sabhas for update
  using (is_vistar_scope() and vistar_id = auth_vistar())
  with check (is_vistar_scope() and vistar_id = auth_vistar());
create policy sabhas_insert on sabhas for insert with check (is_super_admin());

create or replace function guard_sabha_type() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.sabha_type is distinct from old.sabha_type and not is_super_admin() then
    raise exception 'સભાનો પ્રકાર માત્ર સુપર એડમિન બદલી શકે છે';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists sabha_type_guard on sabhas;
create trigger sabha_type_guard before update on sabhas
  for each row execute function guard_sabha_type();

-- KARYAKARS
create policy karyakars_read on karyakars for select
  using (vistar_id = auth_vistar());
create policy karyakars_self_update on karyakars for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy karyakars_admin_all on karyakars for all
  using (is_super_admin()) with check (is_super_admin());

create policy ks_read on karyakar_sabhas for select using (auth.uid() is not null);
create policy ks_admin on karyakar_sabhas for all
  using (is_super_admin()) with check (is_super_admin());

-- BALAKO
create policy balako_read on balako for select
  using (can_see_balak(id));
create policy balako_insert on balako for insert
  with check (vistar_id = auth_vistar());          -- all five roles may register
create policy balako_update on balako for update
  using (can_see_balak(id)) with check (can_see_balak(id));

-- archiving restricted to vistar scope
create or replace function guard_balak_archive() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and not is_vistar_scope() then
    raise exception 'બાળકને આર્કાઇવ કરવાની પરવાનગી નથી';
  end if;
  return new;
end $$;

drop trigger if exists balak_archive_guard on balako;
create trigger balak_archive_guard before update on balako
  for each row execute function guard_balak_archive();

create policy bs_read on balak_sabhas for select using (can_see_balak(balak_id));
create policy bs_write on balak_sabhas for all
  using (can_touch_sabha(sabha_id)) with check (can_touch_sabha(sabha_id));

-- SESSIONS
create policy sess_read on sabha_sessions for select using (can_touch_sabha(sabha_id));
create policy sess_update on sabha_sessions for update
  using (can_touch_sabha(sabha_id)) with check (can_touch_sabha(sabha_id));
create policy sess_insert on sabha_sessions for insert with check (can_touch_sabha(sabha_id));

create or replace function guard_session_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' and not can_cancel_session() then
    raise exception 'સભા રદ કરવાની પરવાનગી માત્ર નિરીક્ષક પાસે છે';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists session_cancel_guard on sabha_sessions;
create trigger session_cancel_guard before update on sabha_sessions
  for each row execute function guard_session_cancel();

create policy sfk_all on session_followup_karyakars for all
  using (exists (select 1 from sabha_sessions s where s.id = session_id and can_touch_sabha(s.sabha_id)))
  with check (exists (select 1 from sabha_sessions s where s.id = session_id and can_touch_sabha(s.sabha_id)));

-- ATTENDANCE
create policy att_all on attendance for all
  using (exists (select 1 from sabha_sessions s where s.id = session_id and can_touch_sabha(s.sabha_id)))
  with check (exists (select 1 from sabha_sessions s where s.id = session_id and can_touch_sabha(s.sabha_id)));

-- AHNIK
create policy ahnik_week_all on ahnik_weeks for all
  using (can_see_balak(balak_id)) with check (can_see_balak(balak_id));

create policy ahnik_entry_all on ahnik_entries for all
  using (exists (select 1 from ahnik_weeks w where w.id = ahnik_week_id and can_see_balak(w.balak_id)))
  with check (exists (select 1 from ahnik_weeks w where w.id = ahnik_week_id and can_see_balak(w.balak_id)));

-- NIYAM
create policy niyam_all on niyams for all
  using (can_see_balak(balak_id)) with check (can_see_balak(balak_id));

-- TASKS
create policy tasks_read on tasks for select using (can_touch_sabha(sabha_id));
create policy tasks_update on tasks for update
  using (can_touch_sabha(sabha_id)) with check (can_touch_sabha(sabha_id));

-- PUSH + NOTIFICATIONS: own rows only
create policy push_own on push_subscriptions for all
  using (karyakar_id = auth.uid()) with check (karyakar_id = auth.uid());
create policy notif_own on inapp_notifications for all
  using (karyakar_id = auth.uid()) with check (karyakar_id = auth.uid());

-- AUDIT: vistar scope read only
create policy audit_read on audit_log for select using (is_vistar_scope());

-- ============================================================
-- 15. GENERIC AUDIT TRIGGER
-- ============================================================

create or replace function write_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  changed text[];
  actor_name text;
  rec_id uuid;
begin
  select full_name_gu into actor_name from karyakars where id = auth.uid();

  if tg_op = 'DELETE' then
    rec_id := old.id;
  else
    rec_id := new.id;
  end if;

  if tg_op = 'UPDATE' then
    select array_agg(key) into changed
    from jsonb_each(to_jsonb(new))
    where to_jsonb(new)->key is distinct from to_jsonb(old)->key
      and key not in ('updated_at','search_blob');
    if changed is null then return new; end if;
  end if;

  insert into audit_log (table_name, record_id, action, changed_fields, actor_id, actor_name_snapshot)
  values (tg_table_name,
          rec_id,
          lower(tg_op),
          changed,
          auth.uid(),
          coalesce(actor_name, 'unknown'));

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

drop trigger if exists audit_balako   on balako;
drop trigger if exists audit_sessions on sabha_sessions;
drop trigger if exists audit_att      on attendance;
drop trigger if exists audit_ahnik    on ahnik_weeks;
drop trigger if exists audit_niyam    on niyams;
drop trigger if exists audit_kary     on karyakars;
drop trigger if exists audit_sabhas   on sabhas;

create trigger audit_balako   after insert or update or delete on balako          for each row execute function write_audit();
create trigger audit_sessions after insert or update or delete on sabha_sessions  for each row execute function write_audit();
create trigger audit_att      after insert or update or delete on attendance      for each row execute function write_audit();
create trigger audit_ahnik    after insert or update or delete on ahnik_weeks     for each row execute function write_audit();
create trigger audit_niyam    after insert or update or delete on niyams          for each row execute function write_audit();
create trigger audit_kary     after insert or update or delete on karyakars       for each row execute function write_audit();
create trigger audit_sabhas   after insert or update or delete on sabhas          for each row execute function write_audit();

-- ============================================================
-- 16. HELPER VIEWS
-- ============================================================

-- Vistar total: DISTINCT balak. Never sum per-sabha counts to get this.
create or replace view v_vistar_balak_count as
select b.vistar_id, count(distinct b.id) as total_balako
from balako b
where b.status = 'active'
group by b.vistar_id;

create or replace view v_sabha_balak_count as
select s.id as sabha_id, s.vistar_id, count(distinct bs.balak_id) as sankhya
from sabhas s
left join balak_sabhas bs on bs.sabha_id = s.id
left join balako b on b.id = bs.balak_id and b.status = 'active'
where s.is_active
group by s.id, s.vistar_id;

create or replace view v_attendance_rate as
select a.session_id,
       s.sabha_id,
       s.session_date,
       count(*) filter (where a.attendance_status = 'present') as present_count,
       count(*) filter (where a.attendance_status = 'absent')  as absent_count,
       round(100.0 * count(*) filter (where a.attendance_status = 'present')
             / nullif(count(*) filter (where a.attendance_status is not null), 0), 1) as rate
from attendance a
join sabha_sessions s on s.id = a.session_id
where s.status = 'held'
group by a.session_id, s.sabha_id, s.session_date;

-- Karyakar accountability: tasks closed before due_at
create or replace view v_karyakar_accountability as
select t.completed_by as karyakar_id,
       date_trunc('month', t.due_at) as month,
       count(*) as tasks_total,
       count(*) filter (where t.completed_at <= t.due_at) as on_time,
       round(100.0 * count(*) filter (where t.completed_at <= t.due_at) / nullif(count(*),0), 1) as pct
from tasks t
where t.status = 'done'
group by t.completed_by, date_trunc('month', t.due_at);

-- Balako absent 3+ consecutive held sessions
create or replace view v_consecutive_absent as
with marked as (
  select a.balak_id, s.sabha_id, s.session_date, a.attendance_status,
         row_number() over (partition by a.balak_id, s.sabha_id order by s.session_date desc) as rn
  from attendance a
  join sabha_sessions s on s.id = a.session_id
  where s.status = 'held' and a.attendance_status is not null
)
select balak_id, sabha_id, count(*) as streak
from marked
where rn <= 3
group by balak_id, sabha_id
having count(*) = 3 and bool_and(attendance_status = 'absent');

-- ============================================================
-- 17. SEED: Paldi
-- ============================================================

do $$
declare
  _city_id uuid;
  _zone_id uuid;
  _xetra_id uuid;
  _vistar_id uuid;
begin
  -- Only seed if no cities exist yet
  if exists (select 1 from cities limit 1) then
    raise notice 'Seed data already exists, skipping.';
    return;
  end if;

  insert into cities (name_gu, name_en) values ('અમદાવાદ','Ahmedabad') returning id into _city_id;
  insert into zones (city_id, name_gu, name_en) values (_city_id,'ઝોન-૧','Zone-1') returning id into _zone_id;
  insert into xetras (zone_id, name_gu, name_en) values (_zone_id,'ક્ષેત્ર-૧૪','Xetra-14') returning id into _xetra_id;
  insert into vistars (xetra_id, name_gu, name_en) values (_xetra_id,'પાલડી','Paldi') returning id into _vistar_id;

  insert into sabhas (vistar_id, name_gu, name_en, sabha_type, default_weekday, default_start_time, default_end_time) values
    (_vistar_id,'પાલડી બાળ સભા','Paldi Bal Sabha','pakki',3,'21:00'::time,'22:30'::time),
    (_vistar_id,'પાલડી શિશુ સભા','Paldi Shishu Sabha','pakki',3,'21:00'::time,'22:30'::time),
    (_vistar_id,'સ્વામિનારાયણ પાર્ક-૧ સભા','Swaminarayan Park-1 Sabha','kachi',6,'19:00'::time,'20:00'::time),
    (_vistar_id,'રિવર સાઇડ પાર્ક સભા','River Side Park Sabha','kachi',4,'19:00'::time,'20:00'::time);
end $$;

-- ============================================================
-- 18. STORAGE BUCKET (run in Supabase Storage, or via SQL below)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('balak-photos','balak-photos', false)
on conflict do nothing;

-- Drop existing storage policies before re-creating
do $$ declare
  r record;
begin
  for r in (
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in ('read own vistar photos', 'upload photos', 'update photos')
  ) loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

create policy "read own vistar photos" on storage.objects for select
  using (bucket_id = 'balak-photos' and auth.uid() is not null);

create policy "upload photos" on storage.objects for insert
  with check (bucket_id = 'balak-photos' and auth.uid() is not null);

create policy "update photos" on storage.objects for update
  using (bucket_id = 'balak-photos' and auth.uid() is not null);
