-- Add row_mapping column to google_sheets_config table
ALTER TABLE google_sheets_config
ADD COLUMN row_mapping jsonb DEFAULT '{
  "calls": 7,
  "revenue": 10,
  "entries": 11,
  "revenueTrend": 12,
  "entriesTrend": 13,
  "sales": 14,
  "cancellations": 15,
  "cancellationValue": 16,
  "cancellationEntries": 17
}'::jsonb;