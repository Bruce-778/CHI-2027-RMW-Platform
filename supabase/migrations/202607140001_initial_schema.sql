-- RMW pilot schema. All participant access is server-mediated.
create extension if not exists pgcrypto;

create type public.study_condition as enum ('summary','notes','rmw');
create type public.study_locale as enum ('zh-CN','en');
create type public.card_status as enum ('draft','active','uncertain','expired');

create table public.studies (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  active boolean not null default false,
  day2_delay interval not null default interval '24 hours',
  created_at timestamptz not null default now()
);

create table public.experiment_versions (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies on delete cascade,
  version text not null,
  config jsonb not null default '{}'::jsonb,
  frozen_at timestamptz,
  unique(study_id, version)
);

create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  experiment_version_id uuid not null references public.experiment_versions on delete cascade,
  kind text not null,
  version text not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique(experiment_version_id, kind, version)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  experiment_version_id uuid not null references public.experiment_versions on delete cascade,
  material_key text not null,
  position integer not null,
  metadata jsonb not null default '{}'::jsonb,
  unique(experiment_version_id, material_key)
);

create table public.material_localizations (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials on delete cascade,
  locale public.study_locale not null,
  title text not null,
  body text not null,
  unique(material_id, locale)
);

create table public.participant_codes (
  id uuid primary key default gen_random_uuid(),
  experiment_version_id uuid not null references public.experiment_versions on delete cascade,
  code_hash text unique not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  experiment_version_id uuid not null references public.experiment_versions,
  code_id uuid unique not null references public.participant_codes,
  condition public.study_condition not null,
  locale public.study_locale not null,
  consent_version text not null,
  consented_at timestamptz not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants on delete cascade,
  day smallint not null check (day in (1,2)),
  stage text not null,
  opened_at timestamptz not null default now(),
  available_at timestamptz,
  recovery_support_revealed_at timestamptz,
  completed_at timestamptz,
  locked_at timestamptz,
  unique(participant_id, day)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions on delete cascade,
  role text not null check (role in ('system','user','assistant')),
  content text not null,
  model_id text,
  prompt_version_id uuid references public.prompt_versions,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.memo_revisions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions on delete cascade,
  revision integer not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique(session_id, revision)
);

create table public.extraction_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions on delete cascade,
  idempotency_key text unique not null,
  input_hash text not null,
  model_id text,
  raw_output jsonb,
  parsed_output jsonb,
  status text not null check (status in ('queued','running','succeeded','failed','reviewed')),
  error text,
  created_at timestamptz not null default now()
);

create table public.reasoning_cards (
  id uuid primary key default gen_random_uuid(),
  extraction_run_id uuid not null references public.extraction_runs on delete cascade,
  card_type text not null check (card_type in ('goal','hypothesis','evidence','constraint','path','next_action')),
  goal_level text check (goal_level in ('main','subgoal','suspended')),
  parent_goal_id uuid references public.reasoning_cards,
  content jsonb not null,
  detail jsonb not null default '{}'::jsonb,
  status public.card_status not null,
  priority text not null check (priority in ('normal','pinned')),
  risk_tags text[] not null default '{}',
  revision integer not null default 1,
  generated_by text not null check (generated_by in ('llm','researcher','participant')),
  reviewed_by_researcher boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.card_sources (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.reasoning_cards on delete cascade,
  source_kind text not null check (source_kind in ('material','chat_turn','memo_revision','user_note')),
  source_id uuid,
  label text not null,
  excerpt text,
  anchor text not null
);

create table public.card_relations (
  id uuid primary key default gen_random_uuid(),
  source_card_id uuid not null references public.reasoning_cards on delete cascade,
  target_card_id uuid not null references public.reasoning_cards on delete cascade,
  relation_type text not null check (relation_type in ('supports','challenges','constrains','rejects','leads_to')),
  generated_by text not null check (generated_by in ('llm','researcher','participant')),
  confidence numeric check (confidence between 0 and 1)
);

create table public.recovery_artifacts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions on delete cascade,
  extraction_run_id uuid references public.extraction_runs,
  kind text not null check (kind in ('summary','notes','resume_brief')),
  content jsonb not null,
  revision integer not null default 1,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(session_id, kind, revision)
);

create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions on delete cascade,
  kind text not null check (kind in ('pre','post','interview')),
  answers jsonb not null,
  submitted_at timestamptz not null default now()
);

create table public.recall_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique not null references public.sessions on delete cascade,
  answers jsonb not null,
  started_at timestamptz not null,
  submitted_at timestamptz not null
);

create table public.events (
  id uuid primary key,
  participant_id uuid not null references public.participants on delete cascade,
  session_id uuid not null references public.sessions on delete cascade,
  experiment_version_id uuid not null references public.experiment_versions,
  condition public.study_condition not null,
  stage text not null,
  event_type text not null,
  target_type text,
  target_id text,
  client_timestamp timestamptz not null,
  server_timestamp timestamptz not null default now(),
  sequence_number bigint not null,
  payload jsonb not null default '{}'::jsonb,
  unique(session_id, sequence_number)
);

create table public.researcher_reviews (
  id uuid primary key default gen_random_uuid(),
  extraction_run_id uuid not null references public.extraction_runs on delete cascade,
  researcher_id uuid not null references auth.users,
  diff jsonb not null,
  reason text not null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Defense in depth: no direct browser Data API access in v1.
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('revoke all on table public.%I from anon, authenticated', r.tablename);
  end loop;
end $$;

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
