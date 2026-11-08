drop function if exists refund_advisor_message();

create function refund_advisor_message(target_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'America/Mexico_City')::date;
begin
  update advisor_usage
  set messages = greatest(messages - 1, 0)
  where user_id = target_user and used_on = today;
end;
$$;

revoke execute on function refund_advisor_message(uuid) from public, anon, authenticated;
grant execute on function refund_advisor_message(uuid) to service_role;
