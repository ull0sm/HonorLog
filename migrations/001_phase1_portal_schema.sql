-- =============================================================
-- Migration 001: Phase 1 – Backend portal schema extensions
-- =============================================================
-- Run this against an existing database that already has the
-- base schema.sql tables: students, events, participations, results.
--
-- This migration is additive and safe to run on live data.
-- It does not alter or drop any existing columns or rows.
-- =============================================================

-- Enable UUID extension (idempotent)
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------
-- profiles
-- One row per authenticated user. ID must match Supabase Auth UID.
-- Referenced by: events.created_by, event_access, event_import_batches,
--                event_results.entered_by, audit_logs.actor_user_id
-- Phase 2 will insert rows here on first login (profile bootstrap).
-- -------------------------------------------------------------
create table if not exists profiles (
  id           uuid primary key,
  email        text not null unique,
  full_name    text,
  global_role  text not null check (global_role in ('super_admin', 'staff')),
  is_active    boolean not null default true,
  created_at   timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at   timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -------------------------------------------------------------
-- events – additive column extensions
-- Adds portal workflow metadata without touching existing columns.
-- Phase 4 (event CRUD) will use slug, status, description.
-- Phase 7 (import pipeline) will update import_status.
-- Phase 9 (prize entry) will check results_locked.
-- Phase 10 (locking/audit) will toggle results_locked.
-- -------------------------------------------------------------
alter table events
  add column if not exists slug           text,
  add column if not exists status         text not null default 'draft',
  add column if not exists description    text,
  add column if not exists import_status  text not null default 'not_started',
  add column if not exists results_locked boolean not null default false,
  add column if not exists created_by     uuid,
  add column if not exists updated_at     timestamp with time zone default timezone('utc'::text, now()) not null;

-- Add constraints idempotently via DO block.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_slug_unique'
  ) then
    alter table events add constraint events_slug_unique unique (slug);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'events_status_check'
  ) then
    alter table events add constraint events_status_check
      check (status in ('draft', 'open', 'active', 'completed', 'locked', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'events_import_status_check'
  ) then
    alter table events add constraint events_import_status_check
      check (import_status in ('not_started', 'uploaded', 'validated', 'imported', 'failed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'events_created_by_fkey'
  ) then
    alter table events add constraint events_created_by_fkey
      foreign key (created_by) references profiles(id) on delete set null;
  end if;
end $$;

-- -------------------------------------------------------------
-- event_access
-- Event-scoped staff assignment. Unique (event_id, user_id, role)
-- prevents duplicate access assignments.
-- Phase 5 (access control) will create and manage rows here.
-- Phase 6 (registrar flow) reads active assignments at login.
-- -------------------------------------------------------------
create table if not exists event_access (
  id               uuid default uuid_generate_v4() primary key,
  event_id         uuid not null references events(id) on delete cascade,
  user_id          uuid not null references profiles(id) on delete cascade,
  role             text not null check (role in ('event_registrar')),
  is_active        boolean not null default true,
  can_edit_results boolean not null default true,
  expires_at       timestamp with time zone,
  created_by       uuid references profiles(id) on delete set null,
  created_at       timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at       timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (event_id, user_id, role)
);

-- -------------------------------------------------------------
-- event_import_batches
-- Tracks every upload attempt. import_fingerprint + partial unique
-- index prevents the same file being confirmed twice (batch replay).
-- Phase 7 (JSON import) creates rows here on upload.
-- Phase 8 (Excel) also writes to this table through the same path.
-- -------------------------------------------------------------
create table if not exists event_import_batches (
  id                 uuid default uuid_generate_v4() primary key,
  event_id           uuid not null references events(id) on delete cascade,
  uploaded_by        uuid not null references profiles(id) on delete restrict,
  source_type        text not null check (source_type in ('json', 'excel')),
  source_filename    text not null,
  storage_path       text,
  import_fingerprint text,
  status             text not null check (status in ('uploaded', 'parsed', 'validated', 'confirmed', 'failed')),
  row_count          integer not null default 0 check (row_count >= 0),
  error_summary      jsonb not null default '[]'::jsonb,
  created_at         timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Partial unique index: only enforce fingerprint uniqueness when set,
-- allowing re-uploads of new files without constraint collisions.
create unique index if not exists ux_event_import_batches_event_fingerprint on event_import_batches (event_id, import_fingerprint)
where
    import_fingerprint is not null;

-- -------------------------------------------------------------
-- event_import_rows
-- Normalized preview rows created during parse, before confirmation.
-- Phase 7 writes rows here; preview UI reads them.
-- Rows are discarded (cascade) when the batch is deleted.
-- unique (batch_id, row_index) prevents duplicate row ingestion.
-- -------------------------------------------------------------
create table if not exists event_import_rows (
  id                uuid default uuid_generate_v4() primary key,
  batch_id          uuid not null references event_import_batches(id) on delete cascade,
  row_index         integer not null check (row_index >= 0),
  payload           jsonb not null,
  validation_status text not null check (validation_status in ('valid', 'warning', 'error', 'duplicate')),
  messages          jsonb not null default '[]'::jsonb,
  created_at        timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (batch_id, row_index)
);

-- -------------------------------------------------------------
-- event_categories
-- Explicit per-event division model. Expression-based dedup index
-- handles nullable dimension fields without false uniqueness gaps.
-- Phase 4 (event CRUD) may create categories manually.
-- Phase 7 (import) matches incoming rows to categories by name.
-- Phase 9 (prize entry) reads categories for result entry UI.
-- -------------------------------------------------------------
create table if not exists event_categories (
  id            uuid default uuid_generate_v4() primary key,
  event_id      uuid not null references events(id) on delete cascade,
  name          text not null,
  age_group     text,
  belt_group    text,
  division_type text,
  gender        text,
  sort_order    integer not null default 0,
  is_locked     boolean not null default false,
  created_at    timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at    timestamp with time zone default timezone('utc'::text, now()) not null
);

create unique index if not exists ux_event_categories_dedup on event_categories (
    event_id,
    name,
    coalesce(age_group, ''),
    coalesce(belt_group, ''),
    coalesce(division_type, ''),
    coalesce(gender, '')
);

-- -------------------------------------------------------------
-- event_registrations
-- Imported registration records per event.
-- student_id is nullable (on delete set null) to support external
-- participants with no matching student row.
-- Phase 7 confirms import by writing rows here from event_import_rows.
-- Phase 9 reads these rows to populate the prize entry category lists.
-- -------------------------------------------------------------
create table if not exists event_registrations (
  id                     uuid default uuid_generate_v4() primary key,
  event_id               uuid not null references events(id) on delete cascade,
  student_id             uuid references students(id) on delete set null,
  participant_name       text not null,
  participant_identifier text,
  dojo                   text,
  belt_rank              text,
  gender                 text,
  age                    integer,
  category_id            uuid references event_categories(id) on delete set null,
  raw_payload            jsonb not null default '{}'::jsonb,
  created_at             timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at             timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -------------------------------------------------------------
-- event_results
-- Portal-native prize/result entries per event category.
-- Separate from the legacy public "results" table so public
-- student profile reads are unaffected.
-- unique (event_id, category_id, placement) enforces one winner
-- per placement slot within a category (no duplicate placements).
-- Phase 9 (prize entry) inserts and updates rows here.
-- Phase 10 (locking) blocks writes when results_locked = true.
-- -------------------------------------------------------------
create table if not exists event_results (
  id                       uuid default uuid_generate_v4() primary key,
  event_id                 uuid not null references events(id) on delete cascade,
  category_id              uuid not null references event_categories(id) on delete cascade,
  registration_id          uuid references event_registrations(id) on delete set null,
  placement                integer not null check (placement > 0),
  medal                    text check (medal in ('GOLD', 'SILVER', 'BRONZE', 'PARTICIPATION')),
  participant_name_snapshot text not null,
  dojo_snapshot            text,
  entered_by               uuid references profiles(id) on delete set null,
  created_at               timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at               timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (event_id, category_id, placement)
);

-- -------------------------------------------------------------
-- audit_logs
-- Append-only record of privileged and operationally important
-- actions. Phase 10 (hardening) will write to this table.
-- RLS: super_admin read-only; no direct user writes.
-- -------------------------------------------------------------
create table if not exists audit_logs (
  id             uuid default uuid_generate_v4() primary key,
  actor_user_id  uuid references profiles(id) on delete set null,
  action         text not null,
  entity_type    text not null,
  entity_id      uuid,
  event_id       uuid references events(id) on delete set null,
  before_state   jsonb,
  after_state    jsonb,
  created_at     timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -------------------------------------------------------------
-- Indexes
-- Covers expected query patterns for portal data access.
-- -------------------------------------------------------------
create index if not exists ix_events_status on events (status);

create index if not exists ix_events_date on events (date);

create index if not exists ix_event_access_event_id on event_access (event_id);

create index if not exists ix_event_access_user_id on event_access (user_id);

create index if not exists ix_event_access_active_expires on event_access (is_active, expires_at);

create index if not exists ix_event_import_batches_event_id on event_import_batches (event_id);

create index if not exists ix_event_import_batches_uploaded_by on event_import_batches (uploaded_by);

create index if not exists ix_event_import_batches_status on event_import_batches (status);

create index if not exists ix_event_import_rows_batch_id on event_import_rows (batch_id);

create index if not exists ix_event_import_rows_status on event_import_rows (validation_status);

create index if not exists ix_event_categories_event_id on event_categories (event_id);

create index if not exists ix_event_registrations_event_id on event_registrations (event_id);

create index if not exists ix_event_registrations_student_id on event_registrations (student_id);

create index if not exists ix_event_registrations_category_id on event_registrations (category_id);

create index if not exists ix_event_registrations_identifier on event_registrations (participant_identifier);

create index if not exists ix_event_results_event_id on event_results (event_id);

create index if not exists ix_event_results_category_id on event_results (category_id);

create index if not exists ix_event_results_registration_id on event_results (registration_id);

create index if not exists ix_event_results_entered_by on event_results (entered_by);

create index if not exists ix_audit_logs_actor_user_id on audit_logs (actor_user_id);

create index if not exists ix_audit_logs_event_id on audit_logs (event_id);

create index if not exists ix_audit_logs_entity on audit_logs (entity_type, entity_id);

create index if not exists ix_audit_logs_created_at on audit_logs (created_at);

-- -------------------------------------------------------------
-- updated_at trigger
-- Single shared function; triggers on all mutable portal tables.
-- -------------------------------------------------------------
create or replace function set_updated_at_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_events_updated_at on events;

drop trigger if exists trg_profiles_updated_at on profiles;

drop trigger if exists trg_event_access_updated_at on event_access;

drop trigger if exists trg_event_categories_updated_at on event_categories;

drop trigger if exists trg_event_registrations_updated_at on event_registrations;

drop trigger if exists trg_event_results_updated_at on event_results;

create trigger trg_events_updated_at
  before update on events
  for each row execute function set_updated_at_timestamp();

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at_timestamp();

create trigger trg_event_access_updated_at
  before update on event_access
  for each row execute function set_updated_at_timestamp();

create trigger trg_event_categories_updated_at
  before update on event_categories
  for each row execute function set_updated_at_timestamp();

create trigger trg_event_registrations_updated_at
  before update on event_registrations
  for each row execute function set_updated_at_timestamp();

create trigger trg_event_results_updated_at
  before update on event_results
  for each row execute function set_updated_at_timestamp();

-- select id, email, email_confirmed_at
-- from auth.users
-- where email = 'admin@example.com';

-- insert into public.profiles (
--   id,
--   email,
--   full_name,
--   global_role,
--   is_active
-- )
-- values (
--   'PASTE_AUTH_USER_UUID_HERE',
--   'admin@example.com',
--   'Your Name',
--   'super_admin',
--   true
-- );