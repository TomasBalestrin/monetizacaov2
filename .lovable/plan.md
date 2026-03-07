

# Filtro de Produto e Visão por Closer nos Relatórios

## Contexto Atual
- A página de Relatórios já tem filtro por funil, mas **não mostra detalhamento por Closer**
- Os dados de SDRs (`sdr_metrics`) têm campo `funnel` preenchido com dados reais (15+ combinações SDR/funil)
- A tabela `funnel_daily_data` (dados de Closers por funil) está **vazia** — os Closers usam o formulário `CloserFunnelForm` mas ainda não inseriram dados
- Os RPCs `get_all_funnels_summary` e `get_funnel_report` já cruzam dados de Closers + SDRs

## O que será implementado

### 1. Nova aba "Por Produto" na página de Relatórios
Adicionar um sistema de abas (Tabs) na ReportsPage:
- **Visão Geral** (atual): cards totais + tabela de funis + gráfico
- **Por Produto**: tabela cruzada mostrando cada Closer/SDR e suas vendas por funil/produto

### 2. Tabela cruzada Closer × Produto
Uma nova seção com:
- Filtro de produto (funnel) no topo
- Tabela com colunas: Nome, Tipo (Closer/SDR), e para cada produto selecionado: Vendas, Faturamento
- Dados vindos de `funnel_daily_data` (Closers) e `sdr_metrics` (SDRs)
- Totalização por linha e por coluna

### 3. Novo RPC para dados por pessoa × produto
Criar uma function SQL `get_sales_by_person_and_product` que:
- Busca de `funnel_daily_data` agrupando por `user_id` + `funnel_id` (Closers)
- Busca de `sdr_metrics` agrupando por `sdr_id` + `funnel` (SDRs)
- Retorna: nome, tipo (closer/sdr), funnel_name, total_sales, total_revenue
- Filtrável por período

### 4. Garantir fluxo de dados dos usuários
- O `CloserFunnelForm` já insere em `funnel_daily_data` corretamente
- O `SDRMetricsForm` já insere em `sdr_metrics` com campo `funnel`
- Os RPCs de relatório já leem ambas as tabelas
- Verificar que o hook `useAllFunnelsSummary` invalida cache ao inserir dados novos (já faz via `queryClient.invalidateQueries`)

## Alterações técnicas

| Tipo | Arquivo | Ação |
|------|---------|------|
| DB | Migration | Criar RPC `get_sales_by_person_and_product(p_period_start, p_period_end)` |
| Hook | `src/hooks/useFunnels.ts` | Adicionar `useSalesByPersonAndProduct()` |
| UI | `src/components/dashboard/reports/ReportsPage.tsx` | Adicionar Tabs (Visão Geral / Por Produto) |
| UI | `src/components/dashboard/reports/ProductSalesTable.tsx` | Novo componente com tabela cruzada e filtro de produto |

## Estrutura do RPC

```text
get_sales_by_person_and_product(p_period_start, p_period_end)
  → UNION de:
    1. funnel_daily_data JOIN closers JOIN funnels
       → person_name, person_type='closer', funnel_name, sales, revenue
    2. sdr_metrics JOIN sdrs (funnel != '')
       → person_name, person_type='sdr', funnel_name, sales, revenue=0
  → GROUP BY person + funnel
  → ORDER BY person_name, funnel_name
```

