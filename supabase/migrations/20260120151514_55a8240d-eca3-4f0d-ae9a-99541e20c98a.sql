-- Primeiro, adicionar constraint unique se não existir
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Atribuir role de admin ao usuário tomasbalestrin
INSERT INTO user_roles (user_id, role)
VALUES ('9797f0f7-de08-4df0-86fe-2751adb84918', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Criar função para auto-assign de role padrão para novos usuários
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'viewer')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Criar trigger para executar após inserção de novo perfil
DROP TRIGGER IF EXISTS on_profile_created_assign_role ON profiles;
CREATE TRIGGER on_profile_created_assign_role
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_role();