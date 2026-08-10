-- Central participant-result storage. Only server-side service-role requests may access these tables.
create table public.participant_results (
  participant_code text primary key check (participant_code ~ '^RMW-[A-F0-9]{8}$'),
  locale public.study_locale not null,
  condition public.study_condition not null,
  task_id text not null,
  status text not null default 'started' check (status in ('started','completed')),
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

create table public.participant_result_events (
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

create index participant_results_status_idx on public.participant_results(status, created_at desc);
create index participant_result_events_participant_idx on public.participant_result_events(participant_code, sequence_number);

alter table public.participant_results enable row level security;
alter table public.participant_result_events enable row level security;
revoke all on table public.participant_results from anon, authenticated;
revoke all on table public.participant_result_events from anon, authenticated;
grant all on table public.participant_results to service_role;
grant all on table public.participant_result_events to service_role;
