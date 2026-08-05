-- Add pet_type to profiles
alter table public.profiles
  add column if not exists pet_type text;

-- Add is_working + pet_type to user_presence
alter table public.user_presence
  add column if not exists is_working boolean not null default false,
  add column if not exists pet_type text;
