"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { agendarSalaAction, removerAgendamentoAction } from "@/app/(app)/consultorios/actions"
import { toast } from "sonner"

const HORARIOS = [
  "07:00","08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00",
]

type AgendamentoRow = {
  id: string
  consultorioId: string
  consultorioNome: string
  profissionalNome: string
  data: string
  recorrencia: string
  horarios: string[]
}

type SalaOpcao = { id: string; identificacao: string; clinicaNome: string }
type ProfissionalOpcao = { id: string; nome: string }

// horários já ocupados por sala+data
type OcupacaoMap = { [salaId: string]: string[] }

type Props = {
  agendamentos: AgendamentoRow[]
  salas: SalaOpcao[]
  profissionais: ProfissionalOpcao[]
  canEdit: boolean
}

export function AgendarSala({ agendamentos, salas, profissionais, canEdit }: Props) {
  const [selectedHorarios, setSelectedHorarios] = useState<string[]>([])
  const [consultorioSel, setConsultorioSel] = useState("")
  const [dataSel, setDataSel] = useState(new Date().toISOString().slice(0, 10))
  const [recorrencia, setRecorrencia] = useState("Nenhuma")
  const [ocupacaoMap] = useState<OcupacaoMap>(() => {
    const m: OcupacaoMap = {}
    agendamentos.forEach((ag) => {
      if (!m[ag.consultorioId]) m[ag.consultorioId] = []
      ag.horarios.forEach((h) => m[ag.consultorioId].push(h))
    })
    return m
  })

  const [state, formAction, pending] = useActionState(agendarSalaAction, undefined)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (state?.sucesso) {
      toast.success("Agendamento salvo")
      setSelectedHorarios([])
    }
    if (state?.erro) toast.error(state.erro)
  }, [state])

  function toggleHorario(h: string) {
    const ocupados = ocupacaoMap[consultorioSel] ?? []
    if (ocupados.includes(h)) return
    setSelectedHorarios((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
    )
  }

  function handleRemover(id: string) {
    startTransition(async () => {
      await removerAgendamentoAction(id)
      toast.success("Agendamento removido")
    })
  }

  const ocupadosConsultorio = ocupacaoMap[consultorioSel] ?? []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Formulário */}
      {canEdit && (
        <form
          action={(fd) => {
            selectedHorarios.forEach((h) => fd.append("horarios", h))
            return formAction(fd)
          }}
          className="bg-white rounded-lg border border-slate-200 p-4 space-y-4"
        >
          <p className="font-semibold text-sm text-slate-700">Novo agendamento</p>

          <div className="space-y-1">
            <Label>Consultório</Label>
            <select
              name="consultorioId"
              required
              value={consultorioSel}
              onChange={(e) => { setConsultorioSel(e.target.value); setSelectedHorarios([]) }}
              className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">Selecione...</option>
              {salas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.clinicaNome} · Sala {s.identificacao}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Profissional</Label>
            <select
              name="profissionalId"
              required
              className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">Selecione...</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="data">Data inicial</Label>
              <Input
                id="data"
                name="data"
                type="date"
                required
                value={dataSel}
                onChange={(e) => setDataSel(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Recorrência</Label>
              <select
                name="recorrencia"
                value={recorrencia}
                onChange={(e) => setRecorrencia(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="Nenhuma">Sem recorrência</option>
                <option value="Semanal">Semanal</option>
                <option value="Mensal">Mensal</option>
              </select>
            </div>
          </div>

          {recorrencia !== "Nenhuma" && (
            <div className="space-y-1">
              <Label htmlFor="dataFim">Data de término (opcional — padrão 6 meses)</Label>
              <Input
                id="dataFim"
                name="dataFim"
                type="date"
                min={dataSel}
              />
              <p className="text-xs text-slate-400">
                Serão criados agendamentos {recorrencia === "Semanal" ? "semanais" : "mensais"} entre a data inicial e a de término.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Selecionar horários</Label>
            <div className="flex flex-wrap gap-1.5">
              {HORARIOS.map((h) => {
                const ocupado = ocupadosConsultorio.includes(h)
                const selecionado = selectedHorarios.includes(h)
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={ocupado}
                    onClick={() => toggleHorario(h)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      ocupado
                        ? "bg-red-50 border-red-200 text-red-400 cursor-not-allowed"
                        : selecionado
                        ? "bg-slate-700 text-white border-slate-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {h}
                    {ocupado && <span className="ml-1 opacity-70">●</span>}
                  </button>
                )
              })}
            </div>
            {selectedHorarios.length > 0 && (
              <p className="text-xs text-slate-500">
                {selectedHorarios.length} horário(s) selecionado(s):{" "}
                {selectedHorarios.sort().join(", ")}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={pending || selectedHorarios.length === 0}>
            {pending ? "Salvando..." : "Salvar agendamento"}
          </Button>
        </form>
      )}

      {/* Lista de agendamentos existentes */}
      <div className="space-y-2">
        <p className="font-semibold text-sm text-slate-700 mb-3">
          Agendamentos cadastrados ({agendamentos.length})
        </p>
        {agendamentos.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            Nenhum agendamento de sala
          </p>
        ) : (
          agendamentos.map((ag) => (
            <div
              key={ag.id}
              className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-800">
                  Sala {ag.consultorioNome} · {ag.profissionalNome}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(ag.data).toLocaleDateString("pt-BR")}
                  {ag.recorrencia !== "Nenhuma" && ` · ${ag.recorrencia}`}
                </p>
                <div className="flex flex-wrap gap-1">
                  {ag.horarios.map((h) => (
                    <Badge key={h} variant="outline" className="text-xs px-1.5 py-0">
                      {h}
                    </Badge>
                  ))}
                </div>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleRemover(ag.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors shrink-0 text-lg leading-none"
                  title="Remover"
                >
                  ✕
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
