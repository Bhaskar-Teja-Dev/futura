-- Fix 2: The streaks table only had a SELECT policy.
-- contributions.ts calls supabase.from('streaks').upsert() using the user JWT,
-- so RLS blocks every write → streaks are NEVER persisted.
create policy if not exists "streaks_insert_own"
on public.streaks for insert
with check (user_id = auth.uid());

create policy if not exists "streaks_update_own"
on public.streaks for update
using (user_id = auth.uid());
