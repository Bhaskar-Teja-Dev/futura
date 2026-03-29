-- Add DELETE policy to contributions table
create policy "contrib_delete_own"
on public.contributions for delete
using (user_id = auth.uid());
