# Diário de Desenvolvimento — Umbrella

Registro das etapas concluídas, arquivos criados e decisões técnicas relevantes.

---

## Etapa 0 — Infra & Fundação de Dados ✅

**Docker / PostgreSQL**
- Container `umbrella_db` iniciado via `docker run` (docker compose plugin indisponível no ambiente)
- `umbrella/.env`: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`

**Prisma 7 (breaking changes)**
- `prisma/schema.prisma`: 22 modelos, 18 enums; datasource **sem** `url` (removido no Prisma 7)
- `prisma.config.ts`: URL da datasource + seed command (`tsx prisma/seed.ts`)
- Client gerado em `src/generated/prisma/` — importar de `@/generated/prisma/client` (sem `index.ts`)
- Adapter obrigatório: `PrismaPg({ connectionString })` → `new PrismaClient({ adapter })`
- `src/lib/prisma.ts`: singleton com adapter pg

**Seed** (`prisma/seed.ts`)
- 6 `PerfilAcesso` + matriz de `Permissao` (todos os 10 módulos × 4 ações)
- 4 clínicas, 12 especialidades, 16 profissionais (mix Percentual/Aluguel)
- 12 consultórios na Clínica Central, 6 pacientes + prontuários
- 6 logins: admin@umbrella.med / gerente / medico / secretaria / financeiro / paciente (`@umbrella.med`)

---

## Etapa 1 — Autenticação & RBAC ✅

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/lib/auth.ts` | NextAuth v5 Credentials; `authorize()` busca usuário, bcrypt compare, retorna `{id, nome, email, perfil, clinicaIds}`; callbacks `jwt`/`session` |
| `src/app/api/auth/[...nextauth]/route.ts` | Re-exporta `handlers` (GET/POST) |
| `src/lib/dal.ts` | `verifySession()` (redirect `/login` se sem sessão) e `getCurrentUser()` — ambos com `cache()` do React |
| `src/lib/permissions.ts` | `can(perfil, modulo, acao)` — consulta tabela `Permissao`; `getPermissoes(perfil)` cacheado |
| `src/lib/serialize.ts` | `serialize<T>(obj)` — converte `BigInt` → `string` e `Prisma.Decimal` → `number` via `JSON.stringify` replacer |
| `src/proxy.ts` | Checagem otimista de cookie `authjs.session-token`; redireciona para `/login` sem query de banco |
| `src/app/actions/auth.ts` | `loginAction`, `logoutAction`, `solicitarResetAction`, `redefinirSenhaAction` |
| `src/app/(auth)/login/page.tsx` | Formulário com `useActionState`; link para recuperação |
| `src/app/(auth)/recuperar-senha/page.tsx` | Formulário de reset; token exposto no log em dev |

**Decisões**
- Augmentação de tipos via `declare module "@auth/core/jwt"` (não `next-auth/jwt`)
- `editarUsuarioAction` lê `id` de hidden input (não `.bind()`) para compatibilidade com `useActionState`

---

## Etapa 2 — Shell da Aplicação ✅

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/app/(app)/layout.tsx` | Server Component; busca `verifySession`, permissões e clínicas; monta `AppShell` + `ClinicSwitcher` + `Toaster` |
| `src/components/app-shell.tsx` | Client Component; sidebar + área principal; chama `logoutAction` |
| `src/components/sidebar.tsx` | Sidebar escura; filtra itens de navegação por `permissoes` (módulos com `ver=true`) |
| `src/components/clinic-switcher.tsx` | Dropdown de clínicas; persiste escolha via cookie (`setClinicalAction`) |
| `src/app/actions/clinica-switcher.ts` | `setClinicalAction` (cookie httpOnly 30d) + `getClinicaIdAtual` |
| `src/app/(app)/dashboard/page.tsx` | Placeholder de dashboard com 4 KPI cards estáticos |

**Decisões**
- `DropdownMenuTrigger` não aceita `asChild` (usa `@base-ui/react`, não Radix) — trigger estilizado diretamente
- Cookie `clinicaId` persiste unidade selecionada; cada página de módulo lerá esse cookie para filtrar queries

---

## Etapa 3 — Usuários & Permissões ✅

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/app/actions/usuarios.ts` | `criarUsuario`, `editarUsuario`, `alterarStatus`, `redefinirSenhaAdmin`, `atualizarPermissoes` |
| `src/app/(app)/usuarios/page.tsx` | Server Component; busca usuários, clínicas, perfis+permissões, audit logs; serializa e passa ao client |
| `src/components/usuarios/usuarios-client.tsx` | 3 abas: Lista (KPIs + busca + filtro + tabela + painel lateral), Perfis & Permissões, Histórico |
| `src/components/usuarios/usuario-form.tsx` | Dialog de cadastro/edição: dados pessoais, perfil (radio), clínicas (checkbox), segurança (Switch 2FA/IP) |
| `src/components/usuarios/permissoes-matrix.tsx` | Seletor de perfil + matriz 10×4 de checkboxes; salva via `atualizarPermissoesAction` |

**Decisões**
- Painel lateral (não dialog) para detalhes: ações diretas (bloquear, redefinir senha, inativar)
- `atualizarPermissoes` usa `upsert` por `{perfilAcessoId, modulo}` para preservar IDs existentes

---

## Etapa 4 — Profissionais ✅

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/app/actions/profissionais.ts` | `criarProfissional`, `editarProfissional`, `adicionarVinculo`, `removerVinculo` |
| `src/app/(app)/profissionais/page.tsx` | Server Component; carrega profissionais com especialidades, vínculos, últimas 50 consultas e 20 pagamentos |
| `src/components/profissionais/profissionais-client.tsx` | Lista principal + painel lateral com 4 sub-abas (Dados, Horários, Consultas, Pagamentos) |
| `src/components/profissionais/profissional-form.tsx` | Formulário: conselho+registro+UF, especialidades (checkboxes), modelo de cobrança (Percentual/Aluguel), status |
| `src/components/profissionais/vinculos-tab.tsx` | Lista vínculos existentes + formulário inline de adição (consultório, dias, toggle de horários) |

**Decisões**
- Vínculos de horário: `new Date('1970-01-01T{HH:MM}:00Z')` para armazenar `@db.Time`
- Horários do vínculo exibidos como badges; seleção no form via botões toggle (sem checkbox nativo)
- Sub-abas Consultas e Pagamentos são read-only dentro do painel de profissional

---

## Etapa 5 — Consultórios & Turnos ✅

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/app/actions/consultorios.ts` | `criarConsultorio`, `editarConsultorio`, `agendarSala` (com verificação de conflito), `removerAgendamento` |
| `src/app/(app)/consultorios/page.tsx` | Server Component; busca consultórios, agendamentos, profissionais e clínicas; lê `clinicaId` do cookie |
| `src/components/consultorios/consultorios-client.tsx` | Filtro de clínica + 3 abas (Grade, Lista, Agendar) |
| `src/components/consultorios/grade-horarios.tsx` | Matriz salas × horas: células azuis = ocupado (nome do médico), brancas = livre; sticky header e coluna de horários |
| `src/components/consultorios/agendar-sala.tsx` | Formulário de agendamento com toggle de horários (vermelho = ocupado, cinza = livre, preto = selecionado); lista agendamentos existentes |
| `src/components/consultorios/consultorio-form.tsx` | Dialog CRUD: identificação, andar, especialidade, capacidade, horários abertura/fechamento, valor/hora, status, recursos (checklist), observações |

**Decisões**
- `agendarSalaAction` verifica conflitos antes de persistir: cruza `AgendamentoHorario` por `consultorioId + data + horario`
- Grade limita a 8 salas ativas para caber horizontalmente; demais acessíveis via aba Lista
- Horários `@db.Time` armazenados como `new Date('1970-01-01T{HH:MM}:00Z')` e exibidos via `.toISOString().slice(11,16)`

---

## Etapa 6 — Agenda & Consultas ✅

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/app/actions/consultas.ts` | `agendarConsultaAction`, `alterarStatusConsultaAction` (Agendada/Confirmada/Realizada/Cancelada/Nao_compareceu), `reagendarConsultaAction`, `registrarPagamentoConsultaAction` |
| `src/app/(app)/agenda/page.tsx` | Server Component; busca consultas do dia na clínica selecionada (cookie); passa dados para o grid |
| `src/components/agenda/agenda-client.tsx` | KPIs (total/realizadas/confirmadas/agendadas), toggle Por Médico/Por Sala, grade horária clicável com cells coloridas por status, painel lateral de detalhes e ações rápidas, navegação de datas |
| `src/app/(app)/agendamento/page.tsx` | Server Component; carrega pacientes, profissionais com especialidades, consultórios da clínica ativa |
| `src/components/agenda/agendamento-form.tsx` | Formulário completo: filtro unidade, busca paciente, profissional, especialidade (filtrada pelo profissional selecionado), consultório, tipo, data/hora/duração, motivo, valor/forma de pagamento |
| `src/app/(app)/consultas/[id]/page.tsx` | Server Component; `await params`; busca consulta com todas as relações |
| `src/components/agenda/consulta-detalhe.tsx` | 3 abas (Resumo, Paciente, Financeiro) + coluna de ações; inlines de reagendamento e registro de pagamento |

**Decisões**
- Grade limita colunas aos médicos/salas que têm consulta no dia (não exibe colunas vazias)
- Specialty dropdown desabilitado até profissional ser selecionado; filtra em cliente por `ProfissionalEspecialidade`
- Cores por status: Agendada=amarelo, Confirmada=azul, Realizada=verde, Cancelada=vermelho, Não compareceu=cinza
- `numero` gerado como `CST-{count+1 padded 6 digits}`; campo `@db.Time` para `hora` via `new Date('1970-01-01T{HH:MM}:00Z')`
- Reagendamento reseta status para `Agendada`

---

## Etapa 7 — Financeiro ✅

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/app/actions/financeiro.ts` | `registrarPagamentoAction` — upsert por `{profissionalId, dataInicio, dataFim}` com cálculo automático de status (Pendente/Parcial/Recebido) |
| `src/app/(app)/financeiro/page.tsx` | Server Component; navega semanas via `searchParams.semana`; calcula extrato (Percentual = soma × % / Aluguel = valor fixo); computa 4 KPIs; lista consultas não registradas |
| `src/components/financeiro/financeiro-client.tsx` | Tabela extrato com badges de status, form de registro de pagamento com seleção de profissional, painel "Consultas não registradas" com botões Realizada/Não |

**Decisões**
- Adicionado `@@unique([profissionalId, dataInicio, dataFim])` em `Pagamento` para permitir `upsert`; `prisma db push --accept-data-loss` para aplicar sem migration dev interativo
- Navegação semanal: `?semana=YYYY-MM-DD` (segunda-feira da semana); botões ← →
- Consultas não registradas: `status IN [Agendada, Confirmada]` com `data < hoje - 7 dias`
- Ações rápidas de status no painel de não-registradas chamam `alterarStatusConsultaAction` do módulo Agenda

---

## Etapa 8 — Relatórios & Dashboard ✅

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/app/(app)/dashboard/page.tsx` | Server Component reescrito; busca KPIs reais (consultas hoje, receita do mês, salas em uso, pendentes), gráfico 7 dias, receita por modelo, alertas |
| `src/components/dashboard/dashboard-client.tsx` | 4 KPIs, bar chart CSS (últimos 7 dias), progress bars receita por modelo (Percentual vs Aluguel), atalhos rápidos, painel de alertas |
| `src/app/(app)/relatorios/page.tsx` | Server Component; aceita `?tipo&inicio&fim&profissionalId&consultorioId&agrupar` via searchParams; executa agregações Prisma quando filtros presentes |
| `src/components/relatorios/relatorios-client.tsx` | Painel de filtros (Consultas / Receita, datas, opcionais), resultado como tabela (consultas) ou barras (receita por médico/sala) |

**Decisões**
- Gráficos implementados com CSS puro (barras proporcionais) — recharts disponível mas não necessário para esta fidelidade
- Relatórios são server-side: clicar "Gerar" faz `router.push` com searchParams → nova requisição ao servidor → resultado renderizado no Server Component
- Dashboard sem recharts evita SSR + hydration para gráficos simples; suficiente para o escopo

---

## Etapa 9 — Pacientes & Prontuário ✅

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/app/(app)/pacientes/actions.ts` | `criarPacienteAction`, `editarPacienteAction`; gera `codigo` (PAD 5 dígitos) após create |
| `src/app/(app)/pacientes/page.tsx` | Server Component; busca por nome/CPF/código; carrega consultas do paciente selecionado via `?pacienteId=X` |
| `src/components/pacientes/pacientes-client.tsx` | 2 abas (Lista / Cadastrar); lista com busca, painel lateral com dados + últimas consultas + link prontuário |
| `src/components/pacientes/paciente-form.tsx` | Form completo: Dados Pessoais, Contato, Endereço, Informações Clínicas; `useActionState` |
| `src/app/(app)/prontuario/actions.ts` | `criarEntradaAction`, `editarEntradaAction`, `finalizarEntradaAction`; cria prontuário automaticamente se inexistente; campos clínicos via hidden inputs indexados |
| `src/app/(app)/prontuario/page.tsx` | Server Component; busca paciente via `?pacienteId=X`; carrega prontuário + entradas + campos |
| `src/components/prontuario/prontuario-client.tsx` | Layout coluna dupla: esquerda = busca + lista de entradas; direita = editor (nova/editar) ou visualizador; campos clínicos dinâmicos (pressão, peso, procedimentos, custom) |

**Decisões**
- `convenio` removido conforme escopo do projeto (não existe no modelo Prisma)
- Campos clínicos gerenciados como estado local no editor e enviados via hidden inputs indexados (`campo_tipo_N`, `campo_valor_N`, etc.)
- Prontuário criado automaticamente na primeira entrada do paciente
- Entrada salva como rascunho (`rascunho: true`) ao "Salvar Rascunho"; botão "Finalizar" muda para `rascunho: false`
- Editor exige `profissionalId` vinculado ao usuário logado

---

## Etapa 10 — Rede de Clínicas ✅

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/app/(app)/clinicas/actions.ts` | `criarClinicaAction`, `editarClinicaAction`; recria horários via `$transaction(deleteMany + update)` |
| `src/app/(app)/clinicas/page.tsx` | Server Component; agrega KPIs (ativas, salas, profissionais por vínculos, receita do mês via Pagamento); passa consultorios/profissionaisVinculados para o painel lateral |
| `src/components/clinicas/clinicas-client.tsx` | 3 abas: Lista (KPIs + tabela), Cadastrar/Editar (form + painel lateral com salas e profissionais), Visão Comparativa (cards + barras de receita CSS) |

**Decisões**
- Receita do mês calculada a partir de `Pagamento.valorRecebido` (status Recebido/Parcial) filtrado pelo mês corrente — consistente com o módulo Financeiro
- Profissionais por clínica derivados de `VinculoProfissional → Consultorio.clinicaId` (sem campo direto no modelo)
- Horários de funcionamento re-enviados via inputs `hor_{Dia}_abertura / hor_{Dia}_fechamento`; campos em branco são ignorados na persistência
- Painel lateral mostra no máximo 20 salas e 5 profissionais com link para `/consultorios?clinicaId=X`

---

## Pendente

Todas as 10 etapas foram implementadas.
