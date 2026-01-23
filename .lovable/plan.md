
# Plano: Sincronização Individual por Squad

## Visão Geral

Reorganizar a arquitetura de sincronização para permitir que cada Squad (Eagles, Alcateia, Sharks) tenha sua própria configuração de planilha e botão de sincronização individual. A coluna de dados será atualizada de G para **H** (Total da Semana).

## Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────────┐
│                     ANTES (Global)                              │
├─────────────────────────────────────────────────────────────────┤
│  google_sheets_config (1 registro global)                       │
│         ↓                                                       │
│  sync-google-sheets → Sincroniza TODOS os closers              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     DEPOIS (Por Squad)                          │
├─────────────────────────────────────────────────────────────────┤
│  squad_sheets_config (1 registro por squad)                     │
│     - Eagles: spreadsheet_id, column: H, row_mapping            │
│     - Alcateia: spreadsheet_id, column: H, row_mapping          │
│     - Sharks: spreadsheet_id, column: H, row_mapping            │
│         ↓                                                       │
│  sync-squad-sheets?squad=eagles → Sincroniza só Eagles         │
│  sync-squad-sheets?squad=alcateia → Sincroniza só Alcateia     │
│  sync-squad-sheets?squad=sharks → Sincroniza só Sharks         │
└─────────────────────────────────────────────────────────────────┘
```

## Alterações Necessárias

### 1. Banco de Dados - Nova Tabela

Criar tabela `squad_sheets_config` para configurações por squad:

```sql
CREATE TABLE squad_sheets_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  spreadsheet_id TEXT NOT NULL,
  spreadsheet_name TEXT,
  row_mapping JSONB DEFAULT '{"column": "H", "firstBlockStartRow": 5, "blockOffset": 13, "numberOfBlocks": 4}',
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  sync_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(squad_id)
);

-- RLS policies
ALTER TABLE squad_sheets_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can manage squad sheets config"
  ON squad_sheets_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );
```

### 2. Edge Function - sync-squad-sheets

Criar nova Edge Function que sincroniza um squad específico:

| Parâmetro | Descrição |
|-----------|-----------|
| `squad` | Slug do squad (eagles, alcateia, sharks) |

**Fluxo:**
1. Recebe o slug do squad via query param ou body
2. Busca configuração específica do squad em `squad_sheets_config`
3. Busca apenas os closers daquele squad
4. Processa apenas as abas correspondentes aos closers do squad
5. Salva métricas e atualiza status do squad

### 3. Frontend - Hook useSquadSheetsConfig

```typescript
// src/hooks/useSquadSheetsConfig.ts

export function useSquadSheetsConfig(squadSlug: string) {
  return useQuery({
    queryKey: ['squad-sheets-config', squadSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('squad_sheets_config')
        .select('*, squads!inner(slug)')
        .eq('squads.slug', squadSlug)
        .maybeSingle();
      // ...
    },
  });
}

export function useSyncSquadSheets(squadSlug: string) {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-squad-sheets', {
        body: { squad: squadSlug }
      });
      // ...
    },
  });
}
```

### 4. Frontend - Componente SquadSheetsConfig

Componente para configurar e sincronizar planilha do squad:

```typescript
// src/components/dashboard/SquadSheetsConfig.tsx

interface SquadSheetsConfigProps {
  squadSlug: string;
  variant?: 'prominent' | 'compact';
}

export function SquadSheetsConfig({ squadSlug, variant = 'compact' }: SquadSheetsConfigProps) {
  // Renderiza UI para conectar planilha
  // Botão de sincronização
  // Status da última sincronização
}
```

### 5. SquadPage - Integração

Adicionar o componente de configuração e botão de sincronização na página do squad:

```typescript
// src/components/dashboard/SquadPage.tsx

export function SquadPage({ squadSlug }: SquadPageProps) {
  return (
    <div className="space-y-8">
      {/* Header com título e botão de sync */}
      <div className="flex items-center justify-between">
        <h1>Squad {squad.name}</h1>
        <SquadSyncButton squadSlug={squadSlug} />
      </div>
      
      {/* Configuração da planilha (se não conectada) */}
      <SquadSheetsConfig squadSlug={squadSlug} variant="compact" />
      
      {/* Resto do conteúdo */}
    </div>
  );
}
```

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| **Migração SQL** | Criar | Tabela `squad_sheets_config` com RLS |
| `supabase/functions/sync-squad-sheets/index.ts` | Criar | Edge Function para sync por squad |
| `src/hooks/useSquadSheetsConfig.ts` | Criar | Hook para gerenciar config por squad |
| `src/components/dashboard/SquadSheetsConfig.tsx` | Criar | UI de configuração por squad |
| `src/components/dashboard/SquadSyncButton.tsx` | Criar | Botão de sync compacto |
| `src/components/dashboard/SquadPage.tsx` | Modificar | Integrar componentes de sync |
| `supabase/config.toml` | Modificar | Adicionar nova Edge Function |

## Configuração Padrão (Coluna H)

Todas as configurações usarão por padrão:

```json
{
  "column": "H",
  "firstBlockStartRow": 5,
  "blockOffset": 13,
  "numberOfBlocks": 4,
  "dateRow": 1,
  "metrics": {
    "calls": 0,
    "sales": 1,
    "revenue": 3,
    "entries": 4,
    "revenueTrend": 5,
    "entriesTrend": 6,
    "cancellations": 7,
    "cancellationValue": 9,
    "cancellationEntries": 10
  }
}
```

## Interface do Usuário

### Página do Squad (ex: Eagles)

```text
┌─────────────────────────────────────────────────────────────────┐
│  Squad Eagles                          [🔄 Sincronizar] [⚙️]   │
├─────────────────────────────────────────────────────────────────┤
│  📊 Planilha conectada • Última sync: 23/01 15:30 ✅            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ Valor de Venda  │  │ Valor Entrada   │                       │
│  │ R$ 156.391      │  │ R$ 45.200       │                       │
│  └─────────────────┘  └─────────────────┘                       │
│                                                                 │
│  Closers:                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                         │
│  │ Deyvid   │ │ Carlos   │ │ Hannah   │                         │
│  └──────────┘ └──────────┘ └──────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### Quando Não Conectado

```text
┌─────────────────────────────────────────────────────────────────┐
│  Squad Alcateia                                                 │
├─────────────────────────────────────────────────────────────────┤
│  📄 Conectar Google Sheets                                      │
│                                                                 │
│  Cole o ID ou URL da planilha do Squad Alcateia                 │
│  ┌────────────────────────────────┐ [Conectar]                  │
│  │ https://docs.google.com/...   │                              │
│  └────────────────────────────────┘                             │
│                                                                 │
│  [?] Como configurar?                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Nenhum dado disponível. Conecte uma planilha para começar.     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Benefícios

1. **Flexibilidade**: Cada squad pode ter sua própria planilha ou aba
2. **Independência**: Sincronização de um squad não afeta os outros
3. **Debugging**: Logs específicos por squad facilitam identificar problemas
4. **Escalabilidade**: Fácil adicionar novos squads no futuro
5. **Coluna H**: Dados do total semanal corretos

## Migração de Dados

O código da Edge Function existente (`sync-google-sheets`) será mantido para compatibilidade com o cron job, mas o Dashboard global será atualizado para usar a nova arquitetura quando disponível.
