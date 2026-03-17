-- Add event_date to sdr_funnels for Funil Intensivo events
ALTER TABLE public.sdr_funnels
  ADD COLUMN IF NOT EXISTS event_date DATE;
