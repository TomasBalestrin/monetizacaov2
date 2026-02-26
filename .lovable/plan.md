

# Plano de Implementação — PRD Closer Intensivo v3.0

O PRD abrange 4 frentes selecionadas. Dado o tamanho, a implementação será faseada seguindo as dependências do cronograma do PRD.

---

## Fase 1: Schema SQL + Ajustes de Dados (P0) ✅ CONCLUÍDO

### 1.1 ✅ Criar tabela `funnels` (sistema centralizado de funis)
### 1.2 ✅ Criar tabela `user_funnels` (atribuição funil↔usuário)
### 1.3 ✅ Criar tabela `funnel_daily_data` (dados do closer por funil)
### 1.4 ✅ RLS policies
### 1.5 ✅ Índices
### 1.6 ✅ Migrar dados existentes de `sdr_funnels`

### 1.7 Operações de dados (pendente - requer confirmação do usuário)
- Remover SDR Dienifer do sistema (ou marcar como inativa)
- Atribuir funil "Social Selling" para Nathi via `user_funnels`

---

## Fase 2: Exclusão de Usuários (P1) ✅ CONCLUÍDO

### 2.1 ✅ Edge Function `admin-delete-user` (exclusão cascata + Auth)
### 2.2 ✅ Frontend: `DeleteUserDialog` com confirmação dupla
### 2.3 ✅ Atualizar `AdminPanel.tsx`

---

## Fase 3: Correção do Cálculo de Tendência (P1) ✅ CONCLUÍDO

### 3.1 ✅ `calculateTrend` mantido compatível, adicionado `calculateTrendDetailed`
### 3.2 ✅ `MetricCard` agora suporta prop `trendWarning` para mensagens de dados insuficientes

---

## Fase 4: Módulo de Relatórios Backend (P1) — PRÓXIMO

### 4.1 Views e RPCs no banco
### 4.2 Frontend: Página de Relatórios
### 4.3 Hooks de dados

---

## Fase 5: Cadastro Closer por Funil + Filtro (P1-P2) — PRÓXIMO

### 5.1 Reestruturar formulário de entrada de dados do Closer
### 5.2 Filtro por funil no dashboard do Closer
### 5.3 Hooks de dados
