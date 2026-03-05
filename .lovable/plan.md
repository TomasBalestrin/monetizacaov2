

# Adicionar CRUD de Métricas na Aba Relatórios

## Situação Atual
- A aba Relatórios é **somente leitura** — exibe dados mas não permite adicionar, editar ou excluir
- O usuário `agendamento.comercial@mv4digital.com.br` (role: `manager`, permissões: `sdrs` + `reports`) precisa gerenciar métricas de SDR diretamente na aba Relatórios
- Os formulários de criação/edição já existem: `SDRMetricsDialog` para SDRs e `CloserFunnelForm` para Closers

## Plano

### 1. Botão "Adicionar Métrica" no header da ReportsPage
- Adicionar botão visível para managers/admins que abre o `SDRMetricsDialog` para inserir métricas SDR
- Usar `useAuth()` para verificar `isAdmin || isManager`

### 2. Ações de Editar/Excluir nas linhas da tabela "Por Produto"
- Na `ProductSalesTable`, adicionar coluna de ações (editar/excluir) visível apenas para managers/admins
- Como os dados vêm agregados do RPC (sem IDs individuais), a abordagem será:
  - Botão "Adicionar" no topo abre dialog de SDR metrics ou Closer funnel form
  - Não é possível editar/excluir registros individuais da tabela agregada sem navegar aos registros originais

### 3. Abordagem simplificada (recomendada)
Adicionar na ReportsPage:
- Botão **"+ Adicionar Métrica SDR"** que abre `SDRMetricsDialog` com tipo `sdr`
- Botão **"+ Adicionar Métrica Social"** que abre `SDRMetricsDialog` com tipo `social_selling`
- Esses são os dados que o usuário gerencia (permissão `sdrs`)

### Alterações técnicas

| Arquivo | Ação |
|---------|------|
| `ReportsPage.tsx` | Importar `useAuth`, `SDRMetricsDialog`, adicionar state para dialogs, botões de ação no header |
| Nenhuma mudança de DB | RLS já permite managers com permissão `sdrs` fazer CRUD em `sdr_metrics` |

### Fluxo
1. Manager abre aba Relatórios
2. Clica em "+ Adicionar Métrica" no header
3. Escolhe tipo (SDR ou Social Selling)
4. Preenche o formulário existente (`SDRMetricsForm`)
5. Dados salvos aparecem automaticamente na tabela (cache invalidado)

