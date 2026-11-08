create type debt_type as enum ('tarjeta', 'prestamo', 'personal', 'otro');
create type movement_type as enum ('ingreso', 'gasto', 'extra');
create type recurrence as enum ('semanal', 'quincenal', 'mensual');
create type payoff_method as enum ('avalancha', 'bola_de_nieve', 'personalizado');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  method payoff_method not null default 'avalancha',
  buffer_percent numeric(5, 2) not null default 10 check (buffer_percent between 0 and 100),
  income_frequency recurrence not null default 'quincenal',
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  essential boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  category_id uuid references categories on delete set null,
  kind movement_type not null,
  concept text not null check (char_length(concept) between 1 and 120),
  amount numeric(12, 2) not null check (amount > 0),
  reason text check (char_length(reason) <= 60),
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table recurring_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  category_id uuid references categories on delete set null,
  kind movement_type not null check (kind in ('ingreso', 'gasto')),
  concept text not null check (char_length(concept) between 1 and 120),
  amount numeric(12, 2) not null check (amount > 0),
  frequency recurrence not null,
  next_on date not null,
  created_at timestamptz not null default now()
);

create table debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type debt_type not null,
  alias text not null check (char_length(alias) between 1 and 60),
  total_balance numeric(12, 2) not null check (total_balance >= 0),
  statement_balance numeric(12, 2) not null default 0 check (statement_balance >= 0),
  minimum_payment numeric(12, 2) not null default 0 check (minimum_payment >= 0),
  monthly_rate numeric(6, 3) not null default 0 check (monthly_rate between 0 and 100),
  cat numeric(7, 2) check (cat >= 0),
  due_day smallint check (due_day between 1 and 31),
  priority integer not null default 0,
  created_at timestamptz not null default now()
);

create table debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  debt_id uuid not null references debts on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  paid_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table advisor_usage (
  user_id uuid not null references auth.users on delete cascade,
  used_on date not null default current_date,
  messages integer not null default 0 check (messages >= 0),
  primary key (user_id, used_on)
);

create index on transactions (user_id, occurred_on desc);
create index on debts (user_id, priority);
create index on debt_payments (debt_id, paid_on desc);

alter table profiles enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table recurring_items enable row level security;
alter table debts enable row level security;
alter table debt_payments enable row level security;
alter table advisor_usage enable row level security;

create policy own_profile on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy own_categories on categories for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_transactions on transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_recurring on recurring_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_debts on debts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_payments on debt_payments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy read_own_usage on advisor_usage for select using (user_id = auth.uid());

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id);
  insert into categories (user_id, name, essential) values
    (new.id, 'Renta', true),
    (new.id, 'Comida', true),
    (new.id, 'Transporte', true),
    (new.id, 'Servicios', true),
    (new.id, 'Ocio', false),
    (new.id, 'Otros', false);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();
