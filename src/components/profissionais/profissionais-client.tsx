"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProfissionalForm } from "./profissional-form"
import { VinculosTab } from "./vinculos-tab"
import { UserPlus } from "lucide-react"
import type { TipoPerfil } from "@/generated/prisma/client"

const STATUS_CORES: Record<string, string> = {
  Ativo: "bg-green-100 text-green-700",
  Inativo: "bg-gray-100 text-gray-500",
}

const MODELO_LABELS: Record<string, string> = {
  Percentual: "Percentual",
  Aluguel: "Aluguel",
}

type AgendamentoData = {
  id: string
  consultorioNome: string
  clinicaNome: string
  data: string
  recorrencia: string
  horarios: string[]
}

type ConsultaRow = {
  id: string
  data: string
  hora: string
  pacienteNome: string
  consultorioNome: string
  clinicaNome: string
  valor: number | null
  status: string
}

type PagamentoRow = {
  id: string
  dataInicio: string
  dataFim: string
  valorDevido: number
  valorRecebido: number
  status: string
}

type ProfissionalRow = {
  id: string
  nome: string
  conselho: string
  registroConselho: string
  ufConselho: string
  telefone: string | null
  email: string
  modeloCobranca: string
  valorCobranca: number
  status: string
  especialidades: Array<{ id: string; nome: string }>
  agendamentos: AgendamentoData[]
  consultas: ConsultaRow[]
  pagamentos: PagamentoRow[]
}

type Especialidade = { id: string; nome: string }
type Props = {
  profissionais: ProfissionalRow[]
  especialidades: Especialidade[]
  canEdit: boolean
  canCreate: boolean
  userPerfil: TipoPerfil
}

const STATUS_CONSULTA_COR: Record<string, string> = {
  Agendada: "bg-blue-100 text-blue-700",
  Confirmada: "bg-cyan-100 text-cyan-700",
  Realizada: "bg-green-100 text-green-700",
  Cancelada: "bg-red-100 text-red-600",
  Nao_compareceu: "bg-gray-100 text-gray-500",
}

const STATUS_PAG_COR: Record<string, string> = {
  Pendente: "bg-red-100 text-red-600",
  Recebido: "bg-green-100 text-green-700",
  Parcial: "bg-yellow-100 text-yellow-600",
}

export function ProfissionaisClient({
  profissionais,
  especialidades,
  canEdit,
  canCreate,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
  const [showNovo, setShowNovo] = useState(false)

  const selected = selectedId ? (profissionais.find((p) => p.id === selectedId) ?? null) : null

  function fecharDetalhe() {
    setSelectedId(null)
    setEditando(false)
  }

  function fecharNovo() {
    setShowNovo(false)
  }

  function handleSucesso() {
    setShowNovo(false)
    setEditando(false)
    setSelectedId(null)
  }

  const cobrancaLabel = (p: ProfissionalRow) =>
    p.modeloCobranca === "Percentual"
      ? `${p.valorCobranca}%`
      : `R$ ${p.valorCobranca.toLocaleString("pt-BR")}/sem`

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Profissionais de Saúde</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {profissionais.length} profissionais cadastrados
          </p>
        </div>
        {canCreate && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowNovo(true)}>
            <UserPlus className="w-4 h-4" />
            Novo Profissional
          </Button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th className="text-left px-4 py-2.5 font-medium">Nome</th>
              <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Especialidades</th>
              <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Cobrança</th>
              <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Agend.</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {profissionais.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400">
                  Nenhum profissional cadastrado
                </td>
              </tr>
            ) : (
              profissionais.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-800">{p.nome}</p>
                    <p className="text-xs text-slate-500">
                      {p.conselho} {p.registroConselho}/{p.ufConselho}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {p.especialidades.slice(0, 2).map((e) => (
                        <Badge key={e.id} variant="outline" className="text-xs">
                          {e.nome}
                        </Badge>
                      ))}
                      {p.especialidades.length > 2 && (
                        <span className="text-xs text-slate-400">
                          +{p.especialidades.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-sm text-slate-600">
                    <span className="text-xs text-slate-400">{MODELO_LABELS[p.modeloCobranca]} · </span>
                    {cobrancaLabel(p)}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-sm text-slate-500">
                    {p.agendamentos.length}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge className={STATUS_CORES[p.status] ?? ""}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => { setSelectedId(p.id); setEditando(false) }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal: Ver / Editar profissional ── */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) fecharDetalhe() }}>
        <DialogContent
          showCloseButton
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between pr-6">
                  <div>
                    <DialogTitle>{selected.nome}</DialogTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selected.conselho} {selected.registroConselho}/{selected.ufConselho}
                    </p>
                  </div>
                  {canEdit && !editando && (
                    <button
                      onClick={() => setEditando(true)}
                      className="text-xs text-blue-600 hover:underline shrink-0"
                    >
                      Editar
                    </button>
                  )}
                </div>
              </DialogHeader>

              {editando ? (
                <ProfissionalForm
                  especialidades={especialidades}
                  profissional={{
                    id: selected.id,
                    nome: selected.nome,
                    conselho: selected.conselho,
                    registroConselho: selected.registroConselho,
                    ufConselho: selected.ufConselho,
                    telefone: selected.telefone,
                    email: selected.email,
                    modeloCobranca: selected.modeloCobranca,
                    valorCobranca: selected.valorCobranca,
                    status: selected.status,
                    especialidadeIds: selected.especialidades.map((e) => e.id),
                  }}
                  onSucesso={handleSucesso}
                  onCancelar={() => setEditando(false)}
                />
              ) : (
                <Tabs defaultValue="dados">
                  <TabsList className="w-full grid grid-cols-4">
                    <TabsTrigger value="dados" className="text-xs">Dados</TabsTrigger>
                    <TabsTrigger value="vinculos" className="text-xs">Horários</TabsTrigger>
                    <TabsTrigger value="consultas" className="text-xs">Consultas</TabsTrigger>
                    <TabsTrigger value="pagamentos" className="text-xs">Pagamentos</TabsTrigger>
                  </TabsList>

                  {/* ABA DADOS */}
                  <TabsContent value="dados" className="mt-3 space-y-3">
                    <div className="space-y-1.5 text-sm">
                      {[
                        ["Email", selected.email],
                        ["Telefone", selected.telefone ?? "—"],
                        ["Modelo", `${MODELO_LABELS[selected.modeloCobranca]} · ${cobrancaLabel(selected)}`],
                        ["Status", selected.status],
                      ].map(([l, v]) => (
                        <div key={l} className="flex justify-between gap-2 py-1 border-b border-slate-50">
                          <span className="text-slate-500 text-xs">{l}</span>
                          <span className="text-slate-700 text-xs text-right">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1.5">Especialidades</p>
                      <div className="flex flex-wrap gap-1">
                        {selected.especialidades.map((e) => (
                          <Badge key={e.id} variant="outline" className="text-xs">{e.nome}</Badge>
                        ))}
                        {selected.especialidades.length === 0 && (
                          <span className="text-xs text-slate-400">Nenhuma</span>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ABA HORÁRIOS */}
                  <TabsContent value="vinculos" className="mt-3">
                    <VinculosTab agendamentos={selected.agendamentos} />
                  </TabsContent>

                  {/* ABA CONSULTAS */}
                  <TabsContent value="consultas" className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { l: "Total", v: selected.consultas.length, cor: "text-slate-700" },
                        { l: "Realizadas", v: selected.consultas.filter((c) => c.status === "Realizada").length, cor: "text-green-600" },
                        { l: "Agendadas", v: selected.consultas.filter((c) => c.status === "Agendada" || c.status === "Confirmada").length, cor: "text-blue-600" },
                        { l: "Canceladas", v: selected.consultas.filter((c) => c.status === "Cancelada").length, cor: "text-red-500" },
                      ].map((k) => (
                        <div key={k.l} className="bg-slate-50 rounded-md px-3 py-2">
                          <p className={`text-lg font-bold ${k.cor}`}>{k.v}</p>
                          <p className="text-xs text-slate-500">{k.l}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {selected.consultas.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">Nenhuma consulta registrada</p>
                      ) : (
                        selected.consultas.slice(0, 20).map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0"
                          >
                            <div>
                              <p className="text-xs font-medium text-slate-700">{c.pacienteNome}</p>
                              <p className="text-xs text-slate-400">
                                {new Date(c.data).toLocaleDateString("pt-BR")} {c.hora} · {c.clinicaNome}
                              </p>
                            </div>
                            <Badge className={`text-xs ${STATUS_CONSULTA_COR[c.status] ?? ""}`}>
                              {c.status.replace("_", " ")}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  {/* ABA PAGAMENTOS */}
                  <TabsContent value="pagamentos" className="mt-3">
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {selected.pagamentos.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">Nenhum pagamento registrado</p>
                      ) : (
                        selected.pagamentos.slice(0, 20).map((pg) => (
                          <div
                            key={pg.id}
                            className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                          >
                            <div>
                              <p className="text-xs font-medium text-slate-700">
                                {new Date(pg.dataInicio).toLocaleDateString("pt-BR")} –{" "}
                                {new Date(pg.dataFim).toLocaleDateString("pt-BR")}
                              </p>
                              <p className="text-xs text-slate-500">
                                Devido: R$ {pg.valorDevido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <Badge className={`text-xs ${STATUS_PAG_COR[pg.status] ?? ""}`}>
                              {pg.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Novo profissional ── */}
      <Dialog open={showNovo} onOpenChange={(o) => { if (!o) fecharNovo() }}>
        <DialogContent showCloseButton className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Profissional</DialogTitle>
          </DialogHeader>
          <ProfissionalForm
            especialidades={especialidades}
            onSucesso={handleSucesso}
            onCancelar={fecharNovo}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
