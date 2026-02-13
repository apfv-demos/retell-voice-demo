-- Call logs table for tracking demo usage and enforcing quotas
CREATE TABLE public.call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  retell_call_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'initiated'
);

-- Index for fast quota lookups: "how many calls has this user made today?"
CREATE INDEX idx_call_logs_user_day
  ON public.call_logs (user_id, started_at);

-- Enable Row Level Security
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own call logs (for quota display)
CREATE POLICY "Users can view own call logs"
  ON public.call_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Note: INSERT/UPDATE is done via the service_role key in the API route,
-- which bypasses RLS entirely. No INSERT policy needed.
