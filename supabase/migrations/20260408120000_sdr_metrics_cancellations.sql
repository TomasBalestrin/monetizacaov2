-- Add cancellation tracking columns to sdr_metrics
-- SDRs will register cancellations manually via the dashboard

ALTER TABLE sdr_metrics
  ADD COLUMN IF NOT EXISTS cancellations integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_entries numeric NOT NULL DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN sdr_metrics.cancellations IS 'Number of cancellations registered by the SDR';
COMMENT ON COLUMN sdr_metrics.cancellation_value IS 'Total revenue lost from cancellations (R$)';
COMMENT ON COLUMN sdr_metrics.cancellation_entries IS 'Total entry value lost from cancellations (R$)';
