-- Tabela de delegação de produtos para closers
CREATE TABLE IF NOT EXISTS public.user_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.closers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;

-- RLS: Todos autenticados podem ver atribuições
CREATE POLICY "Authenticated users can view user_products"
  ON public.user_products FOR SELECT TO authenticated
  USING (true);

-- RLS: Admins podem gerenciar atribuições
CREATE POLICY "Admins can manage user_products"
  ON public.user_products FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS: Managers podem gerenciar atribuições
CREATE POLICY "Managers can manage user_products"
  ON public.user_products FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'manager'));

-- Índices
CREATE INDEX idx_user_products_user_id ON public.user_products(user_id);
CREATE INDEX idx_user_products_product_id ON public.user_products(product_id);
