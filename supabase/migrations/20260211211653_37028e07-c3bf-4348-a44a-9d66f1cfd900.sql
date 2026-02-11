-- P1: Índices para queries frequentes
-- sdr_metrics: queries por sdr_id + date são as mais comuns
CREATE INDEX IF NOT EXISTS idx_sdr_metrics_sdr_date ON public.sdr_metrics(sdr_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sdr_metrics_date ON public.sdr_metrics(date DESC);

-- metrics: queries por closer_id + period
CREATE INDEX IF NOT EXISTS idx_metrics_closer_period ON public.metrics(closer_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_period ON public.metrics(period_start, period_end);

-- closers: queries by squad_id
CREATE INDEX IF NOT EXISTS idx_closers_squad ON public.closers(squad_id);

-- goals: queries by entity + month
CREATE INDEX IF NOT EXISTS idx_goals_entity_month ON public.goals(entity_type, entity_id, month);

-- user_entity_links: queries by user_id
CREATE INDEX IF NOT EXISTS idx_entity_links_user ON public.user_entity_links(user_id, entity_type);

-- module_permissions: queries by user_id
CREATE INDEX IF NOT EXISTS idx_module_perms_user ON public.module_permissions(user_id);

-- meetings: order by date
CREATE INDEX IF NOT EXISTS idx_meetings_date ON public.meetings(meeting_date DESC);

-- meeting related: by meeting_id
CREATE INDEX IF NOT EXISTS idx_meeting_notes_meeting ON public.meeting_notes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_actions_meeting ON public.meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON public.meeting_participants(meeting_id);

-- Analyze tables for query planner
ANALYZE public.sdr_metrics;
ANALYZE public.metrics;
ANALYZE public.closers;
ANALYZE public.goals;
ANALYZE public.meetings;