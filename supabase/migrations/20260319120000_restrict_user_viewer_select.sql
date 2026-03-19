-- Restringir SELECT nas tabelas sensíveis por role
-- Closers (role "user") só veem seus próprios dados
-- SDRs (role "viewer") só veem seus próprios dados
-- Admins e managers continuam com acesso total

-- =============================================
-- CLOSERS TABLE
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view closers" ON public.closers;
DROP POLICY IF EXISTS "Admins and managers can view all closers" ON public.closers;
DROP POLICY IF EXISTS "Users can view linked closers" ON public.closers;

-- Admins e managers veem todos
CREATE POLICY "Admins and managers can view all closers"
  ON public.closers FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- Closers (role user) veem apenas seus closers linkados
CREATE POLICY "Users can view linked closers"
  ON public.closers FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'closer', id)
  );

-- =============================================
-- METRICS TABLE (closer metrics)
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view metrics" ON public.metrics;
DROP POLICY IF EXISTS "Admins and managers can view all metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can view linked closer metrics" ON public.metrics;

-- Admins e managers veem tudo
CREATE POLICY "Admins and managers can view all metrics"
  ON public.metrics FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- Closers (role user) veem apenas métricas dos seus closers
CREATE POLICY "Users can view linked closer metrics"
  ON public.metrics FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'closer', closer_id)
  );

-- =============================================
-- SDR_METRICS TABLE
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view sdr_metrics" ON public.sdr_metrics;
DROP POLICY IF EXISTS "Admins and managers can view all sdr_metrics" ON public.sdr_metrics;
DROP POLICY IF EXISTS "Viewers can view linked sdr_metrics" ON public.sdr_metrics;

-- Admins e managers veem tudo
CREATE POLICY "Admins and managers can view all sdr_metrics"
  ON public.sdr_metrics FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- SDRs (role viewer) veem apenas métricas dos seus SDRs
CREATE POLICY "Viewers can view linked sdr_metrics"
  ON public.sdr_metrics FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'viewer'::app_role)
    AND is_linked_to_entity(auth.uid(), 'sdr', sdr_id)
  );

-- =============================================
-- SDRS TABLE - manter aberto (closers precisam ver nomes no form)
-- =============================================
-- Não alterar: closers precisam ver a lista de SDRs para selecionar
-- o SDR de origem ao adicionar métricas

-- =============================================
-- GOALS TABLE - restringir para user/viewer verem apenas suas goals
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view goals" ON public.goals;
DROP POLICY IF EXISTS "Admins and managers can view all goals" ON public.goals;
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Viewers can view own goals" ON public.goals;

-- Admins e managers veem tudo
CREATE POLICY "Admins and managers can view all goals"
  ON public.goals FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- Closers veem apenas suas goals
CREATE POLICY "Users can view own goals"
  ON public.goals FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'user'::app_role)
    AND entity_type = 'closer'
    AND is_linked_to_entity(auth.uid(), 'closer', entity_id)
  );

-- SDRs veem apenas suas goals
CREATE POLICY "Viewers can view own goals"
  ON public.goals FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'viewer'::app_role)
    AND entity_type = 'sdr'
    AND is_linked_to_entity(auth.uid(), 'sdr', entity_id)
  );
