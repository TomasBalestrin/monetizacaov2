
# Melhorias na Tabela de Dados SDR e Seletor de Funil

## Problema Atual

1. **Tabela de Dados Detalhados (SDRDataTable)**: Não possui botões de ação para editar ou excluir as métricas inseridas manualmente
2. **Formulário de Métricas SDR**: O campo de funil é um input de texto livre, quando deveria mostrar automaticamente os funis vinculados ao SDR selecionado

## Solução Proposta

### 1. Adicionar Ações de Editar/Excluir na SDRDataTable

Baseado no padrão já implementado em `CloserDataTable.tsx`, vou adicionar:
- Coluna de ações com menu dropdown
- Opção de "Editar" que abre o dialog de edição
- Opção de "Excluir" com confirmação
- Props opcionais `onEditMetric` e `onDeleteMetric`

### 2. Alterar Campo de Funil para Select com Opções do SDR

Ao invés de um input de texto livre, o campo de funil será um Select que:
- Busca os funis disponíveis para o SDR selecionado usando `useSDRFunnels`
- Atualiza automaticamente quando o SDR selecionado muda
- Permite adicionar um funil novo (opção "Outro...")
- Mostra placeholder informativo enquanto nenhum SDR está selecionado

## Arquivos a Modificar

1. `src/components/dashboard/sdr/SDRDataTable.tsx` - Adicionar coluna de ações
2. `src/components/dashboard/sdr/SDRMetricsForm.tsx` - Mudar input para Select com funis do SDR
3. `src/components/dashboard/sdr/SDRDetailPage.tsx` - Integrar handlers de editar/excluir
4. `src/components/dashboard/sdr/SDRMetricsDialog.tsx` - Suportar modo de edição
5. `src/components/dashboard/sdr/index.ts` - Exportar novos componentes se necessário

## Detalhes Técnicos

### SDRDataTable.tsx

```tsx
interface SDRDataTableProps {
  metrics: SDRMetric[];
  showFunnelColumn?: boolean;
  onEditMetric?: (metric: SDRMetric) => void;
  onDeleteMetric?: (metricId: string) => void;
}

// Adicionar coluna de ações similar ao CloserDataTable
{hasActions && (
  <TableCell>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEditMetric?.(metric)}>
          <Edit className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDeleteMetric?.(metric.id)}>
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </TableCell>
)}
```

### SDRMetricsForm.tsx

```tsx
// Observar mudança no sdr_id e buscar funis
const selectedSdrId = form.watch('sdr_id');
const { data: sdrFunnels, isLoading: isLoadingFunnels } = useSDRFunnels(selectedSdrId);

// Mudar Input para Select
<FormField
  control={form.control}
  name="funnel"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Funil</FormLabel>
      <Select onValueChange={field.onChange} value={field.value || ''}>
        <SelectTrigger>
          <SelectValue placeholder={
            !selectedSdrId 
              ? "Selecione um SDR primeiro" 
              : isLoadingFunnels 
                ? "Carregando funis..." 
                : "Selecione o funil"
          } />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Nenhum</SelectItem>
          {sdrFunnels?.map((funnel) => (
            <SelectItem key={funnel} value={funnel}>{funnel}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

### SDRMetricsDialog.tsx

Atualizar para suportar modo de edição:

```tsx
interface SDRMetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sdrType: 'sdr' | 'social_selling';
  defaultSdrId?: string;
  editingMetric?: SDRMetric; // Nova prop para edição
}
```

### SDRDetailPage.tsx

Adicionar estados e handlers para gerenciar edição/exclusão:

```tsx
const [editingMetric, setEditingMetric] = useState<SDRMetric | null>(null);
const [deletingMetricId, setDeletingMetricId] = useState<string | null>(null);

// Dialog de edição e confirmação de exclusão
<SDRMetricsDialog
  open={!!editingMetric}
  editingMetric={editingMetric}
  ...
/>

<AlertDialog open={!!deletingMetricId}>
  ...confirmação de exclusão...
</AlertDialog>
```

## Funis por SDR (Dados Atuais)

| SDR | Tipo | Funis Disponíveis |
|-----|------|-------------------|
| Carlos | SDR | Implementação Carlos |
| Dienifer | SDR | Implementação Dienifer |
| Jaque | SDR | MPM, Teste |
| Nathali | SDR | 50 Scripts, Orgânico Cleiton |
| Clara | Social Selling | Mentoria Julia, SS Julia |
| Thalita | Social Selling | SS Cleiton |

## Resultado Esperado

1. **Tabela de Dados**: Cada linha terá um menu de ações (⋮) com opções "Editar" e "Excluir"
2. **Edição**: Abre dialog preenchido com os dados existentes para modificação
3. **Exclusão**: Mostra confirmação antes de remover a métrica
4. **Seletor de Funil**: Ao selecionar um SDR, o campo de funil mostra automaticamente apenas os funis vinculados a esse SDR
