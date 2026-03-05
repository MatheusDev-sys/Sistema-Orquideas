-- ===============================================================
-- MathFlower Database Schema
-- ===============================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to check if a user is an admin without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. App State Table (for current_event_id)
CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::JSONB
);

-- Initialize current_event_id if not exists
INSERT INTO app_state (key, value)
VALUES ('current_event_id', jsonb_build_object('id', gen_random_uuid()))
ON CONFLICT (key) DO NOTHING;

-- 3. Orchids Table
CREATE TABLE IF NOT EXISTS orchids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold')),
  photo_urls JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Logs Table
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- CREATE, UPDATE, SOLD, DELETE, RESET_EVENT
  orchid_id UUID NULL,
  orchid_code TEXT NULL,
  orchid_name TEXT NULL,
  message TEXT NULL
);

-- ===============================================================
-- RLS Policies
-- ===============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchids ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Profiles: User can read own" ON profiles;
DROP POLICY IF EXISTS "Profiles: User can insert own" ON profiles;
DROP POLICY IF EXISTS "Profiles: User can update own" ON profiles;
DROP POLICY IF EXISTS "Profiles: Admin can read all" ON profiles;
DROP POLICY IF EXISTS "App State: Authenticated can read" ON app_state;
DROP POLICY IF EXISTS "App State: Admin can update" ON app_state;
DROP POLICY IF EXISTS "Orchids: Authenticated can read" ON orchids;
DROP POLICY IF EXISTS "Orchids: Authenticated can insert" ON orchids;
DROP POLICY IF EXISTS "Orchids: Authenticated can update" ON orchids;
DROP POLICY IF EXISTS "Orchids: Admin can delete" ON orchids;
DROP POLICY IF EXISTS "Logs: Authenticated can read" ON logs;
DROP POLICY IF EXISTS "Logs: Authenticated can insert" ON logs;
DROP POLICY IF EXISTS "Logs: Admin can delete" ON logs;

-- Profiles: User can read own, Admin can read all
CREATE POLICY "Profiles: User can read own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles: User can insert own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: User can update own" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: Admin can read all" ON profiles
  FOR ALL USING (
    public.is_admin()
  );

-- App State: Authenticated users can read, Admin can update
CREATE POLICY "App State: Authenticated can read" ON app_state
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "App State: Admin can update" ON app_state
  FOR ALL USING (
    public.is_admin()
  );

-- Orchids: Authenticated users can SELECT/INSERT/UPDATE
CREATE POLICY "Orchids: Authenticated can read" ON orchids
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Orchids: Authenticated can insert" ON orchids
  FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Orchids: Authenticated can update" ON orchids
  FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Orchids: Admin can delete" ON orchids
  FOR DELETE USING (
    public.is_admin()
  );

-- Logs: Authenticated users can SELECT/INSERT
CREATE POLICY "Logs: Authenticated can read" ON logs
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Logs: Authenticated can insert" ON logs
  FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Logs: Admin can delete" ON logs
  FOR DELETE USING (
    public.is_admin()
  );

-- ===============================================================
-- RPC: Reset Event
-- ===============================================================

CREATE OR REPLACE FUNCTION reset_event()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_old_event_id UUID;
  v_new_event_id UUID;
  v_user_id UUID;
BEGIN
  -- 1. Check if caller is admin
  v_user_id := auth.uid();
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_user_id;
  
  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: Admin only';
  END IF;

  -- 2. Get current event_id
  SELECT (value->>'id')::UUID INTO v_old_event_id FROM app_state WHERE key = 'current_event_id';
  
  -- 3. Generate new event_id
  v_new_event_id := gen_random_uuid();

  -- 4. Log the reset event (before clearing logs if needed, but we clear logs for the OLD event)
  INSERT INTO logs (event_id, user_id, action, message)
  VALUES (v_old_event_id, v_user_id, 'RESET_EVENT', 'Event reset by admin');

  -- 5. Clear orchids and logs for the old event
  -- Note: We keep the RESET_EVENT log for the old event for audit, or we can move it to a global log table if preferred.
  -- For simplicity, we just clear everything related to the old event.
  DELETE FROM orchids WHERE event_id = v_old_event_id;
  DELETE FROM logs WHERE event_id = v_old_event_id AND action != 'RESET_EVENT';

  -- 6. Update app_state with new event_id
  UPDATE app_state SET value = jsonb_build_object('id', v_new_event_id) WHERE key = 'current_event_id';

  RETURN jsonb_build_object('success', TRUE, 'new_event_id', v_new_event_id);
END;
$$;

-- ===============================================================
-- Triggers for Profile Creation
-- ===============================================================

-- Create a profile automatically when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (new.id, new.email, false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists before creating
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
