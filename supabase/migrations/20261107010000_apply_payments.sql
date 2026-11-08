create function apply_payment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update debts
  set total_balance = greatest(total_balance - new.amount, 0),
      statement_balance = greatest(statement_balance - new.amount, 0)
  where id = new.debt_id and user_id = new.user_id;
  return new;
end;
$$;

create trigger on_debt_payment_created
after insert on debt_payments
for each row execute function apply_payment();
