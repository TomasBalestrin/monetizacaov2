
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  month date NOT NULL,
  metric_key text NOT NULL,
  target_value numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, month, metric_key)
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all goals"
  ON public.goals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view goals"
  ON public.goals FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can view their entity goals"
  ON public.goals FOR SELECT
  USING (
    is_linked_to_entity(auth.uid(), entity_type, entity_id)
  );

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
