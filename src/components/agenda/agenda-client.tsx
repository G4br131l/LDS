"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AgendamentoForm } from "./agendamento-form"
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { alterarStatusConsultaAction } from "@/app/(app)/consultas/actions"
import { toast } from "sonner"

const HORAS = [
  "07:00","08:00","09:00","10:00","11:00","12:00","13:00",
  "14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00",
]

const STATUS_LABEL: Record<string, string> = {
  Agendada: "Agendada",
  Confirmada: "Confirmada",
  Realizada: "Realizada",
  Cancelada: "Cancelada",
  Nao_compareceu: "Não compareceu",
}

const STATUS_CELL: Record<string, string> = {
  Agendada: "bg-yellow-100 border-yellow-300 text-yellow-800",
  Confirmada: "bg-blue-100 border-blue-300 text-blue-800",
  Realizada: "bg-green-100 border-green-300 text-green-800",
  Cancelada: "bg-red-50 border-red-200 text-red-400",
  Nao_compareceu: "bg-gray-100 border-gray-200 text-gray-400",
}

const STATUS_BADGE: Record<string, string> = {
  Agendada: "bg-yellow-100 text-yellow-700",
  Confirmada: "bg-blue-100 text-blue-700",
  Realizada: "bg-green-100 text-green-700",
  Cancelada: "bg-red-100 text-red-600",
  Nao_compareceu: "bg-gray-100 text-gray-500",
}

const TIPO_LABEL: Record<string, string> = {
  Primeira_consulta: "Primeira consulta",
  Retorno: "Retorno",
  Procedimento: "Procedimento",
  Urgencia: "Urgência",
}

type ConsultaRow = {
  id: string
  numero: string
  pacienteNome: string
  pacienteCodigo: string
  profissionalId: string
  profissionalNome: string
  consultorioId: string
  consultorioNome: string
  especialidadeNome: string | null
  tipo: string
  data: string
  hora: string
  duracaoMinutos: number
  status: string
  motivo: string | null
  valor: number | null
  pago: boolean
}

type Paciente = { id: string; nome: string; codigo: string; cpf: string }
type Profissional = { id: string; nome: string; especialidades: { id: string; nome: string }[] }
type Consultorio = { id: string; identificacao: string; clinicaId: string }
type Clinica = { id: string; nome: string }

type Props = {
  consultas: ConsultaRow[]
  pacientes: Paciente[]
  profissionais: Profissional[]
  consultorios: Consultorio[]
  clinicas: Clinica[]
  clinicaAtualId: string
  dataAtual: string
  canCreate: boolean
  canEdit: boolean
}

export function AgendaClient({
  consultas,
  pacientes,
  profissionais,
  consultorios,
  clinicas,
  clinicaAtualId,
  dataAtual,
  canCreate,
  canEdit,
}: Props) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"medico" | "sala">("medico")
  const [selecionada, setSelecionada] = useState<ConsultaRow | null>(null)
  const [showAgendamento, setShowAgendamento] = useState(false)
  const [, startTransition] = useTransition()

  function navDia(delta: number) {
    const d = new Date(`${dataAtual}T12:00:00Z`)
    d.setDate(d.getDate() + delta)
    router.push(`/agenda?data=${d.toISOString().slice(0, 10)}`)
  }

  function irPara(date: Date | undefined) {
    if (!date) return
    const iso = date.toLocaleDateString("en-CA") // YYYY-MM-DD sem timezone shift
    startTransition(() => router.push(`/agenda?data=${iso}`))
  }

  const dataFormatada = new Date(`${dataAtual}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  // KPIs
  const kpis = {
    total: consultas.length,
    realizadas: consultas.filter((c) => c.status === "Realizada").length,
    confirmadas: consultas.filter((c) => c.status === "Confirmada").length,
    agendadas: consultas.filter((c) => c.status === "Agendada").length,
  }

  // Build columns based on view mode
  const colunas =
    viewMode === "medico"
      ? profissionais.filter((p) => consultas.some((c) => c.profissionalId === p.id))
      : consultorios.filter((r) => consultas.some((c) => c.consultorioId === r.id))

  // Build grid: hora → colId → consulta
  type GridCell = ConsultaRow | null
  const grade: Record<string, Record<string, GridCell>> = {}
  HORAS.forEach((h) => {
    grade[h] = {}
    colunas.forEach((col) => { grade[h][col.id] = null })
  })
  consultas.forEach((c) => {
    const hora = c.hora
    const colId = viewMode === "medico" ? c.profissionalId : c.consultorioId
    if (grade[hora] && colId in grade[hora]) {
      grade[hora][colId] = c
    }
  })

  function handleStatus(id: string, status: string) {
    startTransition(async () => {
      const { erro } = await alterarStatusConsultaAction(id, status as Parameters<typeof alterarStatusConsultaAction>[1])
      if (erro) toast.error(erro)
      else {
        toast.success("Status atualizado")
        setSelecionada(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Agenda</h1>
            <p className="text-sm text-slate-500 capitalize mt-0.5">{dataFormatada}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navDia(-1)}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <Popover>
              <PopoverTrigger
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded hover:bg-slate-50 font-medium bg-white"
              >
                <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                {new Date(`${dataAtual}T12:00:00Z`).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={new Date(`${dataAtual}T12:00:00Z`)}
                  onSelect={irPara}
                />
              </PopoverContent>
            </Popover>

            <button
              onClick={() => navDia(1)}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => irPara(new Date())}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded hover:bg-slate-50"
            >
              Hoje
            </button>

            {canCreate && (
              <Button size="sm" className="ml-2 gap-1.5" onClick={() => setShowAgendamento(true)}>
                <Plus className="w-4 h-4" />
                Agendar
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Total", value: kpis.total, color: "text-slate-700" },
            { label: "Realizadas", value: kpis.realizadas, color: "text-green-600" },
            { label: "Confirmadas", value: kpis.confirmadas, color: "text-blue-600" },
            { label: "Agendadas", value: kpis.agendadas, color: "text-yellow-600" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2 mb-3">
          {(["medico", "sala"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                viewMode === m
                  ? "bg-slate-700 text-white border-slate-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {m === "medico" ? "Por Médico" : "Por Sala"}
            </button>
          ))}
        </div>

        {/* Grid */}
        {colunas.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            <div className="text-center space-y-2">
              <CalendarDays className="w-10 h-10 mx-auto opacity-30" />
              <p>Nenhuma consulta para esta data</p>
              {canCreate && (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowAgendamento(true)}>
                  Agendar consulta
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 bg-slate-50 border-b border-r border-slate-200 px-3 py-2 text-left text-slate-500 font-medium w-16">
                    Hora
                  </th>
                  {colunas.map((col) => (
                    <th
                      key={col.id}
                      className="sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-3 py-2 text-center text-slate-700 font-medium min-w-[140px]"
                    >
                      {"nome" in col
                        ? (col as { nome: string }).nome.replace(/^Dr\.?\s*/i, "")
                        : `Sala ${"identificacao" in col ? (col as { identificacao: string }).identificacao : ""}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HORAS.map((hora) => (
                  <tr key={hora} className="hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-100 px-3 py-1.5 text-slate-400 font-mono text-xs w-16">
                      {hora}
                    </td>
                    {colunas.map((col) => {
                      const c = grade[hora][col.id]
                      return (
                        <td
                          key={col.id}
                          className="border-b border-r border-slate-100 p-1 align-top"
                        >
                          {c && (
                            <button
                              onClick={() => setSelecionada(c)}
                              className={`w-full text-left rounded border px-2 py-1 transition-opacity hover:opacity-80 ${STATUS_CELL[c.status] ?? "bg-slate-100"}`}
                            >
                              <p className="font-medium leading-tight truncate">{c.pacienteNome.split(" ")[0]}</p>
                              <p className="opacity-70 truncate">{TIPO_LABEL[c.tipo]}</p>
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Detalhe da consulta ── */}
      <Dialog open={!!selecionada} onOpenChange={(o) => { if (!o) setSelecionada(null) }}>
        <DialogContent showCloseButton className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {selecionada && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base">{selecionada.numero}</DialogTitle>
                  <Badge className={`${STATUS_BADGE[selecionada.status]} text-xs`}>
                    {STATUS_LABEL[selecionada.status]}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Paciente</p>
                  <p className="font-medium text-slate-800">{selecionada.pacienteNome}</p>
                  <p className="text-xs text-slate-400">{selecionada.pacienteCodigo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Profissional</p>
                  <p className="text-slate-700">{selecionada.profissionalNome}</p>
                </div>
                {selecionada.especialidadeNome && (
                  <div>
                    <p className="text-xs text-slate-400">Especialidade</p>
                    <p className="text-slate-700">{selecionada.especialidadeNome}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400">Consultório</p>
                  <p className="text-slate-700">Sala {selecionada.consultorioNome}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Horário</p>
                    <p className="text-slate-700">{selecionada.hora}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Duração</p>
                    <p className="text-slate-700">{selecionada.duracaoMinutos} min</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Tipo</p>
                  <p className="text-slate-700">{TIPO_LABEL[selecionada.tipo]}</p>
                </div>
                {selecionada.motivo && (
                  <div>
                    <p className="text-xs text-slate-400">Motivo</p>
                    <p className="text-slate-700">{selecionada.motivo}</p>
                  </div>
                )}
              </div>

              {canEdit && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {(selecionada.status === "Agendada" || selecionada.status === "Confirmada") && (
                    <button
                      onClick={() => handleStatus(selecionada.id, "Realizada")}
                      className="w-full text-left px-3 py-2 text-sm rounded-md border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                    >
                      ✓ Marcar como realizada
                    </button>
                  )}
                  {selecionada.status === "Agendada" && (
                    <button
                      onClick={() => handleStatus(selecionada.id, "Confirmada")}
                      className="w-full text-left px-3 py-2 text-sm rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                    >
                      ✓ Confirmar presença
                    </button>
                  )}
                  {(selecionada.status === "Agendada" || selecionada.status === "Confirmada") && (
                    <button
                      onClick={() => handleStatus(selecionada.id, "Nao_compareceu")}
                      className="w-full text-left px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      ✕ Não compareceu
                    </button>
                  )}
                  {(selecionada.status === "Agendada" || selecionada.status === "Confirmada") && (
                    <button
                      onClick={() => handleStatus(selecionada.id, "Cancelada")}
                      className="w-full text-left px-3 py-2 text-sm rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      ✕ Cancelar consulta
                    </button>
                  )}
                </div>
              )}

              <Link href={`/consultas/${selecionada.id}`} className="block">
                <Button variant="outline" size="sm" className="w-full">
                  Ver detalhes completos
                </Button>
              </Link>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Agendar consulta ── */}
      <Dialog open={showAgendamento} onOpenChange={(o) => { if (!o) setShowAgendamento(false) }}>
        <DialogContent showCloseButton className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agendar Consulta</DialogTitle>
          </DialogHeader>
          <AgendamentoForm
            pacientes={pacientes}
            profissionais={profissionais}
            consultorios={consultorios}
            clinicas={clinicas}
            clinicaAtualId={clinicaAtualId}
            onSuccess={() => { setShowAgendamento(false); router.refresh() }}
            onCancel={() => setShowAgendamento(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

