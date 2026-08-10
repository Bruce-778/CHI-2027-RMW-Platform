alter table public.participant_results
  drop constraint if exists participant_results_condition_check;

alter table public.participant_results
  add constraint participant_results_condition_check
  check (condition in ('rmw', 'summary', 'notes', 'control'));

alter table public.participant_results enable row level security;
alter table public.participant_result_events enable row level security;

revoke all on table public.participant_results from public;
revoke all on table public.participant_result_events from public;
revoke all on table public.participant_results from anon, authenticated;
revoke all on table public.participant_result_events from anon, authenticated;
revoke all on table public.participant_results from service_role;
revoke all on table public.participant_result_events from service_role;

grant usage on schema public to service_role;
grant select, insert, update on table public.participant_results to service_role;
grant select, insert on table public.participant_result_events to service_role;

drop index if exists public.participant_result_events_participant_idx;
