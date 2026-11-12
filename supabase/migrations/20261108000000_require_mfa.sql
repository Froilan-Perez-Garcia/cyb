create policy mfa_required on profiles as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');
create policy mfa_required on categories as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');
create policy mfa_required on transactions as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');
create policy mfa_required on recurring_items as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');
create policy mfa_required on debts as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');
create policy mfa_required on debt_payments as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');
create policy mfa_required on advisor_usage as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'Verificación en dos pasos requerida';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

create or replace function consume_advisor_message(max_per_day integer default 20) returns integer
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'America/Mexico_City')::date;
  used integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'Verificación en dos pasos requerida';
  end if;

  insert into advisor_usage (user_id, used_on, messages)
  values (auth.uid(), today, 1)
  on conflict (user_id, used_on)
  do update set messages = advisor_usage.messages + 1
  where advisor_usage.messages < max_per_day
  returning messages into used;

  return coalesce(used, -1);
end;
$$;
