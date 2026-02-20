
# Correção da Soma Incorreta na View "Todos os Funis"

## Causa Raiz Identificada

Ao selecionar "Todos os Funis", a função `aggregateMetricsByDate` no `SDRDetailPage.tsx` soma **todos** os registros da tabela, incluindo os que têm `funnel = ""` (vazio). Esses registros com funil vazio foram criados pelo bug anterior (reset indevido do formulário) e não deveriam ser contabilizados na soma dos funis atribuídos.

**Exemplo concreto para Clara em 19/02:**
- `funnel = ""` → activated:0, scheduled:2, attended:0, sales:0
- `funnel = "Mentoria Julia"` → activated:0, scheduled:3, attended:2, sales:1
- `funnel = "SS Julia"` → activated:50, scheduled:3, attended:0, sales:0

Resultado atual (errado): activated:50, scheduled:8, attended:2, sales:1
Resultado correto: activated:50, scheduled:6, attended:2, sales:1

## Solucao

A correção é simples e precisa ser feita em dois lugares:

### 1. Filtrar registros com funnel vazio na view "Todos os Funis"

Em `SDRDetailPage.tsx`, na função `aggregateMetricsByDate` ou no bloco `displayMetrics`, excluir os registros onde `funnel === ""` antes de agregar — pois quando o SDR tem funis cadastrados, os registros com funil vazio são registros-problema do bug anterior e não devem compor a soma total.

```typescript
// Na lógica displayMetrics, ao agregar por data, filtrar funil vazio:
if (funnels && funnels.length > 1) {
  // Excluir registros sem funil atribuído quando SDR tem funis configurados
  const metricsWithFunnel = rawMetrics.filter(m => m.funnel !== '');
  return aggregateMetricsByDate(metricsWithFunnel);
}
```

### 2. Hook useSDRMetrics — filtro opcional por funnel conhecido

Complementarmente, garantir que a query ao banco já exclua registros de funnil vazio quando o SDR tem funis cadastrados. Isso torna o filtro mais robusto mesmo que o problema se repita no futuro.

### 3. Verificar o hook useSDRsWithMetrics (dashboard geral)

O `useSDRsWithMetrics` já tem um filtro `.neq('funnel', '')` que exclui corretamente os registros com funil vazio. Portanto, o dashboard geral já está correto. O problema é exclusivamente na página de detalhe do SDR.

## Alterações de Codigo

**Arquivo:** `src/components/dashboard/sdr/SDRDetailPage.tsx`

Modificar o bloco `displayMetrics` (linha 152-166) para filtrar registros com `funnel = ""` antes de agregar quando o SDR possui funis cadastrados:

```typescript
const displayMetrics = useMemo(() => {
  if (!rawMetrics) return [];
  
  if (selectedFunnel) {
    // Filter by specific funnel
    return rawMetrics.filter(m => m.funnel === selectedFunnel);
  }
  
  // When viewing all funnels and SDR has multiple funnels,
  // exclude empty-funnel records (created by the old bug) and aggregate by date
  if (funnels && funnels.length > 1) {
    const metricsWithFunnel = rawMetrics.filter(m => m.funnel !== '');
    return aggregateMetricsByDate(metricsWithFunnel);
  }
  
  return rawMetrics;
}, [rawMetrics, selectedFunnel, funnels]);
```

Esta mudança garante que:
- Quando um funil especifico esta selecionado: mostra apenas registros daquele funil (sem alteracao)
- Quando "Todos os Funis" esta selecionado e o SDR tem funis cadastrados: soma apenas os registros com funil nomeado, excluindo os registros com funil vazio criados pelo bug anterior
- Quando o SDR nao tem funis cadastrados: exibe todos os registros normalmente (sem alteracao)
