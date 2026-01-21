-- Add unique constraint for upsert on metrics
ALTER TABLE public.metrics 
ADD CONSTRAINT metrics_closer_period_unique 
UNIQUE (closer_id, period_start, period_end);