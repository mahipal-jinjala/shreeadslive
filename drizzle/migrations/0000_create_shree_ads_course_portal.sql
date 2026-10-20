create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null unique,
  mobile text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'student')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
grant execute on function public.has_role(uuid, text) to authenticated;

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '',
  thumbnail_path text,
  price numeric(10,2) not null default 0 check (price >= 0),
  is_active boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.courses to anon, authenticated;
grant insert, update, delete on public.courses to authenticated;
grant all on public.courses to service_role;
alter table public.courses enable row level security;

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  video_url text not null,
  source_type text not null check (source_type in ('youtube', 'storage')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.videos to authenticated;
grant all on public.videos to service_role;
alter table public.videos enable row level security;

create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  utr_number text not null check (char_length(utr_number) between 6 and 80),
  screenshot_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert on public.payment_requests to authenticated;
grant update on public.payment_requests to authenticated;
grant all on public.payment_requests to service_role;
alter table public.payment_requests enable row level security;

create table public.course_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  unique (user_id, course_id)
);
grant select, insert, delete on public.course_access to authenticated;
grant all on public.course_access to service_role;
alter table public.course_access enable row level security;

create index courses_public_listing_idx on public.courses (is_active, is_featured, created_at desc);
create index videos_course_active_idx on public.videos (course_id, is_active);
create index payment_requests_user_idx on public.payment_requests (user_id, created_at desc);
create index payment_requests_review_idx on public.payment_requests (status, created_at desc);
create unique index payment_requests_one_pending_idx on public.payment_requests (user_id, course_id) where status = 'pending';
create index course_access_user_idx on public.course_access (user_id, granted_at desc);

create or replace function public.handle_portal_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.profiles (id, full_name, email, mobile)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''), new.raw_user_meta_data ->> 'mobile')
    on conflict (id) do update set email = excluded.email, full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name), mobile = coalesce(nullif(excluded.mobile, ''), profiles.mobile), updated_at = now();
    insert into public.user_roles (user_id, role) values (new.id, 'student') on conflict do nothing;
  else
    update public.profiles set email = coalesce(new.email, email), updated_at = now() where id = new.id;
  end if;
  if new.email_confirmed_at is not null and lower(coalesce(new.email, '')) = 'shreeads.business@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created_portal after insert on auth.users for each row execute function public.handle_portal_user();
create trigger on_auth_user_confirmed_portal after update of email_confirmed_at on auth.users for each row when (new.email_confirmed_at is not null) execute function public.handle_portal_user();

create or replace function public.validate_payment_request()
returns trigger
language plpgsql
set search_path = public
as $$
declare expected_amount numeric(10,2);
begin
  if tg_op = 'INSERT' then
    if new.user_id <> auth.uid() then raise exception 'Payment request must belong to the signed-in student'; end if;
    select price into expected_amount from public.courses where id = new.course_id and is_active = true;
    if expected_amount is null then raise exception 'Course is not available'; end if;
    if new.amount <> expected_amount then raise exception 'Payment amount does not match current course price'; end if;
    new.status := 'pending';
    new.admin_note := null;
    new.reviewed_at := null;
  elsif new.user_id <> old.user_id or new.course_id <> old.course_id or new.amount <> old.amount or new.utr_number <> old.utr_number or new.screenshot_path <> old.screenshot_path or new.status <> old.status or new.admin_note is distinct from old.admin_note then
    if not public.has_role(auth.uid(), 'admin') then raise exception 'Only an administrator can review payment requests'; end if;
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;
create trigger validate_payment_request_before_write before insert or update on public.payment_requests for each row execute function public.validate_payment_request();

create or replace function public.grant_course_access_after_approval()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    insert into public.course_access (user_id, course_id, granted_by)
    values (new.user_id, new.course_id, auth.uid())
    on conflict (user_id, course_id) do nothing;
  end if;
  return new;
end;
$$;
create trigger payment_approval_grants_access after insert or update of status on public.payment_requests for each row execute function public.grant_course_access_after_approval();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger courses_updated_at before update on public.courses for each row execute function public.set_updated_at();

create policy "Profiles can read own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Students can update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Admins can manage profiles" on public.profiles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Users can read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Public can read active courses" on public.courses for select to anon, authenticated using (is_active = true or public.has_role(auth.uid(), 'admin'));
create policy "Admins can manage courses" on public.courses for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can manage videos" on public.videos for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Authorized students can read active videos" on public.videos for select to authenticated using (is_active = true and (public.has_role(auth.uid(), 'admin') or exists (select 1 from public.course_access a where a.user_id = auth.uid() and a.course_id = videos.course_id)));
create policy "Students can view own payment requests" on public.payment_requests for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Students can submit own payment requests" on public.payment_requests for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
create policy "Admins can review payment requests" on public.payment_requests for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Students can view own course access" on public.course_access for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins can grant course access" on public.course_access for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can revoke course access" on public.course_access for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "Public can view thumbnails for active courses" on storage.objects for select to anon, authenticated using (
  bucket_id = 'course-thumbnails' and exists (
    select 1 from public.courses c where c.is_active = true and c.slug = split_part(name, '/', 1) and c.thumbnail_path = name
  )
);
create policy "Admins can manage course thumbnails" on storage.objects for insert to authenticated with check (bucket_id = 'course-thumbnails' and public.has_role(auth.uid(), 'admin'));
create policy "Admins can update course thumbnails" on storage.objects for update to authenticated using (bucket_id = 'course-thumbnails' and public.has_role(auth.uid(), 'admin')) with check (bucket_id = 'course-thumbnails' and public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete course thumbnails" on storage.objects for delete to authenticated using (bucket_id = 'course-thumbnails' and public.has_role(auth.uid(), 'admin'));
create policy "Students upload own payment proof" on storage.objects for insert to authenticated with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Students and admins read payment proof" on storage.objects for select to authenticated using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin')));
create policy "Students and admins read authorized videos" on storage.objects for select to authenticated using (
  bucket_id = 'course-videos' and (
    public.has_role(auth.uid(), 'admin') or exists (
      select 1 from public.course_access a where a.user_id = auth.uid() and a.course_id::text = (storage.foldername(name))[1]
    )
  )
);
create policy "Admins upload course videos" on storage.objects for insert to authenticated with check (bucket_id = 'course-videos' and public.has_role(auth.uid(), 'admin'));
create policy "Admins update course videos" on storage.objects for update to authenticated using (bucket_id = 'course-videos' and public.has_role(auth.uid(), 'admin')) with check (bucket_id = 'course-videos' and public.has_role(auth.uid(), 'admin'));
create policy "Admins delete course videos" on storage.objects for delete to authenticated using (bucket_id = 'course-videos' and public.has_role(auth.uid(), 'admin'));
