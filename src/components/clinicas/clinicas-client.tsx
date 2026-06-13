"use client"

import { useState, useTransition, useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { criarClinicaAction, editarClinicaAction, type ClinicaActionState } from "@/app/(app)/clinicas/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Building2, MapPin, Phone, Users, DoorOpen, TrendingUp, Plus } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

type Horario = { dia: string; abertura: string; fechamento: string }
type Consultorio = { id: string; identificacao: string; especialidadePrincipal?: string | null; status: string }
type ProfVinculado = { id: string; nome: string }

type Clinica = {
  id: string
  nome: string
  cnpj: string
  telefone?: string | null
  endereco?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  status: string
  responsavelTecnicoId?: string | null
  responsavelTecnicoNome?: string | null
  salasCount: number
  profissionaisCount: number
  receitaMes: number
  horarios: Horario[]
  consultorios: Consultorio[]
  profissionaisVinculados: ProfVinculado[]
}

type Profissional = { id: string; nome: string }

type Props = {
  clinicas: Clinica[]
  profissionais: Profissional[]
  kpis: {
    ativas: number
    emImplantacao: number
    totalSalas: number
    totalProfissionais: number
    receitaTotal: number
  }
  tabAtiva: string
  clinicaIdSelecionada: string | null
  canEdit: boolean
  canCreate: boolean
  mesCurrent: string
}

const DIAS_SEMANA = [
  { key: "Segunda", label: "Segunda-feira" },
  { key: "Terca", label: "Terça-feira" },
  { key: "Quarta", label: "Quarta-feira" },
  { key: "Quinta", label: "Quinta-feira" },
  { key: "Sexta", label: "Sexta-feira" },
  { key: "Sabado", label: "Sábado" },
  { key: "Domingo", label: "Domingo" },
]

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  Ativa: { label: "Ativa", className: "bg-green-100 text-green-700 border border-green-200" },
  Em_implantacao: { label: "Em implantação", className: "bg-yellow-100 text-yellow-700 border border-yellow-200" },
  Inativa: { label: "Inativa", className: "bg-gray-100 text-gray-600 border border-gray-200" },
}

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function ClinicasClient({
  clinicas,
  profissionais,
  kpis,
  tabAtiva,
  clinicaIdSelecionada,
  canEdit,
  canCreate,
  mesCurrent,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState(tabAtiva === "cadastro" ? "lista" : tabAtiva)
  const [showForm, setShowForm] = useState(tabAtiva === "cadastro" || !!clinicaIdSelecionada)
  const [editandoId, setEditandoId] = useState<string | null>(clinicaIdSelecionada)
  const [, startTransition] = useTransition()

  const [stateCriar, formCriar, pendingCriar] = useActionState<ClinicaActionState, FormData>(criarClinicaAction, undefined)
  const [stateEditar, formEditar, pendingEditar] = useActionState<ClinicaActionState, FormData>(editarClinicaAction, undefined)

  useEffect(() => {
    if (stateCriar?.sucesso) {
      toast.success("Clínica cadastrada")
      setShowForm(false)
      startTransition(() => router.push(`/clinicas`))
    }
    if (stateCriar?.erro) toast.error(stateCriar.erro)
  }, [stateCriar])

  useEffect(() => {
    if (stateEditar?.sucesso) {
      toast.success("Clínica atualizada")
      setShowForm(false)
      setEditandoId(null)
      startTransition(() => router.push(`/clinicas`))
    }
    if (stateEditar?.erro) toast.error(stateEditar.erro)
  }, [stateEditar])

  function abrirEditar(clinica: Clinica) {
    setEditandoId(clinica.id)
    setShowForm(true)
  }

  function abrirNovo() {
    setEditandoId(null)
    setShowForm(true)
  }

  function fecharForm() {
    setShowForm(false)
    setEditandoId(null)
  }

  const clinicaEditando = editandoId ? clinicas.find((c) => c.id === editandoId) ?? null : null

  const receitaMax = Math.max(...clinicas.map((c) => c.receitaMes), 1)

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rede de Clínicas</h1>
          <p className="text-sm text-slate-500">{clinicas.length} unidades cadastradas</p>
        </div>
        {canCreate && (
          <Button onClick={abrirNovo}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Clínica
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          ["lista", "Lista de Unidades"],
          ["comparativo", "Visão Comparativa"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Lista ── */}
      {tab === "lista" && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <KpiCard
              label="Unidades ativas"
              value={String(kpis.ativas)}
              sub={`${kpis.emImplantacao} em implantação`}
              icon={<Building2 className="w-5 h-5 text-blue-500" />}
            />
            <KpiCard
              label="Total de salas"
              value={String(kpis.totalSalas)}
              sub="na rede"
              icon={<DoorOpen className="w-5 h-5 text-green-500" />}
            />
            <KpiCard
              label="Profissionais"
              value={String(kpis.totalProfissionais)}
              sub="distribuídos na rede"
              icon={<Users className="w-5 h-5 text-yellow-500" />}
            />
            <KpiCard
              label="Receita total"
              value={fmt(kpis.receitaTotal)}
              sub={mesCurrent}
              icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            />
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Unidade</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Cidade</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Salas</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Profissionais</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Receita/mês</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clinicas.map((c) => {
                  const st = STATUS_BADGE[c.status] ?? STATUS_BADGE.Inativa
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{c.nome}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {[c.cidade, c.estado].filter(Boolean).join(" – ")}
                      </td>
                      <td className="px-4 py-3 text-center">{c.salasCount}</td>
                      <td className="px-4 py-3 text-center">{c.profissionaisCount}</td>
                      <td className="px-4 py-3 text-right">
                        {c.receitaMes > 0 ? (
                          <span className="text-green-600 font-medium">{fmt(c.receitaMes)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.className}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {canEdit && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => abrirEditar(c)}>
                              Editar
                            </Button>
                          )}
                          <Link href={`/consultorios?clinicaId=${c.id}`}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs">
                              Ver
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {clinicas.length === 0 && (
              <div className="text-center py-12 text-slate-400">Nenhuma clínica cadastrada</div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Cadastrar / Editar clínica ── */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) fecharForm() }}>
        <DialogContent showCloseButton className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {clinicaEditando ? `Editando: ${clinicaEditando.nome}` : "Cadastrar Nova Clínica"}
            </DialogTitle>
          </DialogHeader>
          <div className={clinicaEditando ? "grid grid-cols-[1.4fr_1fr] gap-5" : ""}>
            <ClinicaForm
              key={clinicaEditando?.id ?? "novo"}
              clinica={clinicaEditando ?? undefined}
              profissionais={profissionais}
              formAction={clinicaEditando ? formEditar : formCriar}
              pending={clinicaEditando ? pendingEditar : pendingCriar}
              onCancelar={fecharForm}
            />
            {clinicaEditando && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Consultórios vinculados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500 mb-3">
                      {clinicaEditando.salasCount} salas cadastradas nesta unidade
                    </p>
                    <div className="divide-y divide-dashed divide-slate-200">
                      {clinicaEditando.consultorios.map((ct) => (
                        <div key={ct.id} className="flex items-center justify-between py-2">
                          <div>
                            <span className="text-sm">{ct.identificacao}</span>
                            {ct.especialidadePrincipal && (
                              <span className="text-xs text-slate-400 ml-2">· {ct.especialidadePrincipal}</span>
                            )}
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${ct.status === "Ativo" ? "text-green-600" : "text-amber-600"}`}>
                            {ct.status}
                          </span>
                        </div>
                      ))}
                      {clinicaEditando.salasCount > clinicaEditando.consultorios.length && (
                        <p className="text-xs text-slate-400 pt-2">
                          + {clinicaEditando.salasCount - clinicaEditando.consultorios.length} salas adicionais...
                        </p>
                      )}
                    </div>
                    <Link href={`/consultorios?clinicaId=${clinicaEditando.id}`}>
                      <Button className="w-full mt-3 text-sm" size="sm">
                        Gerenciar consultórios →
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Profissionais vinculados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500 mb-2">
                      {clinicaEditando.profissionaisCount} profissionais nesta unidade
                    </p>
                    <div className="divide-y divide-dashed divide-slate-200">
                      {clinicaEditando.profissionaisVinculados.map((p) => (
                        <div key={p.id} className="py-2 text-sm">{p.nome}</div>
                      ))}
                    </div>
                    {clinicaEditando.profissionaisCount > clinicaEditando.profissionaisVinculados.length && (
                      <p className="text-xs text-slate-400 mt-2">
                        + {clinicaEditando.profissionaisCount - clinicaEditando.profissionaisVinculados.length} profissionais...
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Tab: Visão Comparativa ── */}
      {tab === "comparativo" && (
        <div className="space-y-5">
          {/* Cards por clínica */}
          <div className="grid grid-cols-4 gap-4">
            {clinicas.map((c) => {
              const isAtiva = c.status === "Ativa"
              return (
                <div
                  key={c.id}
                  className={`rounded-lg border p-4 ${
                    isAtiva
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <Building2 className={`w-6 h-6 mb-2 ${isAtiva ? "text-blue-500" : "text-slate-400"}`} />
                  <p className="font-bold text-sm text-slate-900">{c.nome}</p>
                  <p className="text-xs text-slate-500 mb-3">
                    {[c.cidade, c.estado].filter(Boolean).join(" – ")}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white rounded border border-slate-200 text-center p-2">
                      <p className="font-bold text-slate-800">{c.salasCount}</p>
                      <p className="text-slate-500">Salas</p>
                    </div>
                    <div className="bg-white rounded border border-slate-200 text-center p-2">
                      <p className="font-bold text-slate-800">{c.profissionaisCount}</p>
                      <p className="text-slate-500">Médicos</p>
                    </div>
                  </div>
                  <p className={`mt-3 text-sm font-bold ${c.receitaMes > 0 ? "text-green-600" : "text-slate-400"}`}>
                    {c.receitaMes > 0 ? fmt(c.receitaMes) : "—"}
                    <span className="font-normal text-slate-400 text-xs ml-1">/mês</span>
                  </p>
                </div>
              )
            })}
          </div>

          {/* Receita comparativa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita comparativa por unidade — {mesCurrent}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {clinicas.filter((c) => c.receitaMes > 0).length === 0 ? (
                <p className="text-sm text-slate-400">Sem dados de receita para este mês</p>
              ) : (
                clinicas
                  .filter((c) => c.receitaMes > 0)
                  .sort((a, b) => b.receitaMes - a.receitaMes)
                  .map((c) => {
                    const pct = Math.round((c.receitaMes / receitaMax) * 100)
                    return (
                      <div key={c.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>
                            <strong>{c.nome}</strong>
                            {c.cidade && (
                              <span className="text-slate-400 text-xs ml-2">— {c.cidade}</span>
                            )}
                          </span>
                          <span className="font-bold text-green-600">{fmt(c.receitaMes)}</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded border border-slate-200">
                          <div
                            className="h-full bg-blue-500 rounded transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-start gap-3">
      <div className="p-2 bg-slate-50 rounded-md">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  )
}

// ── Clinica Form ──────────────────────────────────────────────────────────────
function ClinicaForm({
  clinica,
  profissionais,
  formAction,
  pending,
  onCancelar,
}: {
  clinica?: Clinica
  profissionais: Profissional[]
  formAction: (payload: FormData) => void
  pending: boolean
  onCancelar: () => void
}) {
  // Inicializa horários com valores existentes
  const getHorario = (dia: string, campo: "abertura" | "fechamento") =>
    clinica?.horarios.find((h) => h.dia === dia)?.[campo] ?? ""

  return (
    <form action={formAction} className="space-y-5">
      {clinica && <input type="hidden" name="id" value={clinica.id} />}

      {/* Dados principais */}
      <section className="space-y-4">
        <div>
          <Label htmlFor="nome">Nome da unidade *</Label>
          <Input id="nome" name="nome" defaultValue={clinica?.nome} placeholder="Ex: Clínica Central" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input id="cnpj" name="cnpj" placeholder="00.000.000/0001-00" defaultValue={clinica?.cnpj} required />
          </div>
          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" placeholder="(11) 3000-0000" defaultValue={clinica?.telefone ?? ""} />
          </div>
        </div>
        <div>
          <Label htmlFor="endereco">Endereço completo</Label>
          <Input id="endereco" name="endereco" placeholder="Rua, número, complemento..." defaultValue={clinica?.endereco ?? ""} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" name="cidade" defaultValue={clinica?.cidade ?? ""} />
          </div>
          <div>
            <Label htmlFor="estado">UF</Label>
            <Input id="estado" name="estado" maxLength={2} placeholder="SP" defaultValue={clinica?.estado ?? ""} />
          </div>
          <div>
            <Label htmlFor="cep">CEP</Label>
            <Input id="cep" name="cep" placeholder="00000-000" defaultValue={clinica?.cep ?? ""} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="responsavelTecnicoId">Responsável técnico</Label>
            <select
              id="responsavelTecnicoId"
              name="responsavelTecnicoId"
              defaultValue={clinica?.responsavelTecnicoId ?? ""}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Nenhum</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={clinica?.status ?? "Ativa"}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="Ativa">Ativa</option>
              <option value="Em_implantacao">Em implantação</option>
              <option value="Inativa">Inativa</option>
            </select>
          </div>
        </div>
      </section>

      {/* Horários de funcionamento */}
      <section>
        <hr className="mb-4" />
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Horário de funcionamento</h3>
        <div className="space-y-2">
          {DIAS_SEMANA.map(({ key, label }) => (
            <div key={key} className="grid grid-cols-[2fr_1fr_1fr] gap-3 items-end">
              <p className="text-sm text-slate-500 pb-1">{label}</p>
              <div>
                <Label className="text-xs">Abertura</Label>
                <Input
                  name={`hor_${key}_abertura`}
                  type="time"
                  defaultValue={getHorario(key, "abertura")}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Fechamento</Label>
                <Input
                  name={`hor_${key}_fechamento`}
                  type="time"
                  defaultValue={getHorario(key, "fechamento")}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : clinica ? "Salvar Alterações" : "Cadastrar Clínica"}
        </Button>
      </div>
    </form>
  )
}
