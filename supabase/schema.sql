-- ==========================================================
-- NANDAN STUDIO - Supabase Database Schema
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ifazvnsxtfokswlowjrz/sql/new
-- ==========================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_boss BOOLEAN NOT NULL DEFAULT false,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Attendance Logs Table
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id TEXT PRIMARY KEY,
  emp_id TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  date TEXT NOT NULL,
  date_formatted TEXT,
  check_in_time TEXT,
  check_in_timestamp BIGINT,
  check_out_time TEXT,
  is_checked_in BOOLEAN DEFAULT false,
  total_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Deliverables Table
CREATE TABLE IF NOT EXISTS public.deliverables (
  id TEXT PRIMARY KEY,
  emp_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  timestamp TEXT,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Studio Settings Table
CREATE TABLE IF NOT EXISTS public.studio_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;

-- Allow access for public/anon key
DROP POLICY IF EXISTS "Allow public access to users" ON public.users;
CREATE POLICY "Allow public access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to attendance_logs" ON public.attendance_logs;
CREATE POLICY "Allow public access to attendance_logs" ON public.attendance_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to deliverables" ON public.deliverables;
CREATE POLICY "Allow public access to deliverables" ON public.deliverables FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to studio_settings" ON public.studio_settings;
CREATE POLICY "Allow public access to studio_settings" ON public.studio_settings FOR ALL USING (true) WITH CHECK (true);

-- Seed initial team roster
INSERT INTO public.users (id, name, role, is_boss, password)
VALUES 
  ('boss123', 'Nil Utpal', 'Creative Director & Boss', true, 'boss123'),
  ('EMP-101', 'Foyez', 'Graphic designer', false, '1234'),
  ('EMP-102', 'Alom', 'Editor-in-chief assistant', false, '1234'),
  ('EMP-103', 'Shimanto', 'Motion Animator', false, '1234'),
  ('EMP-104', 'Belal', 'Social Media Strategist & Manager', false, '1234')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, role = EXCLUDED.role;
