
-- Funcao: manager pode acessar closer via squad permission
CREATE OR REPLACE FUNCTION public.manager_can_access_closer(
  _user_id uuid, _closer_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.closers c
    JOIN public.squads s ON c.squad_id = s.id
    JOIN public.module_permissions mp ON mp.user_id = _user_id AND mp.module = s.slug
    WHERE c.id = _closer_id
  )
$$;

-- Funcao: manager pode acessar sdr via module permission 'sdrs'
CREATE OR REPLACE FUNCTION public.manager_can_access_sdr(
  _user_id uuid, _sdr_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.module_permissions
    WHERE user_id = _user_id AND module = 'sdrs'
  )
$$;

-- METRICS: Atualizar policy do manager
DROP POLICY IF EXISTS "Managers can manage all metrics" ON public.metrics;
CREATE POLICY "Managers can manage module metrics"
  ON public.metrics FOR ALL
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND manager_can_access_closer(auth.uid(), closer_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'manager'::app_role)
    AND manager_can_access_closer(auth.uid(), closer_id)
  );

-- SDR_METRICS: Atualizar policy do manager
DROP POLICY IF EXISTS "Managers can manage all sdr_metrics" ON public.sdr_metrics;
CREATE POLICY "Managers can manage module sdr_metrics"
  ON public.sdr_metrics FOR ALL
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND manager_can_access_sdr(auth.uid(), sdr_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'manager'::app_role)
    AND manager_can_access_sdr(auth.uid(), sdr_id)
  );

-- GOALS: Permitir managers gerenciar metas dos seus modulos
DROP POLICY IF EXISTS "Managers can view goals" ON public.goals;
CREATE POLICY "Managers can manage module goals"
  ON public.goals FOR ALL
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND (
      (entity_type = 'closer' AND manager_can_access_closer(auth.uid(), entity_id))
      OR
      (entity_type = 'sdr' AND manager_can_access_sdr(auth.uid(), entity_id))
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'manager'::app_role)
    AND (
      (entity_type = 'closer' AND manager_can_access_closer(auth.uid(), entity_id))
      OR
      (entity_type = 'sdr' AND manager_can_access_sdr(auth.uid(), entity_id))
    )
  );
