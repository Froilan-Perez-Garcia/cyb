create function next_occurrence(d date, f recurrence) returns date
language plpgsql immutable as $$
declare
  month_end date := (date_trunc('month', d) + interval '1 month - 1 day')::date;
begin
  if f = 'semanal' then
    return d + 7;
  elsif f = 'mensual' then
    return (d + interval '1 month')::date;
  elsif extract(day from d) <= 15 then
    return least(d + 15, month_end);
  else
    return (date_trunc('month', d) + interval '1 month')::date + (extract(day from d)::int - 16);
  end if;
end;
$$;

create function generate_recurring() returns integer
language plpgsql as $$
declare
  item recurring_items;
  today date := (now() at time zone 'America/Mexico_City')::date;
  created integer := 0;
  guard integer;
begin
  for item in
    select * from recurring_items
    where user_id = auth.uid() and next_on <= today
    for update
  loop
    guard := 0;
    while item.next_on <= today and guard < 366 loop
      insert into transactions (user_id, category_id, kind, concept, amount, occurred_on)
      values (item.user_id, item.category_id, item.kind, item.concept, item.amount, item.next_on);
      item.next_on := next_occurrence(item.next_on, item.frequency);
      created := created + 1;
      guard := guard + 1;
    end loop;
    update recurring_items set next_on = item.next_on where id = item.id;
  end loop;
  return created;
end;
$$;
