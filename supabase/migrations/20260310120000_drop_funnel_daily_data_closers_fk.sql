-- Drop foreign key constraint on funnel_daily_data.user_id referencing closers
-- This constraint prevents non-closer users (managers, SDRs) from inserting data via reports
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_name = 'funnel_daily_data'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'closers';

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.funnel_daily_data DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;
