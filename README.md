# Monetização — Dashboard de Vendas

Sistema de gestão e acompanhamento de métricas comerciais para equipes de vendas (Closers e SDRs), com controle de metas, reuniões e relatórios por funil.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estilização | Tailwind CSS + shadcn/ui |
| Estado/Cache | TanStack React Query |
| Backend | Lovable Cloud (Supabase) |
| Auth | Supabase Auth (email/senha) |
| Realtime | Supabase Realtime (postgres_changes) |
| PWA | vite-plugin-pwa + Service Worker |

---

## Autenticação e Autorização

### Roles (tabela `user_roles`)
| Role | Descrição |
|------|-----------|
| `admin` | Acesso total a todos os módulos e funcionalidades |
| `manager` | Acesso aos módulos vinculados + metas + reuniões |
| `viewer` | Acesso somente leitura aos módulos permitidos |
| `user` | Acesso restrito ao dashboard pessoal (UserDashboard) |

### Permissões por Módulo (tabela `module_permissions`)
Cada usuário pode ter acesso individual aos módulos: `dashboard`, `eagles`, `sharks`, `sdrs`, `reports`, `admin`.

### Vínculos de Entidade (tabela `user_entity_links`)
Usuários podem ser vinculados a Closers e/ou SDRs específicos para acesso granular.

### Segurança
- Row Level Security (RLS) em todas as tabelas
- Funções `has_role()`, `has_module_permission()`, `is_linked_to_entity()` como SECURITY DEFINER
- Rota protegida via componente `<ProtectedRoute />`
- Edge Functions para operações administrativas sensíveis

---

## Módulos do Sistema

### 1. Dashboard Geral (`dashboard`)
- **Cards de métricas consolidadas**: Ligações, Vendas, Faturamento, Entradas, Tendências
- **Seções por Squad**: Eagles e Sharks com totais agregados
- **Seletor de mês e semana**: Filtragem de período
- **Realtime**: Atualização automática via subscriptions do Supabase
- **Pull-to-refresh**: Atualização manual em dispositivos móveis

### 2. Squad Eagles (`eagles`)
- **Lista de Closers** do squad Eagles com métricas individuais
- **Detalhe do Closer**: Cards de métricas, gráfico semanal comparativo, tabela de dados
- **CRUD de métricas**: Adicionar, editar e excluir registros de métricas
- **Filtro por funil**: Visualizar métricas por funil específico
- **Swipe navigation**: Navegar entre closers com gestos no mobile
- **Dados**: Ligações, vendas, faturamento, entradas, tendências, cancelamentos

### 3. Squad Sharks (`sharks`)
- Mesmas funcionalidades do Squad Eagles, para o squad Sharks

### 4. SDRs (`sdrs`)
- **Toggle SDR / Social Selling**: Alternar entre tipos de SDR
- **Métricas consolidadas**: Ativados, agendados, compareceram, vendas, taxas
- **Lista de SDRs** com métricas agregadas por período
- **Detalhe por SDR**: Cards, gráfico semanal, tabela de dados, CRUD de métricas
- **Gerenciamento de funis por SDR**: Adicionar/remover funis (tabela `sdr_funnels`)
- **Métricas por funil**: Filtrar dados por funil específico do SDR
- **Campos**: Ativados, agendados (mesmo dia + follow-up), compareceram, vendas, taxas de agendamento/comparecimento/conversão

### 5. Reuniões (`meetings`)
- **CRUD de reuniões**: Criar, editar, excluir reuniões com data e descrição
- **Participantes**: Vincular usuários do sistema como participantes
- **Notas de reunião**: Adicionar, editar e excluir anotações
- **Action Items**: Criar itens de ação com responsável, prazo e status (`pending`, `in_progress`, `done`)
- **Acesso**: Disponível para managers e admins

### 6. Metas (`goals`)
- **Configuração de metas mensais** por entidade (Closer ou SDR/Social)
- **Métricas-alvo para Closers**: Ligações, vendas, faturamento, entradas
- **Métricas-alvo para SDRs**: Ativados, agendados, compareceram, vendas
- **Progresso visual**: Barras de progresso comparando atual vs meta
- **Filtros**: Por tipo de entidade, entidade específica e mês
- **Acesso**: Managers (squads vinculados) e admins

### 7. Relatórios (`reports`)
- **Visão geral por funil**: Cards com totais de leads, qualificados, agendamentos, vendas, faturamento
- **Gráfico de funil**: Visualização do funil de conversão (FunnelChart)
- **Tabela detalhada por funil**: Com edição inline de valores (admin/manager)
- **Tabela por produto/pessoa**: Cruzamento de vendas por closer/SDR × produto/funil
- **Edição inline**: Componente `EditableCell` para editar valores diretamente na tabela
- **Filtro por período**: Mensal ou customizado
- **SDR Metrics Dialog**: Adicionar métricas de SDR diretamente dos relatórios

### 8. Painel Administrativo (`admin`)
- **Aba Métricas**: Tabela geral de métricas do sistema (`MetricsTable`)
- **Aba Usuários**:
  - Lista de usuários cadastrados com role e permissões
  - Criar novo usuário (via Edge Function `admin-create-user`)
  - Excluir usuário (via Edge Function `admin-delete-user`)
  - Alterar role do usuário
  - Toggle de permissões por módulo
  - Gerenciar vínculos de entidade (Closer/SDR)
- **Aba Metas**: Configuração centralizada de metas (`GoalsConfig`)

---

## Funcionalidades Transversais

| Funcionalidade | Descrição |
|----------------|-----------|
| **PWA** | App instalável com service worker, ícones e manifest |
| **Pull-to-refresh** | Atualização de dados via gesto de puxar (mobile) |
| **Swipe navigation** | Navegação entre entidades com gestos horizontais |
| **Bottom navigation** | Barra de navegação inferior no mobile |
| **Sidebar responsiva** | Menu lateral com overlay no mobile, fixo no desktop |
| **Realtime** | Subscriptions para `metrics` e `sdr_metrics` |
| **Skeleton loading** | Estados de carregamento animados por componente |
| **Error boundaries** | Captura de erros por seção sem derrubar a aplicação |
| **Lazy loading** | Módulos carregados sob demanda (React.lazy + Suspense) |
| **Edição inline** | Editar valores diretamente em tabelas de relatórios |
| **Seletor de mês/semana** | Filtros de período reutilizáveis |
| **Dias úteis** | Cálculo de dias úteis para projeções |

---

## Banco de Dados — Tabelas

### Usuários e Permissões
| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfis de usuário (id, email) |
| `user_roles` | Roles dos usuários (admin, manager, viewer, user) |
| `module_permissions` | Permissões de acesso por módulo |
| `user_entity_links` | Vínculos entre usuários e entidades (closer/sdr) |

### Estrutura Comercial
| Tabela | Descrição |
|--------|-----------|
| `squads` | Squads/equipes (Eagles, Sharks) |
| `closers` | Closers vinculados a squads |
| `sdrs` | SDRs e Social Sellers |
| `sdr_funnels` | Funis específicos por SDR |

### Métricas
| Tabela | Descrição |
|--------|-----------|
| `metrics` | Métricas semanais dos closers |
| `sdr_metrics` | Métricas diárias dos SDRs |
| `goals` | Metas mensais por entidade e métrica |

### Funis
| Tabela | Descrição |
|--------|-----------|
| `funnels` | Funis centralizados do sistema |
| `user_funnels` | Atribuição de funis a usuários |
| `funnel_daily_data` | Dados diários por funil |

### Reuniões
| Tabela | Descrição |
|--------|-----------|
| `meetings` | Reuniões agendadas |
| `meeting_participants` | Participantes das reuniões |
| `meeting_notes` | Notas/anotações das reuniões |
| `meeting_action_items` | Itens de ação com status |

### Configurações de Integração
| Tabela | Descrição |
|--------|-----------|
| `google_sheets_config` | Config de integração com Google Sheets |
| `squad_sheets_config` | Config de sheets por squad |
| `sdr_sheets_config` | Config de sheets para SDRs |

---

## Funções do Banco (RPC)

| Função | Descrição |
|--------|-----------|
| `has_role(_user_id, _role)` | Verifica se usuário tem determinado role |
| `has_module_permission(_user_id, _module)` | Verifica permissão de módulo |
| `get_user_role(_user_id)` | Retorna o role do usuário |
| `is_linked_to_entity(_user_id, _entity_type, _entity_id)` | Verifica vínculo com entidade |
| `manager_can_access_closer(_user_id, _closer_id)` | Verifica acesso do manager ao closer |
| `manager_can_access_sdr(_user_id, _sdr_id)` | Verifica acesso do manager ao SDR |
| `get_all_funnels_summary(period_start, period_end)` | Resumo de todos os funis |
| `get_funnel_report(funnel_id, period_start, period_end)` | Relatório detalhado de um funil |
| `get_sales_by_person_and_product(period_start, period_end)` | Vendas por pessoa × produto |
| `get_sdr_total_metrics(type, period_start, period_end)` | Métricas totais de SDRs |

---

## Edge Functions

| Função | Descrição |
|--------|-----------|
| `admin-create-user` | Cria novo usuário com role, permissões e vínculos opcionais |
| `admin-delete-user` | Remove usuário completamente do sistema |

---

## Hooks Customizados

| Hook | Descrição |
|------|-----------|
| `useMetrics` | CRUD e agregação de métricas de closers |
| `useSdrMetrics` | CRUD e agregação de métricas de SDRs |
| `useFunnels` | Gestão de funis e dados diários |
| `useGoals` | CRUD de metas mensais |
| `useMeetings` | CRUD de reuniões, notas e action items |
| `useUserManagement` | Gestão de usuários, roles e permissões |
| `useUserEntityLinks` | Vínculos entre usuários e entidades |
| `useRealtimeMetrics` | Subscriptions realtime para métricas |
| `usePullToRefresh` | Lógica de pull-to-refresh |
| `useSwipeNavigation` | Navegação por gestos horizontais |
| `use-mobile` | Detecção de dispositivo mobile |

---

## Estrutura de Arquivos

```
src/
├── components/
│   ├── dashboard/
│   │   ├── closer/          # Componentes de Closers
│   │   ├── sdr/             # Componentes de SDRs
│   │   ├── meetings/        # Componentes de Reuniões
│   │   ├── reports/         # Componentes de Relatórios
│   │   ├── skeletons/       # Loading states
│   │   ├── AdminPanel.tsx   # Painel administrativo
│   │   ├── Sidebar.tsx      # Navegação lateral
│   │   ├── Header.tsx       # Cabeçalho
│   │   └── ...
│   └── ui/                  # Componentes shadcn/ui
├── contexts/
│   └── AuthContext.tsx       # Contexto de autenticação
├── hooks/                   # Hooks customizados
├── integrations/
│   └── supabase/            # Cliente e tipos do Supabase
├── pages/
│   ├── Auth.tsx             # Página de login/cadastro
│   ├── Index.tsx            # Página principal (router de módulos)
│   └── NotFound.tsx         # Página 404
└── lib/
    ├── utils.ts             # Utilitários gerais
    └── workingDays.ts       # Cálculo de dias úteis
```

---

## Como Executar

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build de produção
npm run build
```
