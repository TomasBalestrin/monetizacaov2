-- Add Funil Intensivo specific columns to sdr_metrics
ALTER TABLE public.sdr_metrics
  ADD COLUMN IF NOT EXISTS fi_called INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fi_awaiting INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fi_received_link INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fi_got_ticket INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fi_attended INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fi_attendance_rate NUMERIC DEFAULT 0;
