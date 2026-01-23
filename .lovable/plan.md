
# Plano: Coletar Dados Parciais das Planilhas

## Problema Identificado

O filtro atual na Edge Function é muito restritivo:

```typescript
// Linha 428 - ATUAL
if (metrics.calls > 0 || metrics.sales > 0 || metrics.revenue > 0) {
  allMetrics.push(metrics);
}
```

Este filtro **descarta** registros onde:
- `calls = 0`, `sales = 0`, `revenue = 0`
- MAS outros campos como `entries`, `cancellationValue`, `revenueTrend` têm valores válidos

## Solução

Alterar a lógica para verificar se **qualquer métrica** tem valor maior que zero:

```typescript
// NOVO - salva se QUALQUER campo tiver valor
const hasAnyValue = 
  metrics.calls > 0 ||
  metrics.sales > 0 ||
  metrics.revenue > 0 ||
  metrics.entries > 0 ||
  metrics.revenueTrend > 0 ||
  metrics.entriesTrend > 0 ||
  metrics.cancellations > 0 ||
  metrics.cancellationValue > 0 ||
  metrics.cancellationEntries > 0;

if (hasAnyValue) {
  allMetrics.push(metrics);
}
```

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/sync-google-sheets/index.ts` | Expandir validação para incluir todos os campos |

## Antes vs Depois

| Cenário | Antes | Depois |
|---------|-------|--------|
| calls=0, sales=0, revenue=R$50.000 | ✅ Salva | ✅ Salva |
| calls=0, sales=0, revenue=0, entries=R$20.000 | ❌ Descarta | ✅ Salva |
| calls=0, sales=0, revenue=0, cancellationValue=R$5.000 | ❌ Descarta | ✅ Salva |
| Todos os campos = 0 | ❌ Descarta | ❌ Descarta |

## Resultado Esperado

- Dados parciais serão salvos mesmo que algumas métricas estejam faltando
- Se uma aba tem valor de venda mas não tem número de vendas, o valor será coletado
- Apenas registros completamente vazios (todos zeros) serão descartados
