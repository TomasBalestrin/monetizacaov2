

# Plano: Corrigir Mapeamento do Funil "Mentoria Julia"

## Diagnóstico

O funil **"Mentoria Julia"** na planilha possui uma estrutura diferente dos outros funis:

### Estrutura atual do funil na planilha:
| Offset | Coluna | Campo |
|--------|--------|-------|
| 0 | T | Agendado |
| 1 | U | Realizado |
| 2 | V | % Comp (calculado) |
| 3 | W | Vendas |
| 4 | X | % Conv (calculado) |

### Problema
O código atual classifica "Mentoria Julia" como `social_selling`, que espera:
- Offset 0: Ativados
- Offset 2: Agendados
- Offset 5: Realizado
- Offset 7: Vendas

Como a planilha **não tem coluna Ativados** e começa direto em "Agendado", todos os valores estão sendo lidos das colunas erradas.

## Solução

Criar um novo tipo de mapeamento específico para funis sem coluna "Ativados" (como "Mentoria Julia"):

### 1. Adicionar novo tipo de offset `mentoria`

```typescript
const COLUMN_OFFSETS = {
  sdr: {
    activated: 0,
    scheduled: 1,
    scheduled_same_day: 3,
    attended: 4,
    sales: 6,
  },
  social_selling: {
    activated: 0,
    scheduled: 2,
    scheduled_same_day: 4,
    attended: 5,
    sales: 7,
  },
  mentoria: {  // NOVO - Funis sem "Ativados"
    activated: null,  // Não existe
    scheduled: 0,     // Coluna inicial
    scheduled_same_day: null, // Não existe
    attended: 1,      // +1 do scheduled
    sales: 3,         // +3 do scheduled
  },
};
```

### 2. Atualizar FUNNEL_MAPPING para usar o novo tipo

```typescript
const FUNNEL_MAPPING = [
  // ... outros funis ...
  { funnel: 'Mentoria Julia', sdr: 'Clara', type: 'mentoria' },
  { funnel: 'Mentoria julia', sdr: 'Clara', type: 'mentoria' },
  { funnel: 'Mentoria júlia', sdr: 'Clara', type: 'mentoria' },
  // ... outros funis ...
];
```

### 3. Atualizar lógica de parsing para tratar offsets nulos

```typescript
// No loop de extração de métricas
const offsets = COLUMN_OFFSETS[block.type as keyof typeof COLUMN_OFFSETS] || COLUMN_OFFSETS.sdr;

const metric: RawMetric = {
  sdr: block.sdr,
  type: block.type,
  funnel: block.funnel,
  date: parsedDate,
  activated: offsets.activated !== null 
    ? parseNumber(row[titleCol + offsets.activated]) 
    : 0,
  scheduled: parseNumber(row[titleCol + offsets.scheduled]),
  scheduled_same_day: offsets.scheduled_same_day !== null 
    ? parseNumber(row[titleCol + offsets.scheduled_same_day]) 
    : 0,
  attended: parseNumber(row[titleCol + offsets.attended]),
  sales: parseNumber(row[titleCol + offsets.sales]),
};
```

## Arquivo a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/sync-sdr-sheets/index.ts` | Modificar | Adicionar tipo `mentoria` no COLUMN_OFFSETS, atualizar FUNNEL_MAPPING, e ajustar lógica de parsing |

## Resultado Esperado

Após a correção:
1. O funil "Mentoria Julia" será processado com os offsets corretos
2. Os dados da Clara neste funil mostrarão:
   - **Activated = 0** (sempre, pois não existe na planilha)
   - **Scheduled = valor da coluna T** (ex: 4)
   - **Scheduled Same Day = 0** (não existe)
   - **Attended = valor da coluna U** (ex: 2)
   - **Sales = valor da coluna W** (ex: 0)

## Validação

Após deploy, sincronizar novamente e verificar:
- Consultar `sdr_metrics` onde `funnel = 'Mentoria Julia'`
- Comparar valores com a planilha para confirmar que estão corretos

