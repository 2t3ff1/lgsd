-- Ensure appearance columns exist (safe to re-run)
alter table public.profiles
  add column if not exists text_color   text,
  add column if not exists card_color   text,
  add column if not exists background_color text,
  add column if not exists background_image_url text;

-- Ensure weekly_goals progress/completed columns exist
alter table public.weekly_goals
  add column if not exists progress  int not null default 0,
  add column if not exists completed boolean not null default false;
