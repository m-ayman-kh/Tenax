-- Tenax Database Schema
-- Run this once in your Neon SQL Editor

-- Buildings
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  slug TEXT UNIQUE,
  address TEXT,
  type TEXT NOT NULL DEFAULT 'mixed' CHECK (type IN ('residential','commercial','mixed')),
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Units
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'apartment' CHECK (type IN ('apartment','shop','office','parking')),
  floor INTEGER,
  monthly_rate NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles (linked to Clerk user IDs)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  full_name_ar TEXT,
  role TEXT NOT NULL DEFAULT 'tenant' CHECK (role IN ('super_admin','president','vice_president','treasurer','tenant')),
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  preferred_lang TEXT DEFAULT 'en' CHECK (preferred_lang IN ('en','ar')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transaction categories (customizable per building)
CREATE TABLE IF NOT EXISTS transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Revenue','Expense')),
  name_en TEXT NOT NULL,
  name_ar TEXT,
  is_default BOOLEAN DEFAULT false,
  created_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions (Treasurer only)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('Revenue','Expense')),
  category_id UUID REFERENCES transaction_categories(id) ON DELETE SET NULL,
  category TEXT,
  sub_category TEXT,
  tenant_unit TEXT,
  attachment_urls JSONB DEFAULT '[]'::jsonb,
  amount NUMERIC(12,2) NOT NULL,
  month DATE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  receipt_url TEXT,
  created_by TEXT NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES profiles(id),
  title_en TEXT,
  title_ar TEXT,
  body_en TEXT,
  body_ar TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by TEXT REFERENCES profiles(id),
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- Polls
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES profiles(id),
  question_en TEXT,
  question_ar TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  closes_at TIMESTAMPTZ,
  show_live_results BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Poll votes
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id),
  selected_option INTEGER NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Notification settings per building
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL UNIQUE REFERENCES buildings(id) ON DELETE CASCADE,
  reminder_day INTEGER DEFAULT 5 CHECK (reminder_day BETWEEN 1 AND 28),
  grace_days INTEGER DEFAULT 10,
  message_en TEXT DEFAULT 'Your monthly maintenance is due. Please contact the treasurer.',
  message_ar TEXT DEFAULT 'موعد سداد الصيانة الشهرية. يرجى التواصل مع أمين الصندوق.',
  updated_by TEXT REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default transaction categories (shared across all buildings)
INSERT INTO transaction_categories (building_id, type, name_en, name_ar, is_default) VALUES
  (NULL, 'Revenue', 'Monthly Maintenance', 'صيانة شهرية', true),
  (NULL, 'Revenue', 'Parking', 'موقف سيارات', true),
  (NULL, 'Revenue', 'Commercial Rent', 'إيجار تجاري', true),
  (NULL, 'Revenue', 'Other', 'أخرى', true),
  (NULL, 'Expense', 'Maintenance', 'صيانة', true),
  (NULL, 'Expense', 'Utilities', 'مرافق', true),
  (NULL, 'Expense', 'Security', 'أمن', true),
  (NULL, 'Expense', 'Cleaning', 'نظافة', true),
  (NULL, 'Expense', 'Other', 'أخرى', true)
ON CONFLICT DO NOTHING;
