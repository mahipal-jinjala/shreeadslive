create table public.portal_settings (
  id boolean primary key default true check (id),
  upi_id text not null default 'mahipaljinjala@oksbi',
  whatsapp_number text not null default '919265106657',
  updated_at timestamptz not null default now()
);

insert into public.portal_settings (id) values (true) on conflict (id) do nothing;

alter table public.portal_settings enable row level security;
grant select on public.portal_settings to anon, authenticated;
grant update on public.portal_settings to authenticated;
grant all on public.portal_settings to service_role;

create policy "Public can read portal settings"
  on public.portal_settings for select
  to anon, authenticated
  using (true);

create policy "Admins can update portal settings"
  on public.portal_settings for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.validate_portal_settings()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.upi_id !~ '^[A-Za-z0-9._-]{2,128}@[A-Za-z0-9._-]{2,64}$' then
    raise exception 'Enter a valid UPI ID';
  end if;
  if new.whatsapp_number !~ '^[1-9][0-9]{9,14}$' then
    raise exception 'Enter a valid WhatsApp number with country code';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger validate_portal_settings_before_write
before update on public.portal_settings
for each row execute function public.validate_portal_settings();
