

# Gerente com Acesso por Modulo

## Objetivo

Garantir que o gerente so consiga editar e gerenciar dados dos modulos aos quais tem permissao. Por exemplo, um gerente com permissao `sdrs` edita todos os dados de SDR e Social Selling, mas nao consegue editar dados de Closers.

## Situacao Atual

Hoje o gerente tem acesso total (ALL) a todas as tabelas de metricas, independente das permissoes de modulo. As permissoes de modulo so controlam a navegacao na sidebar (frontend), mas no banco de dados o gerente pode modificar qualquer dado.

## O que precisa mudar

### 1. Banco de Dados - Funcao auxiliar

Criar uma funcao `manager_can_access_entity` que verifica se o gerente tem permissao de modulo para acessar uma entidade especifica:

- Para **closers**: verificar se o gerente tem permissao do slug do squad ao qual o closer pertence (ex: `eagles`, `alcateia`, `sharks`)
- Para **SDRs**: verificar se o gerente tem permissao `sdrs`

```sql
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
```

### 2. Atualizar RLS Policies

**Tabela `metrics`** - Substituir a policy de manager:

De: `has_role(auth.uid(), 'manager'::app_role)` (acesso total)

Para: `has_role(auth.uid(), 'manager'::app_role) AND manager_can_access_closer(auth.uid(), closer_id)`

**Tabela `sdr_metrics`** - Substituir a policy de manager:

De: `has_role(auth.uid(), 'manager'::app_role)` (acesso total)

Para: `has_role(auth.uid(), 'manager'::app_role) AND manager_can_access_sdr(auth.uid(), sdr_id)`

**Tabela `closers`** - Adicionar policy para manager ver apenas closers dos squads permitidos

**Tabela `sdrs`** - Manager com permissao `sdrs` pode gerenciar SDRs

**Tabela `goals`** - Permitir que managers gerenciem metas dos modulos que tem acesso (nao apenas visualizar)

### 3. Atualizar Frontend - AuthContext

Adicionar `isManager` ao contexto para uso nos componentes (ja existe no AuthContext).

### 4. Permitir que gerente tambem adicione metricas

Os botoes de "Adicionar Metrica" e acoes de editar/excluir ja estao visiveis nas paginas de detalhe. O gerente ja consegue navegar ate essas paginas via sidebar. Nenhuma mudanca de UI necessaria.

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Criar funcoes auxiliares, atualizar RLS policies |
| `src/components/dashboard/GoalsConfig.tsx` | Permitir gerentes (alem de admins) configurar metas dos seus modulos |

## Detalhes Tecnicos

### SQL Completo da Migracao

```sql
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
```

### Impacto

- Gerente de SDR: ve e edita apenas dados de SDR/Social Selling
- Gerente de Squad Eagles: ve e edita apenas dados de closers do squad Eagles
- Gerente com multiplos modulos: acesso a todos os modulos atribuidos
- Admin: continua com acesso total sem restricoes
- GoalsConfig: gerente podera definir metas para entidades dos seus modulos

