
-- 1. First remove duplicates among existing empty-string funnels (keep most recent)
DELETE FROM sdr_metrics a
USING sdr_metrics b
WHERE a.sdr_id = b.sdr_id
  AND a.date = b.date
  AND a.funnel = b.funnel
  AND a.funnel = ''
  AND a.created_at < b.created_at;

-- 2. Remove duplicates where one is NULL and one is '' (keep the non-null one or most recent)
DELETE FROM sdr_metrics a
USING sdr_metrics b
WHERE a.sdr_id = b.sdr_id
  AND a.date = b.date
  AND a.funnel IS NULL
  AND b.funnel = ''
  AND a.id != b.id;

-- 3. Now remove any remaining NULL-NULL duplicates
DELETE FROM sdr_metrics a
USING sdr_metrics b
WHERE a.sdr_id = b.sdr_id
  AND a.date = b.date
  AND a.funnel IS NULL
  AND b.funnel IS NULL
  AND a.created_at < b.created_at;

-- 4. Update remaining NULL funnels to empty string
UPDATE sdr_metrics SET funnel = '' WHERE funnel IS NULL;

-- 5. Now remove any duplicates caused by step 4
DELETE FROM sdr_metrics a
USING sdr_metrics b
WHERE a.sdr_id = b.sdr_id
  AND a.date = b.date
  AND a.funnel = b.funnel
  AND a.created_at < b.created_at;

-- 6. Set NOT NULL constraint with default
ALTER TABLE sdr_metrics ALTER COLUMN funnel SET DEFAULT '';
ALTER TABLE sdr_metrics ALTER COLUMN funnel SET NOT NULL;
