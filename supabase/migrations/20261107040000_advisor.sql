alter table profiles add column ai_consent boolean not null default false;

create function consume_advisor_message(max_per_day integer default 20) returns integer
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'America/Mexico_City')::date;
  used integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
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

create function refund_advisor_message() returns void
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'America/Mexico_City')::date;
begin
  update advisor_usage
  set messages = greatest(messages - 1, 0)
  where user_id = auth.uid() and used_on = today;
end;
$$;

revoke execute on function consume_advisor_message(integer) from public, anon;
revoke execute on function refund_advisor_message() from public, anon;
grant execute on function consume_advisor_message(integer) to authenticated;
grant execute on function refund_advisor_message() to authenticated;
