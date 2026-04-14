-- >>> TABLES CREATION
-- Global default categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('Revenue', 'Expense')) not null,
  name text not null,
  sub_categories text[],
  is_default boolean default true,
  created_at timestamptz default now()
);

-- Buildings
create table buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  config jsonb not null default '{
    "language": "en",
    "beginning_balance": 50000,
    "total_units": 20,
    "currency": "EGP",
    "expense_categories": null,
    "revenue_categories": null
  }'::jsonb,
  created_at timestamptz default now()
);

-- Building months (each building manages its own)
create table building_months (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete cascade not null,
  month date not null,
  label text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(building_id, month)
);

-- Profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  building_id uuid references buildings(id),
  role text check (role in ('bookkeeper', 'tenant')),
  unit_number text,
  created_at timestamptz default now()
);

-- Transactions
create table transactions (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) not null,
  type text check (type in ('Revenue', 'Expense')) not null,
  date date not null,
  category text not null,
  sub_category text,
  month date not null,
  tenant_unit text,
  amount numeric not null,
  notes text,
  attachment_urls text[],
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Join requests
create table join_requests (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) not null,
  email text not null,
  unit_number text,
  message text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- Insert global default categories
insert into categories (type, name, sub_categories) values
('Expense', 'Maintenance', array['Plumber','Painting','Electrical','HVAC','Cleaning','Security','Other']),
('Expense', 'Innovation', array['Landscape','Entrance','Lighting','Parking','Gym','Pool','Other']),
('Expense', 'Utilities', array['Water','Electricity','Gas','Internet','Waste','Other']),
('Expense', 'Insurance', array['Property','Liability','Other']),
('Expense', 'Taxes', array['Property Tax','Income Tax','Other']),
('Expense', 'Administrative', array['Legal','Accounting','Management','Other']),
('Revenue', 'Rent', null),
('Revenue', 'Parking', null),
('Revenue', 'Laundry', null),
('Revenue', 'Storage', null),
('Revenue', 'Late Fees', null),
('Revenue', 'Security Deposit', null),
('Revenue', 'Monthly Debt', null),
('Revenue', 'Other', null);



-- >>> CATEGORY CREATION
insert into buildings (name, slug, config) values (
  'd4b1',
  '1b',
  '{
    "language": "ar",
    "beginning_balance": 50000,
    "total_units": 20,
    "currency": "EGP",
    "expense_categories": null,
    "revenue_categories": null
  }'::jsonb
);