create or replace function public.handle_portal_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.profiles (id, full_name, email, mobile)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''), nullif(new.raw_user_meta_data ->> 'mobile', ''))
    on conflict (id) do nothing;
    insert into public.user_roles (user_id, role) values (new.id, 'student') on conflict do nothing;
  else
    update public.profiles set email = coalesce(new.email, email), updated_at = now() where id = new.id;
  end if;
  return new;
end; $$;
comment on function public.handle_portal_user() is 'Creates student profiles only. Administrator roles require trusted out-of-band provisioning; existing roles are preserved.';
revoke execute on function public.handle_portal_user() from public, anon, authenticated;
revoke execute on function public.grant_course_access_after_approval() from public, anon, authenticated;
revoke execute on function public.has_role(uuid,text) from public;
grant execute on function public.has_role(uuid,text) to anon, authenticated, service_role;
revoke update on public.payment_requests from authenticated;
grant update (status, admin_note, reviewed_at) on public.payment_requests to authenticated;
revoke insert, delete on public.course_access from authenticated;
create or replace function public.validate_payment_request()
returns trigger language plpgsql set search_path = public as $$
declare expected_amount numeric(10,2);
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null or new.user_id <> auth.uid() then raise exception 'Payment request must belong to the signed-in student'; end if;
    select price into expected_amount from public.courses where id = new.course_id and is_active = true;
    if expected_amount is null then raise exception 'Course is not available'; end if;
    if new.amount <> expected_amount then raise exception 'Payment amount does not match current course price'; end if;
    if exists (select 1 from public.course_access where user_id=new.user_id and course_id=new.course_id) then raise exception 'Course access is already granted'; end if;
    if not exists (select 1 from storage.objects where bucket_id='payment-proofs' and name=new.screenshot_path and split_part(name,'/',1)=new.user_id::text and split_part(name,'/',2)=new.course_id::text) then raise exception 'Upload your own course payment proof first'; end if;
    new.status := 'pending'; new.admin_note := null; new.reviewed_at := null;
  else
    if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then raise exception 'Only an administrator can review payment requests'; end if;
    if old.status <> 'pending' then raise exception 'This payment has already been reviewed'; end if;
    if new.user_id is distinct from old.user_id or new.course_id is distinct from old.course_id or new.amount is distinct from old.amount or new.utr_number is distinct from old.utr_number or new.screenshot_path is distinct from old.screenshot_path then raise exception 'Submitted payment details are immutable'; end if;
    if new.status not in ('approved','rejected') then raise exception 'Choose approve or reject'; end if;
    if new.status='rejected' and coalesce(length(trim(new.admin_note)),0)=0 then raise exception 'A rejection note is required'; end if;
    new.reviewed_at := now();
  end if;
  return new;
end; $$;
create or replace function public.grant_course_access_after_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status='approved' and old.status='pending' then
    if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Administrator approval required'; end if;
    insert into public.course_access(user_id,course_id,granted_by) values(new.user_id,new.course_id,auth.uid()) on conflict(user_id,course_id) do nothing;
  end if;
  return new;
end; $$;
create policy "Students remove unsubmitted proof" on storage.objects for delete to authenticated using (bucket_id='payment-proofs' and split_part(name,'/',1)=auth.uid()::text and not exists(select 1 from public.payment_requests p where p.screenshot_path=name));
drop policy "Public can view thumbnails for active courses" on storage.objects;
create policy "Public can view thumbnails for active courses" on storage.objects for select to anon,authenticated using(bucket_id='course-thumbnails' and exists(select 1 from public.courses c where c.is_active and c.thumbnail_path=name));
drop policy "Students and admins read authorized videos" on storage.objects;
create policy "Students and admins read authorized videos" on storage.objects for select to authenticated using(bucket_id='course-videos' and (public.has_role(auth.uid(),'admin') or exists(select 1 from public.videos v join public.course_access a on a.course_id=v.course_id where a.user_id=auth.uid() and v.is_active and v.source_type='storage' and v.video_url=name)));
create policy "Students read entitled courses" on public.courses for select to authenticated using(exists(select 1 from public.course_access a where a.user_id=auth.uid() and a.course_id=courses.id));
create policy "Students read payment course details" on public.courses for select to authenticated using(exists(select 1 from public.payment_requests p where p.user_id=auth.uid() and p.course_id=courses.id));