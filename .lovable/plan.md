
# Diagnóstico e Correção do Problema de Salvamento de Métricas por Funil

## Problema Identificado

Ao analisar o banco de dados, foram encontrados registros com `funnel = ""` (vazio) misturados com registros de funis nomeados para a Clara nas mesmas datas:

- 20/02: 1 registro com `funnel = ""` — nenhum com "Mentoria Julia"
- 19/02: 1 registro com `funnel = ""`, 1 com "Mentoria Julia", 1 com "SS Julia"

Isso indica que ao tentar salvar dados no funil "Mentoria Julia" para 20/02, o formulário pode ter submetido com `funnel = ""` por alguma dessas causas:

**Causa 1 - Reset de funil ao mudar SDR**: O `useEffect` no `SDRMetricsForm` reseta o funil para `"none"` sempre que `selectedSdrId` muda. Se a página for recarregada com o SDR já pré-selecionado (`defaultSdrId`), o `useEffect` dispara uma vez e reseta o funil para `"none"` mesmo que o usuário já tivesse selecionado um funil.

**Causa 2 - Condição do useEffect frágil**: A condição `if (selectedSdrId && !defaultMetric)` não é suficiente para evitar o reset indevido no primeiro render quando o SDR vem do `defaultSdrId`.

**Causa 3 - Registros semente com funil vazio**: As tentativas anteriores de adicionar funis via insert de registros semente criaram registros com `funnel = ""` que agora aparecem na tabela e confundem a visualização.

## Alterações Planejadas

### 1. Corrigir o useEffect de reset de funil em `SDRMetricsForm.tsx`

Adicionar uma referência (`useRef`) para distinguir o **primeiro render** dos renders subsequentes, evitando que o funil seja resetado quando o SDR já vinha pré-selecionado via `defaultSdrId`:

```typescript
// Antes (problemático):
useEffect(() => {
  if (selectedSdrId && !defaultMetric) {
    form.setValue('funnel', 'none');
  }
}, [selectedSdrId]);

// Depois (corrigido):
const isFirstRender = useRef(true);
useEffect(() => {
  if (isFirstRender.current) {
    isFirstRender.current = false;
    return; // Não resetar no primeiro render
  }
  if (selectedSdrId && !defaultMetric) {
    form.setValue('funnel', 'none');
  }
}, [selectedSdrId]);
```

### 2. Tornar o campo de funil obrigatório quando há funis disponíveis

No schema Zod, modificar a validação para exigir a seleção de um funil quando o SDR tem funis cadastrados. Isso previne o envio silencioso com funil vazio.

Adicionar validação visual: se o SDR tem funis mas o usuário deixou em "Nenhum", mostrar um aviso.

### 3. Limpar registros semente com funil vazio para Clara (data operacional)

Executar operação no banco para remover os registros com `funnel = ""` que foram criados pelas tentativas anteriores de seed, para não poluir o dashboard da Clara com dados zerados/inválidos.

### 4. Verificar e corrigir o mesmo padrão no `SDRDetailPage`

Na página de detalhe, o SDR já vem pré-selecionado via prop `sdrId`, então o `defaultSdrId` é sempre passado. O useEffect dispara no mount e reseta o funil antes que o usuário consiga selecioná-lo.

## Resumo das Alterações de Código

- `src/components/dashboard/sdr/SDRMetricsForm.tsx`: Corrigir useEffect com `useRef` para evitar reset no primeiro render
- Limpeza dos registros com `funnel = ""` para Social Sellings que têm funis cadastrados (operação no banco de dados)

## Resultado Esperado

Após a correção:
- O funil selecionado pelo usuário será preservado corretamente ao submeter o formulário
- Não haverá mais registros com funil vazio criados acidentalmente quando um funil deveria ter sido selecionado
- O dashboard da Clara exibirá apenas dados válidos nos funis "Mentoria Julia" e "SS Julia"
