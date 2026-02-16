

# Gerenciamento de Funis por SDR

## Problema
Atualmente, os funis de cada SDR sao descobertos dinamicamente a partir de registros existentes na tabela `sdr_metrics`. Nao existe uma interface dedicada para vincular ou desvincular funis de um SDR -- a unica forma e inserir registros semente diretamente no banco de dados.

## Solucao
Criar uma tabela dedicada `sdr_funnels` para gerenciar os funis de cada SDR, e adicionar uma interface de gerenciamento acessivel para admins e gerentes.

## Alteracoes

### 1. Banco de Dados - Nova tabela `sdr_funnels`

```text
sdr_funnels
-----------
id          uuid (PK)
sdr_id      uuid (FK -> sdrs.id, ON DELETE CASCADE)
funnel_name text (NOT NULL)
created_at  timestamptz
created_by  uuid

UNIQUE(sdr_id, funnel_name)
```

Politicas RLS:
- Admins: acesso total (ALL)
- Managers: acesso total para SDRs do seu escopo (usando `manager_can_access_sdr`)
- Usuarios autenticados: leitura (SELECT)

Migracao de dados: inserir registros na nova tabela a partir dos funis unicos ja existentes em `sdr_metrics`.

### 2. Hook `useSDRFunnels` - Atualizar fonte de dados
Modificar `src/hooks/useSdrMetrics.ts` para:
- Buscar funis da nova tabela `sdr_funnels` ao inves de extrair valores unicos de `sdr_metrics`
- Adicionar hooks `useAddSDRFunnel` e `useDeleteSDRFunnel` para criar/remover funis

### 3. Novo componente `SDRFunnelManager`
Criar `src/components/dashboard/sdr/SDRFunnelManager.tsx`:
- Dialog que exibe os funis vinculados a um SDR
- Campo de texto + botao para adicionar novo funil
- Botao de remover (icone de lixeira) ao lado de cada funil existente
- Acessivel apenas para admins e managers (verificacao via `useAuth`)

### 4. Integrar na interface existente
- No `SDRDetailPage`: adicionar botao de engrenagem/configuracao ao lado do nome do SDR para abrir o gerenciador de funis (visivel apenas para admins/managers)
- No `SDRDashboard`: opcionalmente, adicionar acesso ao gerenciador ao clicar com botao direito ou via menu no card do SDR

## Detalhes Tecnicos

O formulario de metricas (`SDRMetricsForm`) continuara usando o hook `useSDRFunnels`, que agora consultara a tabela dedicada ao inves de derivar dos dados. Isso garante que funis novos aparecam imediatamente nos seletores sem precisar de registros semente.

A migracao incluira um INSERT que popula `sdr_funnels` com todos os funis unicos ja existentes em `sdr_metrics`, garantindo que nada seja perdido.

