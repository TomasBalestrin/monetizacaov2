
# Correção: Data Salva um Dia Antes do Selecionado

## Problema Identificado

Ao adicionar uma nova métrica, a data está sendo registrada um dia antes da data selecionada. Isso ocorre porque o `format()` do date-fns pode converter a data para UTC, causando um deslocamento de fuso horário.

Por exemplo, se o usuário seleciona **05/02/2026** às 22h no Brasil (UTC-3), a conversão para UTC resulta em **06/02/2026 01:00**, e depois o `format('yyyy-MM-dd')` pode retornar a data incorreta dependendo do contexto.

## Arquivos Afetados

1. `src/components/dashboard/sdr/SDRMetricsDialog.tsx` - Linha 34
2. `src/components/dashboard/SquadMetricsDialog.tsx` - Linhas 43-44
3. `src/components/dashboard/MetricsDialog.tsx` - Linhas 27-28
4. `src/components/dashboard/sdr/SDRMetricsForm.tsx` - Linha 102 (parsing de data ao editar)

## Solucao

Criar uma funcao utilitaria para formatar datas no formato local sem conversao UTC.

### 1. Criar funcao utilitaria em `src/lib/utils.ts`

```typescript
// Formata uma data para string 'yyyy-MM-dd' usando o timezone local
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Faz parsing de string 'yyyy-MM-dd' para Date no timezone local
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
```

### 2. Atualizar SDRMetricsDialog.tsx

```diff
- import { format } from 'date-fns';
+ import { formatDateString } from '@/lib/utils';

// Linha 34
- date: format(values.date, 'yyyy-MM-dd'),
+ date: formatDateString(values.date),
```

### 3. Atualizar SquadMetricsDialog.tsx

```diff
- import { format } from 'date-fns';
+ import { formatDateString } from '@/lib/utils';

// Linhas 43-44
- period_start: format(period.start, 'yyyy-MM-dd'),
- period_end: format(period.end, 'yyyy-MM-dd'),
+ period_start: formatDateString(period.start),
+ period_end: formatDateString(period.end),
```

### 4. Atualizar MetricsDialog.tsx

```diff
- import { format } from 'date-fns';
+ import { formatDateString } from '@/lib/utils';

// Linhas 27-28
- period_start: format(values.period_start, 'yyyy-MM-dd'),
- period_end: format(values.period_end, 'yyyy-MM-dd'),
+ period_start: formatDateString(values.period_start),
+ period_end: formatDateString(values.period_end),
```

### 5. Atualizar SDRMetricsForm.tsx (parsing ao editar)

```diff
+ import { parseDateString } from '@/lib/utils';

// Linha 102
- date: defaultMetric ? new Date(defaultMetric.date) : new Date(),
+ date: defaultMetric ? parseDateString(defaultMetric.date) : new Date(),
```

## Resultado Esperado

- A data selecionada pelo usuario sera salva exatamente como foi escolhida
- Nao havera mais deslocamento de um dia devido a conversao UTC
- O parsing de datas ao editar tambem usara o timezone local corretamente
