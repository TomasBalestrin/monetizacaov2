
-- =============================================
-- FASE 1: Schema SQL — funnels, user_funnels, funnel_daily_data
-- =============================================

-- 1.1 Tabela centralizada de funis
CREATE TABLE public.funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

-- RLS: Todos autenticados podem ver funis
CREATE POLICY "Authenticated users can view funnels"
  ON public.funnels FOR SELECT TO authenticated
  USING (true);

-- RLS: Admins podem gerenciar funis
CREATE POLICY "Admins can manage funnels"
  ON public.funnels FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS: Managers podem gerenciar funis
CREATE POLICY "Managers can manage funnels"
  ON public.funnels FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'manager'));

-- 1.2 Tabela de atribuição funil↔usuário
CREATE TABLE public.user_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID,
  UNIQUE(user_id, funnel_id)
);

ALTER TABLE public.user_funnels ENABLE ROW LEVEL SECURITY;

-- RLS: Todos autenticados podem ver atribuições
CREATE POLICY "Authenticated users can view user_funnels"
  ON public.user_funnels FOR SELECT TO authenticated
  USING (true);

-- RLS: Admins podem gerenciar atribuições
CREATE POLICY "Admins can manage user_funnels"
  ON public.user_funnels FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS: Managers podem gerenciar atribuições
CREATE POLICY "Managers can manage user_funnels"
  ON public.user_funnels FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'manager'));

-- 1.3 Tabela de dados diários do closer por funil
CREATE TABLE public.funnel_daily_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calls_scheduled INTEGER NOT NULL DEFAULT 0,
  calls_done INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  sales_value NUMERIC NOT NULL DEFAULT 0,
  sdr_id UUID,
  leads_count INTEGER NOT NULL DEFAULT 0,
  qualified_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(user_id, funnel_id, date, sdr_id)
);

ALTER TABLE public.funnel_daily_data ENABLE ROW LEVEL SECURITY;

-- RLS: Todos autenticados podem ver dados
CREATE POLICY "Authenticated users can view funnel_daily_data"
  ON public.funnel_daily_data FOR SELECT TO authenticated
  USING (true);

-- RLS: Admins podem gerenciar todos os dados
CREATE POLICY "Admins can manage funnel_daily_data"
  ON public.funnel_daily_data FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS: Managers podem gerenciar dados do módulo
CREATE POLICY "Managers can manage funnel_daily_data"
  ON public.funnel_daily_data FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'manager'));

-- RLS: Users podem inserir seus próprios dados
CREATE POLICY "Users can insert own funnel_daily_data"
  ON public.funnel_daily_data FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'user') AND user_id IN (
    SELECT uel.entity_id FROM public.user_entity_links uel 
    WHERE uel.user_id = auth.uid() AND uel.entity_type = 'closer'
  ) AND created_by = auth.uid());

-- RLS: Users podem atualizar seus próprios dados
CREATE POLICY "Users can update own funnel_daily_data"
  ON public.funnel_daily_data FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'user') AND created_by = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'user') AND created_by = auth.uid());

-- RLS: Users podem deletar seus próprios dados
CREATE POLICY "Users can delete own funnel_daily_data"
  ON public.funnel_daily_data FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'user') AND created_by = auth.uid());

-- 1.5 Índices
CREATE INDEX idx_funnel_daily_data_user_id ON public.funnel_daily_data(user_id);
CREATE INDEX idx_funnel_daily_data_funnel_id ON public.funnel_daily_data(funnel_id);
CREATE INDEX idx_funnel_daily_data_date ON public.funnel_daily_data(date);
CREATE INDEX idx_funnel_daily_data_sdr_id ON public.funnel_daily_data(sdr_id);
CREATE INDEX idx_user_funnels_user_id ON public.user_funnels(user_id);
CREATE INDEX idx_user_funnels_funnel_id ON public.user_funnels(funnel_id);

-- 1.6 Migrar dados existentes de sdr_funnels → funnels + user_funnels
-- Inserir funis únicos na tabela funnels
INSERT INTO public.funnels (name, category, created_by)
SELECT DISTINCT sf.funnel_name, 
  CASE 
    WHEN sf.funnel_name ILIKE '%social%' THEN 'Social Selling'
    WHEN sf.funnel_name ILIKE '%mentoria%' THEN 'Mentoria'
    WHEN sf.funnel_name ILIKE '%implementa%' THEN 'Implementação'
    ELSE 'Outro'
  END,
  sf.created_by
FROM public.sdr_funnels sf
WHERE sf.funnel_name != ''
ON CONFLICT (name) DO NOTHING;

-- Criar vínculos user_funnels para SDRs (usando sdr_id como user_id proxy)
-- Nota: sdr_id referencia a tabela sdrs, não auth.users, então usamos entity_links para mapear
INSERT INTO public.user_funnels (user_id, funnel_id, assigned_by)
SELECT sf.sdr_id, f.id, sf.created_by
FROM public.sdr_funnels sf
JOIN public.funnels f ON f.name = sf.funnel_name
WHERE sf.funnel_name != ''
ON CONFLICT (user_id, funnel_id) DO NOTHING;
