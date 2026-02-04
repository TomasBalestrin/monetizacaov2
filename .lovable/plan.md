

# Plano: Inserção Manual de Dados e Vínculo de Usuários

## Contexto

O sistema precisa permitir:
1. Inserção manual de métricas para SDRs e Social Selling (já existe para Closers)
2. Vincular usuários do sistema a entidades (Closer ou SDR) para controle de acesso
3. Ex: Usuário "Deyvid" vinculado ao Closer "Deyvid" só pode ver/editar seus próprios dados

---

## 1. Alterações no Banco de Dados

### 1.1 Nova Tabela: `user_entity_links`

Vincula profiles a closers ou SDRs:

```sql
CREATE TABLE user_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('closer', 'sdr')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entity_type, entity_id)
);

-- Índices
CREATE INDEX idx_user_entity_links_user ON user_entity_links(user_id);
CREATE INDEX idx_user_entity_links_entity ON user_entity_links(entity_type, entity_id);

-- RLS
ALTER TABLE user_entity_links ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Admins can manage entity links"
  ON user_entity_links FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own links"
  ON user_entity_links FOR SELECT
  USING (user_id = auth.uid());
```

### 1.2 Hooks para SDR Metrics CRUD

Adicionar mutations no `useSdrMetrics.ts`:
- `useCreateSDRMetric`
- `useUpdateSDRMetric`  
- `useDeleteSDRMetric`

---

## 2. Componentes de UI

### 2.1 SDRMetricsDialog (Novo)

Formulário para inserção manual de métricas SDR/Social Selling:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| sdr_id | Select | SDR do dropdown |
| date | DatePicker | Data da métrica |
| funnel | Text (opcional) | Nome do funil |
| activated | Number | Leads ativados |
| scheduled | Number | Agendados |
| scheduled_same_day | Number | Agendados no mesmo dia |
| attended | Number | Realizados |
| sales | Number | Vendas |

### 2.2 SDRMetricsForm (Novo)

Similar ao `SquadMetricsForm`, com campos específicos para SDR.

### 2.3 Atualização do SDRDashboard

Adicionar botão "Adicionar Métrica" no header igual ao SquadPage.

### 2.4 Vínculo de Usuário no Admin Panel

Novo campo no `CreateUserDialog` e lista de usuários:
- Dropdown: "Vincular a Closer" (lista closers)
- Dropdown: "Vincular a SDR" (lista SDRs)

---

## 3. Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/dashboard/sdr/SDRMetricsForm.tsx` | **Criar** - Formulário para métricas SDR |
| `src/components/dashboard/sdr/SDRMetricsDialog.tsx` | **Criar** - Dialog wrapper |
| `src/hooks/useSdrMetrics.ts` | **Modificar** - Adicionar CRUD mutations |
| `src/components/dashboard/sdr/SDRDashboard.tsx` | **Modificar** - Adicionar botão e dialog |
| `src/components/dashboard/sdr/SDRDetailPage.tsx` | **Modificar** - Adicionar edição inline |
| `src/hooks/useUserEntityLinks.ts` | **Criar** - Hook para vínculos |
| `src/components/dashboard/CreateUserDialog.tsx` | **Modificar** - Adicionar seletor de vínculo |
| `src/components/dashboard/AdminPanel.tsx` | **Modificar** - Exibir vínculos na lista |
| Edge Function `admin-create-user` | **Modificar** - Criar vínculo ao criar usuário |

---

## 4. Fluxo de Trabalho

### 4.1 Criar Usuário Vinculado

```text
Admin Panel → Novo Usuário → Preenche dados + Seleciona Closer "Deyvid"
    ↓
Edge Function cria:
  1. auth.users (email/senha)
  2. profiles (trigger)
  3. user_roles (role)
  4. module_permissions (permissões)
  5. user_entity_links (closer_id = Deyvid)
```

### 4.2 Inserção Manual SDR

```text
SDR Dashboard → "+ Adicionar Métrica" → Dialog abre
    ↓
Usuário preenche: SDR, Data, Funil, Ativados, Agendados...
    ↓
Submit → useCreateSDRMetric → sdr_metrics (source: 'manual')
```

---

## 5. Lógica de Acesso (Fase Futura)

Para restringir que usuários só vejam seus próprios dados:

1. Hook `useCurrentUserLinks()` retorna os entity_ids vinculados
2. Filtrar queries de métricas por entity_id
3. RLS policies opcionais para reforçar no banco

**Nota**: Esta fase inicial foca na estrutura de vínculo. A restrição de acesso pode ser implementada posteriormente.

---

## Diagrama de Relacionamentos

```text
┌────────────┐       ┌───────────────────┐       ┌──────────┐
│  profiles  │──────▶│ user_entity_links │◀──────│ closers  │
│  (user_id) │       │ entity_type='closer'     │ (id)     │
└────────────┘       │ entity_id              │  └──────────┘
                     └───────────────────┘
                              │
                              ▼
                     ┌──────────┐
                     │   sdrs   │
                     │   (id)   │
                     └──────────┘
```

---

## Ordem de Implementação

1. Migração do banco (tabela `user_entity_links`)
2. Hook `useUserEntityLinks.ts`
3. Componentes SDR (`SDRMetricsForm`, `SDRMetricsDialog`)
4. Atualizar `useSdrMetrics.ts` com CRUD
5. Integrar dialog no `SDRDashboard` e `SDRDetailPage`
6. Atualizar `CreateUserDialog` com seletor de vínculo
7. Modificar edge function `admin-create-user`
8. Exibir vínculos no `AdminPanel`

