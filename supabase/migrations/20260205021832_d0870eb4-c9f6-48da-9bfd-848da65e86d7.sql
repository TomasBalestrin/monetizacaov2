-- Add created_by column to metrics table
ALTER TABLE public.metrics 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add created_by column to sdr_metrics table
ALTER TABLE public.sdr_metrics 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Drop existing policies for metrics
DROP POLICY IF EXISTS "Admins and managers can manage metrics" ON public.metrics;
DROP POLICY IF EXISTS "Authenticated users can view metrics" ON public.metrics;

-- Create new RLS policies for metrics
-- Admins can do everything
CREATE POLICY "Admins can manage all metrics"
ON public.metrics
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Managers can do everything
CREATE POLICY "Managers can manage all metrics"
ON public.metrics
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- All authenticated users can view metrics
CREATE POLICY "Authenticated users can view metrics"
ON public.metrics
FOR SELECT
TO authenticated
USING (true);

-- Users can update their own metrics
CREATE POLICY "Users can update their own metrics"
ON public.metrics
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Users can delete their own metrics
CREATE POLICY "Users can delete their own metrics"
ON public.metrics
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Users can insert metrics (will be linked to them)
CREATE POLICY "Users can insert metrics"
ON public.metrics
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Drop existing policies for sdr_metrics
DROP POLICY IF EXISTS "Admins and managers can manage sdr_metrics" ON public.sdr_metrics;
DROP POLICY IF EXISTS "Authenticated users can view sdr_metrics" ON public.sdr_metrics;

-- Create new RLS policies for sdr_metrics
-- Admins can do everything
CREATE POLICY "Admins can manage all sdr_metrics"
ON public.sdr_metrics
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Managers can do everything
CREATE POLICY "Managers can manage all sdr_metrics"
ON public.sdr_metrics
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- All authenticated users can view sdr_metrics
CREATE POLICY "Authenticated users can view sdr_metrics"
ON public.sdr_metrics
FOR SELECT
TO authenticated
USING (true);

-- Users can update their own sdr_metrics
CREATE POLICY "Users can update their own sdr_metrics"
ON public.sdr_metrics
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Users can delete their own sdr_metrics
CREATE POLICY "Users can delete their own sdr_metrics"
ON public.sdr_metrics
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Users can insert sdr_metrics (will be linked to them)
CREATE POLICY "Users can insert sdr_metrics"
ON public.sdr_metrics
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());