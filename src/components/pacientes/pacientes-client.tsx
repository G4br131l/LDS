"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PacienteForm } from "./paciente-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, UserPlus, Phone, Mail, MapPin, AlertTriangle, Clock } from "lucide-react"
import Link from "next/link"

type Paciente = {
  id: string
  codigo: string
  nome: string
  cpf: string
  rg?: string | null
  dataNascimento: string
  sexo: string
  status: string
  telefone: string
  telefoneAlternativo?: string | null
  email?: string | null
  endereco?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  alergias?: string | null
  observacoes?: string | null
  medicoReferenciaId?: string | null
  clinicaReferenciaId?: string | null
}

type Consulta = {
  id: string
  numero: string
  tipo: string
  data: string
  hora: string
  status: string
  profissionalNome: string
  consultorioNome: string
  especialidadeNome?: string | null
  valor?: number | null
}

type Profissional = { id: string; nome: string }

type Props = {
  pacientes: Paciente[]
  profissionais: Profissional[]
  pacienteIdSelecionado: string | null
  consultasPaciente: Consulta[]
  tabAtiva: string
  busca: string
  canEdit: boolean
  canCreate: boolean
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  Agendada: { label: "Agendada", className: "bg-yellow-100 text-yellow-800" },
  Confirmada: { label: "Confirmada", className: "bg-blue-100 text-blue-800" },
  Realizada: { label: "Realizada", className: "bg-green-100 text-green-800" },
  Cancelada: { label: "Cancelada", className: "bg-red-100 text-red-800" },
  Nao_compareceu: { label: "Não compareceu", className: "bg-gray-100 text-gray-700" },
}

function calcIdade(dataNascISO: string): number {
  const nasc = new Date(dataNascISO)
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export function PacientesClient({
  pacientes,
  profissionais,
  pacienteIdSelecionado,
  consultasPaciente,
  busca,
  canEdit,
  canCreate,
}: Props) {
  const router = useRouter()
  const [buscaLocal, setBuscaLocal] = useState(busca)
  const [selectedId, setSelectedId] = useState<string | null>(pacienteIdSelecionado)
  const [showForm, setShowForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Usa props frescos para o paciente selecionado
  const pacienteSel = selectedId ? (pacientes.find((p) => p.id === selectedId) ?? null) : null
  // Consultas: disponíveis quando o selectedId coincide com o pacienteIdSelecionado (server load)
  const consultas = selectedId === pacienteIdSelecionado ? consultasPaciente : []

  function abrirPaciente(id: string) {
    setSelectedId(id)
    // Carrega consultas via URL (server-side)
    startTransition(() => {
      router.push(`/pacientes?pacienteId=${id}&q=${encodeURIComponent(buscaLocal)}`)
    })
  }

  function fecharDetalhe() {
    setSelectedId(null)
    startTransition(() => {
      router.push(`/pacientes?q=${encodeURIComponent(buscaLocal)}`)
    })
  }

  function abrirEditar(id: string) {
    setEditandoId(id)
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

  function onFormSuccess(id: string) {
    fecharForm()
    abrirPaciente(id)
  }

  function buscar(e: React.FormEvent) {
    e.preventDefault()
    startTransition(() => {
      router.push(`/pacientes?q=${encodeURIComponent(buscaLocal)}`)
    })
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
          <p className="text-sm text-slate-500">{pacientes.length} registros encontrados</p>
        </div>
        {canCreate && (
          <Button onClick={abrirNovo}>
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Paciente
          </Button>
        )}
      </div>

      {/* Busca */}
      <form onSubmit={buscar} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={buscaLocal}
            onChange={(e) => setBuscaLocal(e.target.value)}
            placeholder="Buscar por nome, CPF ou código..."
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">Buscar</Button>
      </form>

      {/* Lista */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {pacientes.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            Nenhum paciente encontrado
          </div>
        ) : (
          pacientes.map((p) => (
            <button
              key={p.id}
              onClick={() => abrirPaciente(p.id)}
              className={`text-left p-4 rounded-lg border transition-colors bg-white hover:border-slate-400 ${
                p.id === selectedId ? "border-slate-900 bg-slate-50" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs text-slate-400 font-mono">#{p.codigo}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      p.status === "Ativo" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="font-medium text-slate-900 truncate">{p.nome}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.cpf} · {calcIdade(p.dataNascimento)} anos</p>
                  <p className="text-xs text-slate-500">{p.telefone}</p>
                </div>
                {p.alergias && (
                  <span title="Alergias registradas">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* ── Modal: Detalhe do paciente ── */}
      <Dialog open={!!pacienteSel} onOpenChange={(o) => { if (!o) fecharDetalhe() }}>
        <DialogContent showCloseButton className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {pacienteSel && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between pr-6">
                  <div>
                    <p className="text-xs text-slate-400 font-mono mb-0.5">#{pacienteSel.codigo}</p>
                    <DialogTitle>{pacienteSel.nome}</DialogTitle>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {pacienteSel.sexo} · {calcIdade(pacienteSel.dataNascimento)} anos
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {canEdit && (
                      <Button size="sm" variant="outline" onClick={() => abrirEditar(pacienteSel.id)}>
                        Editar
                      </Button>
                    )}
                    <Link href={`/prontuario?pacienteId=${pacienteSel.id}`}>
                      <Button size="sm" variant="outline">Prontuário</Button>
                    </Link>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Contato */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contato</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {pacienteSel.telefone}
                    {pacienteSel.telefoneAlternativo && ` / ${pacienteSel.telefoneAlternativo}`}
                  </div>
                  {pacienteSel.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {pacienteSel.email}
                    </div>
                  )}
                  {pacienteSel.cidade && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {[pacienteSel.cidade, pacienteSel.estado].filter(Boolean).join(" - ")}
                    </div>
                  )}
                </div>

                {/* Alergias */}
                {pacienteSel.alergias && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Alergias</span>
                    </div>
                    <p className="text-sm text-amber-800">{pacienteSel.alergias}</p>
                  </div>
                )}

                {pacienteSel.observacoes && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Observações</h4>
                    <p className="text-sm text-slate-600">{pacienteSel.observacoes}</p>
                  </div>
                )}

                {/* Últimas consultas */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Últimas Consultas
                  </h4>
                  {consultas.length === 0 ? (
                    <p className="text-sm text-slate-400">Nenhuma consulta registrada</p>
                  ) : (
                    <div className="space-y-2">
                      {consultas.map((c) => {
                        const st = STATUS_MAP[c.status] ?? { label: c.status, className: "bg-gray-100 text-gray-700" }
                        return (
                          <Link key={c.id} href={`/consultas/${c.id}`}>
                            <div className="flex items-center justify-between p-2 rounded border border-slate-100 hover:border-slate-300 transition-colors cursor-pointer">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span className="text-xs text-slate-500">
                                    {new Date(c.data).toLocaleDateString("pt-BR")} {c.hora}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-700 truncate">{c.profissionalNome}</p>
                                {c.especialidadeNome && (
                                  <p className="text-xs text-slate-400">{c.especialidadeNome}</p>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${st.className}`}>
                                {st.label}
                              </span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Cadastrar / Editar paciente ── */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) fecharForm() }}>
        <DialogContent showCloseButton className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar Paciente" : "Novo Paciente"}</DialogTitle>
          </DialogHeader>
          <PacienteForm
            paciente={editandoId ? pacientes.find((p) => p.id === editandoId) : undefined}
            profissionais={profissionais}
            onSuccess={onFormSuccess}
            onCancel={fecharForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
