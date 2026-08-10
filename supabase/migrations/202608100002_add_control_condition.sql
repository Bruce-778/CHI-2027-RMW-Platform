-- Add the unsupported-recall, no-recovery-aid control condition.
alter table public.participant_results
  drop constraint if exists participant_results_condition_check;

alter table public.participant_results
  add constraint participant_results_condition_check
  check (condition in ('rmw', 'summary', 'notes', 'control'));
