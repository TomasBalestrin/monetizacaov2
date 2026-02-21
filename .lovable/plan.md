

# Correção Definitiva: Filtro de Registros com Funil Vazio na Clara

## Problema Persistente

A correção anterior no `SDRDetailPage.tsx` adicionou um filtro para excluir registros com `funnel = ""` antes de agregar os dados. O codigo esta correto, mas pode haver dois problemas residuais:

1. **Condição `> 1` vs `>= 1`**: A condição `funnels.length > 1` deveria ser `funnels.length >= 1`. Embora Clara tenha 2 funis (e a condição funcione para ela), a mudança torna o filtro mais robusto.

2. **Dados carregados antes dos funis**: Se `rawMetrics` carrega antes de `funnels`, o `useMemo` pode retornar dados sem filtro por um instante. Embora recompute quando `funnels` chega, a solução mais robusta e filtrar diretamente na query do banco.

## Clara - Dados Atuais no Banco

Clara tem 6 registros com `funnel = ""` em fevereiro que contem dados reais e estao inflando os totais:
- 06/02: scheduled=3, attended=3, sales=1
- 14/02: activated=25, scheduled=2, attended=1, sales=10
- 17/02: activated=50, scheduled=3, attended=1
- 18/02: activated=50, scheduled=6, sales=1
- 19/02: scheduled=2
- 20/02: attended=3, scheduled=1

## Alteracoes

### 1. `src/components/dashboard/sdr/SDRDetailPage.tsx`

Mudar a condição de `funnels.length > 1` para `funnels.length >= 1`:

```typescript
if (funnels && funnels.length >= 1) {
  const metricsWithFunnel = rawMetrics.filter(m => m.funnel !== '');
  return aggregateMetricsByDate(metricsWithFunnel);
}
```

### 2. `src/hooks/useSdrMetrics.ts` - Filtro na query do banco

Adicionar um parametro opcional `excludeEmptyFunnel` ao hook `useSDRMetrics` para filtrar registros com funil vazio diretamente no banco, eliminando a dependencia do filtro client-side:

```typescript
export function useSDRMetrics(
  sdrId?: string,
  periodStart?: string,
  periodEnd?: string,
  funnel?: string | null,
  excludeEmptyFunnel?: boolean
) {
  // ... existing code ...
  if (excludeEmptyFunnel) {
    query = query.neq('funnel', '');
  }
  // ...
}
```

E na `SDRDetailPage`, passar `true` para esse parametro quando o SDR tem funis configurados.

### Resultado Esperado

- Registros com `funnel = ""` serao excluidos tanto no banco (query) quanto no client (filtro), garantindo dupla proteção
- A soma de "Todos os Funis" para Clara mostrara apenas os dados de "Mentoria Julia" + "SS Julia"
- SDRs com apenas 1 funil tambem serao protegidos (mudança de `> 1` para `>= 1`)
