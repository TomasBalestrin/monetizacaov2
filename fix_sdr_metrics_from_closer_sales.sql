-- =============================================================================
-- FIX: Creditar vendas dos closers nas métricas dos SDRs (sem duplicar)
--
-- Cobre AMBAS as fontes de dados:
--   1. funnel_daily_data (CloserFunnelForm)
--   2. metrics (SquadMetricsDialog, MetricsDialog, FinishCallDialog)
--
-- Usa GREATEST para nunca duplicar e ser seguro para rodar múltiplas vezes.
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 1: DIAGNÓSTICO
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  s.name as sdr_name,
  s.type as sdr_type,
  combined.date,
  combined.funnel_name,
  combined.total_sales     as "vendas_closer",
  combined.total_revenue   as "faturamento_closer",
  combined.total_entries   as "entradas_closer",
  COALESCE(sm.sales, 0)   as "sdr_vendas_atual",
  COALESCE(sm.revenue, 0) as "sdr_fat_atual",
  COALESCE(sm.entries, 0) as "sdr_ent_atual",
  CASE
    WHEN sm.id IS NULL THEN 'INSERIR'
    WHEN combined.total_revenue > COALESCE(sm.revenue, 0)
      OR combined.total_entries > COALESCE(sm.entries, 0)
      OR combined.total_sales > COALESCE(sm.sales, 0)
      THEN 'ATUALIZAR'
    ELSE 'OK'
  END as acao
FROM (
  SELECT sdr_id, date, funnel_name,
    SUM(total_sales)::integer as total_sales,
    SUM(total_revenue)::numeric as total_revenue,
    SUM(total_entries)::numeric as total_entries
  FROM (
    SELECT fdd.sdr_id, fdd.date, f.name as funnel_name,
      SUM(fdd.sales_count) as total_sales,
      SUM(COALESCE(fdd.sales_value, 0)) as total_revenue,
      SUM(COALESCE(fdd.entries_value, 0)) as total_entries
    FROM funnel_daily_data fdd
    JOIN funnels f ON f.id = fdd.funnel_id
    WHERE fdd.sdr_id IS NOT NULL AND fdd.sales_count > 0
    GROUP BY fdd.sdr_id, fdd.date, f.name

    UNION ALL

    SELECT m.sdr_id, m.period_start, COALESCE(f.name, ''),
      SUM(m.sales), SUM(COALESCE(m.revenue, 0)), SUM(COALESCE(m.entries, 0))
    FROM metrics m
    LEFT JOIN funnels f ON f.id = m.funnel_id
    WHERE m.sdr_id IS NOT NULL AND (m.sales > 0 OR m.revenue > 0)
    GROUP BY m.sdr_id, m.period_start, f.name
  ) src
  GROUP BY sdr_id, date, funnel_name
) combined
JOIN sdrs s ON s.id = combined.sdr_id
LEFT JOIN sdr_metrics sm
  ON sm.sdr_id = combined.sdr_id
  AND sm.date = combined.date
  AND sm.funnel = combined.funnel_name
ORDER BY s.name, combined.date;


-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 2: APLICAR CORREÇÃO
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  rec RECORD;
  existing_record RECORD;
  inserted_count INTEGER := 0;
  updated_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT sdr_id, date, funnel_name,
      SUM(total_sales)::integer as total_sales,
      SUM(total_revenue)::numeric as total_revenue,
      SUM(total_entries)::numeric as total_entries
    FROM (
      -- Fonte 1: funnel_daily_data
      SELECT fdd.sdr_id, fdd.date, f.name as funnel_name,
        SUM(fdd.sales_count) as total_sales,
        SUM(COALESCE(fdd.sales_value, 0)) as total_revenue,
        SUM(COALESCE(fdd.entries_value, 0)) as total_entries
      FROM funnel_daily_data fdd
      JOIN funnels f ON f.id = fdd.funnel_id
      WHERE fdd.sdr_id IS NOT NULL AND fdd.sales_count > 0
      GROUP BY fdd.sdr_id, fdd.date, f.name

      UNION ALL

      -- Fonte 2: metrics
      SELECT m.sdr_id, m.period_start, COALESCE(f.name, ''),
        SUM(m.sales), SUM(COALESCE(m.revenue, 0)), SUM(COALESCE(m.entries, 0))
      FROM metrics m
      LEFT JOIN funnels f ON f.id = m.funnel_id
      WHERE m.sdr_id IS NOT NULL AND (m.sales > 0 OR m.revenue > 0)
      GROUP BY m.sdr_id, m.period_start, f.name
    ) all_sources
    GROUP BY sdr_id, date, funnel_name
  LOOP
    SELECT id, sales, revenue, entries
    INTO existing_record
    FROM sdr_metrics
    WHERE sdr_id = rec.sdr_id
      AND date = rec.date
      AND funnel = rec.funnel_name
    LIMIT 1;

    IF existing_record.id IS NULL THEN
      INSERT INTO sdr_metrics (
        sdr_id, date, funnel,
        activated, scheduled, scheduled_follow_up, scheduled_same_day,
        attended, sales, revenue, entries,
        source, scheduled_rate, attendance_rate, conversion_rate
      ) VALUES (
        rec.sdr_id, rec.date, rec.funnel_name,
        0, 0, 0, 0,
        0, rec.total_sales, rec.total_revenue, rec.total_entries,
        'manual', 0, 0, 0
      );
      inserted_count := inserted_count + 1;

    ELSIF rec.total_revenue > COALESCE(existing_record.revenue, 0)
       OR rec.total_entries > COALESCE(existing_record.entries, 0)
       OR rec.total_sales > COALESCE(existing_record.sales, 0) THEN
      UPDATE sdr_metrics
      SET
        sales    = GREATEST(COALESCE(existing_record.sales, 0),   rec.total_sales),
        revenue  = GREATEST(COALESCE(existing_record.revenue, 0), rec.total_revenue),
        entries  = GREATEST(COALESCE(existing_record.entries, 0), rec.total_entries),
        updated_at = NOW()
      WHERE id = existing_record.id;
      updated_count := updated_count + 1;

    ELSE
      skipped_count := skipped_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '══════════════════════════════════════════════';
  RAISE NOTICE 'RESULTADO: % inseridos, % atualizados, % já OK',
    inserted_count, updated_count, skipped_count;
  RAISE NOTICE '══════════════════════════════════════════════';
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 3: VERIFICAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  s.name as sdr_name,
  s.type as sdr_type,
  sm.date,
  sm.funnel,
  sm.sales,
  sm.revenue,
  sm.entries
FROM sdr_metrics sm
JOIN sdrs s ON s.id = sm.sdr_id
WHERE (sm.sales > 0 OR sm.revenue > 0)
ORDER BY s.name, sm.date;
