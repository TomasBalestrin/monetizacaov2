

# Permitir edição de Relatórios para todos os gerentes, líderes e admins

## Análise Atual

- **UI**: `canManage = isAdmin || isManager` — já funciona para admins e managers
- **RLS**: As políticas de INSERT em `metrics`, `sdr_metrics` e `funnel_daily_data` já permitem inserção via `created_by = auth.uid()` (políticas permissivas/OR), então qualquer usuário autenticado pode inserir desde que defina `created_by`
- **Problema potencial**: Usuários com role `viewer` que são "líderes" não passam no check `isManager`, ficando sem acesso à edição

## Plano

### 1. Ampliar o check de permissão na UI

Em `ReportsPage.tsx`, mudar:
```ts
// De:
const canManage = isAdmin || isManager;

// Para:
const canManage = isAdmin || isManager || hasPermission('reports');
```

Isso garante que qualquer usuário com permissão no módulo `reports` (independente da role) pode editar.

### 2. Garantir RLS para todos esses usuários

As políticas já existentes cobrem o caso:
- `metrics` INSERT: `created_by = auth.uid()` ✓
- `sdr_metrics` INSERT: `created_by = auth.uid()` ✓  
- `funnel_daily_data` INSERT: manager policy `has_role('manager')` ✓

Para `funnel_daily_data`, adicionar uma política de INSERT para qualquer usuário autenticado com `created_by = auth.uid()`, cobrindo viewers com permissão `reports`.

| Arquivo | Mudança |
|---------|---------|
| `ReportsPage.tsx` | `canManage = isAdmin \|\| isManager \|\| hasPermission('reports')` |
| Migration SQL | Adicionar policy INSERT em `funnel_daily_data` para `created_by = auth.uid()` |

