
# Correção: Erro ao Salvar Métrica SDR

## Problema

Quando o usuário tenta salvar uma métrica manual, o sistema faz um `INSERT` simples. Se já existe um registro para a mesma combinação (SDR + data + funil), o banco de dados rejeita com erro de violação de constraint única.

Além disso, quando o funil é "Nenhum", o valor salvo é `NULL`, e o PostgreSQL permite múltiplos NULLs na constraint única, gerando duplicatas.

## Solução

### 1. Usar UPSERT ao invés de INSERT

Alterar o `useCreateSDRMetric` em `src/hooks/useSdrMetrics.ts` para usar `.upsert()` com `onConflict: 'sdr_id,date,funnel'`. Isso faz com que, se o registro já existir, ele seja sobrescrito automaticamente.

### 2. Converter funil NULL para string vazia

Alterar a constraint única para usar `COALESCE(funnel, '')` via um unique index funcional, OU garantir que o funil nunca seja NULL (usar string vazia '' ao invés de null). Isso previne duplicatas.

### 3. Limpar duplicatas existentes

Remover registros duplicados com funil NULL que já existem no banco.

## Alteracoes Tecnicas

### Arquivo: `src/hooks/useSdrMetrics.ts` - useCreateSDRMetric

Trocar `.insert()` por `.upsert()` com `onConflict`:

```typescript
const { data, error } = await supabase
  .from('sdr_metrics')
  .upsert({
    ...metric,
    funnel: metric.funnel || '',  // Nunca salvar NULL
    scheduled_rate,
    attendance_rate,
    conversion_rate,
    created_by: user?.id,
  }, {
    onConflict: 'sdr_id,date,funnel',
  })
  .select()
  .single();
```

### Arquivo: `src/hooks/useSdrMetrics.ts` - useUpdateSDRMetric

Garantir que o funil nunca seja NULL no update tambem:

```typescript
if (updates.funnel === null || updates.funnel === undefined) {
  updates.funnel = '';
}
```

### Arquivo: `src/components/dashboard/sdr/SDRMetricsDialog.tsx`

Garantir que o funil enviado nunca seja null:

```typescript
funnel: values.funnel || '',  // Trocar de || null para || ''
```

### Migracao de Banco de Dados

1. Atualizar registros existentes com funil NULL para string vazia:
```sql
UPDATE sdr_metrics SET funnel = '' WHERE funnel IS NULL;
```

2. Remover duplicatas (manter apenas o mais recente):
```sql
DELETE FROM sdr_metrics a
USING sdr_metrics b
WHERE a.sdr_id = b.sdr_id
  AND a.date = b.date
  AND COALESCE(a.funnel, '') = COALESCE(b.funnel, '')
  AND a.created_at < b.created_at;
```

3. Atualizar registros restantes com funil NULL:
```sql
UPDATE sdr_metrics SET funnel = '' WHERE funnel IS NULL;
```

4. Adicionar constraint NOT NULL com default:
```sql
ALTER TABLE sdr_metrics ALTER COLUMN funnel SET DEFAULT '';
ALTER TABLE sdr_metrics ALTER COLUMN funnel SET NOT NULL;
```

### Arquivos que precisam garantir funil = '' ao invés de NULL

- `src/hooks/useSdrMetrics.ts` (create e update mutations)
- `src/components/dashboard/sdr/SDRMetricsDialog.tsx` (handleSubmit)
- `supabase/functions/sync-sdr-sheets/index.ts` (se enviar funnel como null)

### Queries de leitura que filtram por funil

Atualizar os hooks que usam `.not('funnel', 'is', null)` para `.neq('funnel', '')`:
- `useSDRFunnels` - filtrar funis nao vazios
- `useSDRTotalMetrics` - metricas agregadas
- `useSDRsWithMetrics` - SDRs com metricas

## Resultado Esperado

- Salvar uma metrica manual nunca gera erro, mesmo se ja existir um registro para a mesma combinacao
- O registro existente e sobrescrito (upsert)
- Nao ha mais duplicatas com funil vazio/null
- As agregacoes funcionam corretamente sem contar duplicatas
