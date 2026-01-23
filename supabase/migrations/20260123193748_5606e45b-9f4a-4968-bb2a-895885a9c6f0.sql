-- Habilitar realtime para tabelas de configuração de sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.google_sheets_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sdr_sheets_config;

-- Permitir que usuários autenticados vejam status de sync (para realtime funcionar)
CREATE POLICY "Authenticated users can view sync status"
  ON public.google_sheets_config FOR SELECT
  TO authenticated
  USING (true);