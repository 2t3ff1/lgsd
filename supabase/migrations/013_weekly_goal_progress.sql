-- Weekly goal progress tracking
alter table public.weekly_goals
  add column if not exists progress int not null default 0,
  add column if not exists completed boolean not null default false;
