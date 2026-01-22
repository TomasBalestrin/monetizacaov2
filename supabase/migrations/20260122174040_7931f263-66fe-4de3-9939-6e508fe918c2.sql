-- Remover a constraint antiga que impede múltiplos funis por data
ALTER TABLE sdr_metrics 
DROP CONSTRAINT IF EXISTS sdr_metrics_sdr_id_date_unique;