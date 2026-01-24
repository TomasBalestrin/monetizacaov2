

# Plano: Adicionar Edição e Exclusão de Métricas

## Objetivo

Implementar funcionalidade completa de CRUD (Create, Read, Update, Delete) nas métricas, permitindo editar e excluir registros diretamente nas tabelas de dados do closer e da squad.

## Análise da Situação Atual

### O que já existe:
| Componente | Criar | Editar | Excluir |
|------------|-------|--------|---------|
| `MetricsTable.tsx` (Admin) | ✅ | ✅ | ✅ |
| `CloserDataTable.tsx` | ❌ | ❌ | ❌ |
| `SquadMetricsDialog.tsx` | ✅ | ❌ | ❌ |

### Hooks disponíveis:
- `useCreateMetric()` ✅
- `useUpdateMetric()` ✅
- `useDeleteMetric()` ✅

## Solução Proposta

### 1. Atualizar `SquadMetricsDialog` para suportar edição

Modificar o componente para aceitar uma métrica existente e alternar entre modo de criação e edição.

```text
┌──────────────────────────────────────────────────┐
│  [Adicionar/Editar] Métrica Manual               │
├──────────────────────────────────────────────────┤
│  (formulário preenchido com dados existentes)    │
│                                                  │
│         [ Cancelar ]  [ Atualizar/Adicionar ]    │
└──────────────────────────────────────────────────┘
```

### 2. Atualizar `SquadMetricsForm` para modo de edição

- Aceitar prop `defaultMetric?: CloserMetricRecord`
- Preencher o formulário com valores existentes
- Alterar texto do botão para "Atualizar Métrica"
- Calcular o tipo de período automaticamente baseado nas datas

### 3. Adicionar ações na `CloserDataTable`

Adicionar coluna de ações com menu dropdown:

```text
| Período    | Calls | Vendas | ... | Ações |
|------------|-------|--------|-----|-------|
| 13/01-19/01|   25  |    4   | ... |  ⋮   |
                                      ├─ ✏️ Editar
                                      └─ 🗑️ Excluir
```

### 4. Criar Dialog de Confirmação de Exclusão

Reutilizar o pattern do `AlertDialog` já existente no `MetricsTable`.

## Estrutura de Arquivos

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/dashboard/SquadMetricsDialog.tsx` | Modificar | Suportar edição de métrica existente |
| `src/components/dashboard/SquadMetricsForm.tsx` | Modificar | Aceitar valores default e modo edição |
| `src/components/dashboard/closer/CloserDataTable.tsx` | Modificar | Adicionar coluna de ações (editar/excluir) |
| `src/hooks/useMetrics.ts` | Modificar | Atualizar `useUpdateMetric` para invalidar `closer-metrics` |

## Detalhes de Implementação

### SquadMetricsDialog - Suporte a Edição

```typescript
interface SquadMetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  squadSlug: string;
  defaultCloserId?: string;
  metric?: CloserMetricRecord; // Nova prop para edição
}

// No handleSubmit
if (metric?.id) {
  await updateMetric.mutateAsync({ id: metric.id, ...payload });
} else {
  await createMetric.mutateAsync(payload);
}
```

### SquadMetricsForm - Valores Default

```typescript
interface SquadMetricsFormProps {
  squadId: string;
  defaultCloserId?: string;
  defaultMetric?: CloserMetricRecord; // Dados para edição
  onSubmit: (...) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string; // "Adicionar" ou "Atualizar"
}

// Detectar tipo de período baseado nas datas
function detectPeriodType(start: Date, end: Date): PeriodType {
  const daysDiff = differenceInDays(end, start);
  if (daysDiff === 0) return 'day';
  if (daysDiff <= 7) return 'week';
  return 'month';
}
```

### CloserDataTable - Coluna de Ações

```typescript
interface CloserDataTableProps {
  metrics: CloserMetricRecord[];
  squadSlug: string; // Necessário para o dialog de edição
  onEditMetric?: (metric: CloserMetricRecord) => void;
  onDeleteMetric?: (metricId: string) => void;
}

// Nova coluna no header
<TableHead className="w-[50px]"></TableHead>

// Célula com dropdown
<TableCell>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => onEditMetric?.(metric)}>
        <Edit className="mr-2 h-4 w-4" />
        Editar
      </DropdownMenuItem>
      <DropdownMenuItem 
        className="text-destructive"
        onClick={() => onDeleteMetric?.(metric.id)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Excluir
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</TableCell>
```

### CloserDetailPage - Integração

```typescript
// Estados para controle
const [editingMetric, setEditingMetric] = useState<CloserMetricRecord>();
const [deletingMetricId, setDeletingMetricId] = useState<string | null>();

// Hooks
const deleteMetric = useDeleteMetric();

// Render
<CloserDataTable 
  metrics={metrics}
  squadSlug={squadSlug}
  onEditMetric={setEditingMetric}
  onDeleteMetric={setDeletingMetricId}
/>

{/* Edit Dialog */}
<SquadMetricsDialog
  open={!!editingMetric}
  onOpenChange={(open) => !open && setEditingMetric(undefined)}
  squadSlug={squadSlug}
  defaultCloserId={closerId}
  metric={editingMetric}
/>

{/* Delete Confirmation */}
<AlertDialog open={!!deletingMetricId}>
  ...
</AlertDialog>
```

### useMetrics - Invalidar Queries Corretamente

```typescript
export function useUpdateMetric() {
  // ...
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['metrics'] });
    queryClient.invalidateQueries({ queryKey: ['closer-metrics'] }); // Adicionar
    queryClient.invalidateQueries({ queryKey: ['squad-metrics'] }); // Adicionar
    // ...
  },
}

export function useDeleteMetric() {
  // ...
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['metrics'] });
    queryClient.invalidateQueries({ queryKey: ['closer-metrics'] }); // Adicionar
    queryClient.invalidateQueries({ queryKey: ['squad-metrics'] }); // Adicionar
    // ...
  },
}
```

## Fluxo de Edição

```text
1. Usuário clica no menu "⋮" na tabela de dados
2. Seleciona "Editar"
3. Dialog abre com dados preenchidos
4. Sistema detecta tipo de período (dia/semana/mês) automaticamente
5. Usuário modifica campos desejados
6. Submit → useUpdateMetric
7. React Query invalida caches
8. UI atualiza automaticamente
```

## Fluxo de Exclusão

```text
1. Usuário clica no menu "⋮" na tabela de dados
2. Seleciona "Excluir"
3. AlertDialog de confirmação aparece
4. Usuário confirma
5. useDeleteMetric → Supabase
6. Toast de sucesso
7. React Query invalida caches
8. Linha some da tabela
```

## Resultado Esperado

1. Menu de ações (⋮) visível em cada linha da tabela de dados do closer
2. Opção "Editar" abre dialog com dados preenchidos
3. Opção "Excluir" mostra confirmação antes de remover
4. Formulário de edição detecta automaticamente o tipo de período
5. UI atualiza em tempo real após alterações
6. Toasts informativos para ações realizadas

