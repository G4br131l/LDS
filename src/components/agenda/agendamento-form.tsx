"use client"

import { useActionState, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { agendarConsultaAction } from "@/app/(app)/consultas/actions"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"

const TIPOS = [
  { value: "Primeira_consulta", label: "Primeira consulta" },
  { value: "Retorno", label: "Retorno" },
  { value: "Procedimento", label: "Procedimento" },
  { value: "Urgencia", label: "Urgência" },
]

const FORMAS_PAGAMENTO = [
  { value: "Particular", label: "Particular" },
  { value: "Pix", label: "Pix" },
  { value: "Cartao_credito", label: "Cartão de crédito" },
  { value: "Cartao_debito", label: "Cartão de débito" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Transferencia", label: "Transferência" },
]

const DURACOES = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1h30" },
  { value: "120", label: "2 horas" },
]

type Paciente = { id: string; nome: string; codigo: string; cpf: string }
type Profissional = { id: string; nome: string; especialidades: { id: string; nome: string }[] }
type Consultorio = { id: string; identificacao: string; clinicaId: string }
type Clinica = { id: string; nome: string }

type Props = {
  pacientes: Paciente[]
  profissionais: Profissional[]
  consultorios: Consultorio[]
  clinicas: Clinica[]
  clinicaAtualId: string
  onSuccess?: (id: string) => void
  onCancel?: () => void
}

export function AgendamentoForm({
  pacientes,
  profissionais,
  consultorios,
  clinicas,
  clinicaAtualId,
  onSuccess,
  onCancel,
}: Props) {
  const router = useRouter()
  const [profissionalSel, setProfissionalSel] = useState("")
  const [clinicaSel, setClinicaSel] = useState(clinicaAtualId || clinicas[0]?.id || "")
  const [pacienteBusca, setPacienteBusca] = useState("")

  const [state, formAction, pending] = useActionState(agendarConsultaAction, undefined)

  useEffect(() => {
    if (state?.sucesso && state.id) {
      if (onSuccess) onSuccess(state.id)
      else router.push(`/consultas/${state.id}`)
    }
  }, [state])

  const especialidades = profissionais.find((p) => p.id === profissionalSel)?.especialidades ?? []
  const consultoriosFiltrados = consultorios.filter((c) => c.clinicaId === clinicaSel)
  const pacientesFiltrados = pacientes.filter(
    (p) =>
      !pacienteBusca ||
      p.nome.toLowerCase().includes(pacienteBusca.toLowerCase()) ||
      p.codigo.toLowerCase().includes(pacienteBusca.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {!onCancel && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Nova Consulta</h1>
            <p className="text-sm text-slate-500">Preencha os dados para agendar</p>
          </div>
        </div>
      )}

      <form
        action={(fd) => {
          const result = formAction(fd)
          return result
        }}
        className="bg-white rounded-lg border border-slate-200 p-6 space-y-5"
      >
        {/* Clínica */}
        <div className="space-y-1">
          <Label>Unidade</Label>
          <div className="flex gap-2 flex-wrap">
            {clinicas.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setClinicaSel(c.id)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  clinicaSel === c.id
                    ? "bg-slate-700 text-white border-slate-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </div>

        {/* Paciente */}
        <div className="space-y-1">
          <Label htmlFor="paciente-busca">Paciente</Label>
          <Input
            id="paciente-busca"
            placeholder="Buscar por nome ou código..."
            value={pacienteBusca}
            onChange={(e) => setPacienteBusca(e.target.value)}
          />
          <select
            name="pacienteId"
            required
            className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="">Selecione o paciente</option>
            {pacientesFiltrados.slice(0, 50).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} — {p.codigo}
              </option>
            ))}
          </select>
        </div>

        {/* Profissional + Especialidade */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Profissional</Label>
            <select
              name="profissionalId"
              required
              value={profissionalSel}
              onChange={(e) => { setProfissionalSel(e.target.value) }}
              className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">Selecione...</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Especialidade</Label>
            <select
              name="especialidadeId"
              disabled={especialidades.length === 0}
              className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
            >
              <option value="">
                {profissionalSel ? "Selecione..." : "Selecione o profissional primeiro"}
              </option>
              {especialidades.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Consultório */}
        <div className="space-y-1">
          <Label>Consultório</Label>
          <select
            name="consultorioId"
            required
            className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="">Selecione...</option>
            {consultoriosFiltrados.map((c) => (
              <option key={c.id} value={c.id}>Sala {c.identificacao}</option>
            ))}
          </select>
        </div>

        {/* Tipo */}
        <div className="space-y-1">
          <Label>Tipo de consulta</Label>
          <div className="flex gap-2 flex-wrap">
            {TIPOS.map((t) => (
              <label key={t.value} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  value={t.value}
                  defaultChecked={t.value === "Primeira_consulta"}
                  className="accent-slate-700"
                />
                <span className="text-sm text-slate-700">{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Data / Hora / Duração */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label htmlFor="data">Data</Label>
            <Input
              id="data"
              name="data"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hora">Hora</Label>
            <Input
              id="hora"
              name="hora"
              type="time"
              required
              defaultValue="08:00"
            />
          </div>
          <div className="space-y-1">
            <Label>Duração</Label>
            <select
              name="duracaoMinutos"
              defaultValue="30"
              className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              {DURACOES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Motivo */}
        <div className="space-y-1">
          <Label htmlFor="motivo">Motivo / observações</Label>
          <textarea
            id="motivo"
            name="motivo"
            rows={3}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            placeholder="Descreva o motivo da consulta..."
          />
        </div>

        {/* Valor */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              name="valor"
              type="text"
              placeholder="0,00"
            />
          </div>
          <div className="space-y-1">
            <Label>Forma de pagamento</Label>
            <select
              name="formaPagamento"
              className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">Não informado</option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {state?.erro && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{state.erro}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending} className="flex-1">
            {pending ? "Salvando..." : "Confirmar agendamento"}
          </Button>
        </div>
      </form>
    </div>
  )
}
