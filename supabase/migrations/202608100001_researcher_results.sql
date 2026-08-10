-- Server-mediated participant-result storage. Browser clients never receive the service key.
create table if not exists public.participant_results (
  participant_code text primary key check (participant_code ~ '^RMW-[A-F0-9]{8}$'),
  locale text not null check (locale in ('zh-CN', 'en')),
  condition text not null check (condition in ('rmw', 'summary', 'notes', 'control')),
  task_id text not null check (task_id = 'waste'),
  status text not null default 'started' check (status in ('started', 'completed')),
  consented_at timestamptz not null,
  completed_at timestamptz,
  pre_survey jsonb,
  memo text,
  chat jsonb,
  problem_state jsonb,
  recall jsonb,
  recovery_state jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participant_result_events (
  id uuid primary key,
  participant_code text not null references public.participant_results(participant_code) on delete cascade,
  sequence_number bigint not null,
  event_type text not null,
  stage text not null,
  target_type text,
  target_id text,
  payload jsonb not null default '{}'::jsonb,
  client_timestamp timestamptz not null,
  server_timestamp timestamptz not null default now(),
  unique(participant_code, sequence_number)
);

create index if not exists participant_results_status_idx on public.participant_results(status, created_at desc);
alter table public.participant_results enable row level security;
alter table public.participant_result_events enable row level security;
revoke all on table public.participant_results from public;
revoke all on table public.participant_result_events from public;
revoke all on table public.participant_results from anon, authenticated;
revoke all on table public.participant_result_events from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update on table public.participant_results to service_role;
grant select, insert on table public.participant_result_events to service_role;
