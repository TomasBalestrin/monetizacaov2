
# Correção da Tela Branca ao Adicionar Usuário

## Problema Identificado

O diálogo de criação de usuário (`CreateUserDialog.tsx`) está causando um crash do React porque os componentes `<SelectItem />` para vincular Closer e SDR possuem `value=""` (string vazia), o que é proibido pelo Radix UI Select.

**Linhas problemáticas:**
- Linha 210: `<SelectItem value="">Nenhum</SelectItem>`
- Linha 236: `<SelectItem value="">Nenhum</SelectItem>`

Este é o mesmo erro que foi corrigido anteriormente no `SDRMetricsForm.tsx`.

## Solução

1. **Substituir valores vazios por um valor placeholder válido** (ex: "none")
2. **Filtrar closers e SDRs inválidos** (sem ID válido)
3. **Ajustar a lógica de envio** para tratar "none" como undefined

## Arquivos a Modificar

- `src/components/dashboard/CreateUserDialog.tsx`

## Alterações Técnicas

```tsx
// 1. Adicionar filtragem de dados válidos
const validClosers = closers?.filter(c => c.id && c.id.trim() !== '') || [];
const validSdrs = sdrs?.filter(s => s.id && s.id.trim() !== '') || [];

// 2. Mudar defaultValues para usar "none" ao invés de ""
defaultValues: {
  // ...
  linked_closer_id: 'none',
  linked_sdr_id: 'none',
}

// 3. Ajustar onSubmit para converter "none" para undefined
linked_closer_id: data.linked_closer_id === 'none' ? undefined : data.linked_closer_id,
linked_sdr_id: data.linked_sdr_id === 'none' ? undefined : data.linked_sdr_id,

// 4. Alterar SelectItems para usar "none"
<SelectItem value="none">Nenhum</SelectItem>
```

## Resultado Esperado

O diálogo de criação de usuário abrirá corretamente e permitirá criar usuários com ou sem vínculos a entidades.
