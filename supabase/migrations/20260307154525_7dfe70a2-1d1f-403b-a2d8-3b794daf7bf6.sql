
CREATE POLICY "Anyone can insert funnel_daily_data with created_by"
ON public.funnel_daily_data
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());
