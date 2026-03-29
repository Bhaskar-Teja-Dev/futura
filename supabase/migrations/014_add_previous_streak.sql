-- Add previous_streak to streaks table
-- This allows Elite users to recover their streak after it has reset to 0.

alter table public.streaks 
add column if not exists previous_streak int default 0;
