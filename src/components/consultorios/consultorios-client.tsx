"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GradeHorarios } from "./grade-horarios"
import { AgendarSala } from "./agendar-sala"
import { ConsultorioForm } from "./consultorio-form"
import { PlusCircle } from "lucide-react"

const STATUS_CORES: Record<string, string> = {
  Ativo: "bg-green-100 text-green-700",
  Manutencao: "bg-yellow-100 text-yellow-700",
  Inativo: "bg-gray-100 text-gray-500",
}

type ConsultorioRow = {
  id: string
  clinicaId: string
  clinicaNome: string
  identificacao: string
  andar: string | null
  especialidadePrincipal: string | null
  capacidade: string
  horaAbertura: string | null
  horaFechamento: string | null
  valorPorHora: number | null
  status: string
  observacoes: string | null
}

type AgendamentoRow = {
  id: string
  consultorioId: string
  consultorioNome: string
  profissionalNome: string
  data: string
  recorrencia: string
  horarios: string[]
}

type ProfissionalOpcao = { id: string; nome: string }

type Clinica = { id: string; nome: string }

type OcupacaoItem = { salaId: string; salaNome: string; quem: string; tipo: "agendamento" | "consulta" }

type Props = {
  consultorios: ConsultorioRow[]
  agendamentos: AgendamentoRow[]
  profissionais: ProfissionalOpcao[]
  clinicas: Clinica[]
  clinicaAtualId: string
  semanaAtual: string
  semanaAnterior: string
  semanaProxima: string
  diaAtual: string
  diaAnterior: string
  diaProximo: string
  ocupacaoSemana: Record<string, OcupacaoItem[]>
  canEdit: boolean
  canCreate: boolean
}

export function ConsultoriosClient({
  consultorios,
  agendamentos,
  profissionais,
  clinicas,
  clinicaAtualId,
  semanaAtual,
  semanaAnterior,
  semanaProxima,
  diaAtual,
  diaAnterior,
  diaProximo,
  ocupacaoSemana,
  canEdit,
  canCreate,
}: Props) {
  const [clinicaId, setClinicaId] = useState(clinicaAtualId || clinicas[0]?.id || "")
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<ConsultorioRow | undefined>()

  const clinicaNome = clinicas.find((c) => c.id === clinicaId)?.nome ?? "—"
  const consultoriosFiltrados = consultorios.filter((c) => c.clinicaId === clinicaId)
  const agendamentosFiltrados = agendamentos.filter((a) => {
    const sala = consultorios.find((c) => c.id === a.consultorioId)
    return sala?.clinicaId === clinicaId
  })

  const salasColunas = consultoriosFiltrados
    .filter((c) => c.status === "Ativo")
    .map((c) => ({
      id: c.id,
      identificacao: c.identificacao,
      especialidadePrincipal: c.especialidadePrincipal,
    }))

  function abrirEditar(c: ConsultorioRow) {
    setEditando(c)
    setShowForm(true)
  }

  function fecharForm() {
    setShowForm(false)
    setEditando(undefined)
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Consultórios & Turnos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestão de salas por unidade</p>
        </div>
        {canCreate && (
          <Button size="sm" className="gap-1.5" onClick={() => { setEditando(undefined); setShowForm(true) }}>
            <PlusCircle className="w-4 h-4" />
            Novo Consultório
          </Button>
        )}
      </div>

      {/* Filtro de clínica */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-500">Unidade:</span>
        {clinicas.map((c) => (
          <button
            key={c.id}
            onClick={() => setClinicaId(c.id)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              clinicaId === c.id
                ? "bg-slate-700 text-white border-slate-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {c.nome}
          </button>
        ))}
      </div>

      <Tabs defaultValue="ocupacao">
        <TabsList>
          <TabsTrigger value="ocupacao">Grade de Horários</TabsTrigger>
          <TabsTrigger value="lista">Lista de Salas</TabsTrigger>
          <TabsTrigger value="turnos">Agendar Sala</TabsTrigger>
        </TabsList>

        {/* ── GRADE ──────────────────────────────────────────────────── */}
        <TabsContent value="ocupacao" className="mt-4">
          <GradeHorarios
            salas={salasColunas}
            ocupacaoSemana={ocupacaoSemana}
            semanaAtual={semanaAtual}
            semanaAnterior={semanaAnterior}
            semanaProxima={semanaProxima}
            diaAtual={diaAtual}
            diaAnterior={diaAnterior}
            diaProximo={diaProximo}
            clinicaId={clinicaId}
          />
        </TabsContent>

        {/* ── LISTA ──────────────────────────────────────────────────── */}
        <TabsContent value="lista" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {consultoriosFiltrados.map((sala) => (
              <div
                key={sala.id}
                className="bg-white rounded-lg border border-slate-200 p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-800 text-lg leading-tight">
                      Sala {sala.identificacao}
                    </p>
                    {sala.andar && (
                      <p className="text-xs text-slate-400">{sala.andar}</p>
                    )}
                  </div>
                  <Badge className={STATUS_CORES[sala.status] ?? ""}>
                    {sala.status === "Manutencao" ? "Manutenção" : sala.status}
                  </Badge>
                </div>
                {sala.especialidadePrincipal && (
                  <p className="text-sm text-slate-600">{sala.especialidadePrincipal}</p>
                )}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{sala.capacidade}</span>
                  {sala.valorPorHora && (
                    <span>
                      R$ {sala.valorPorHora.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/h
                    </span>
                  )}
                </div>
                {canEdit && (
                  <button
                    onClick={() => abrirEditar(sala)}
                    className="w-full text-xs text-blue-600 hover:underline text-left pt-1"
                  >
                    Editar
                  </button>
                )}
              </div>
            ))}

            {/* Card "+ Novo" */}
            {canCreate && (
              <button
                onClick={() => { setEditando(undefined); setShowForm(true) }}
                className="bg-white rounded-lg border-2 border-dashed border-slate-200 p-4 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-colors min-h-[120px]"
              >
                <span className="text-2xl leading-none">+</span>
                <span className="text-xs">Novo consultório</span>
              </button>
            )}

            {consultoriosFiltrados.length === 0 && !canCreate && (
              <p className="col-span-full text-sm text-slate-400 text-center py-8">
                Nenhum consultório cadastrado nesta unidade
              </p>
            )}
          </div>
        </TabsContent>

        {/* ── AGENDAR ────────────────────────────────────────────────── */}
        <TabsContent value="turnos" className="mt-4">
          <AgendarSala
            agendamentos={agendamentosFiltrados}
            salas={consultoriosFiltrados
              .filter((c) => c.status === "Ativo")
              .map((c) => ({
                id: c.id,
                identificacao: c.identificacao,
                clinicaNome: c.clinicaNome,
              }))}
            profissionais={profissionais}
            canEdit={canEdit}
          />
        </TabsContent>
      </Tabs>

      {/* Modal cadastro/edição */}
      {showForm && (
        <ConsultorioForm
          open={showForm}
          onClose={fecharForm}
          clinicaId={editando?.clinicaId ?? clinicaId}
          consultorio={editando}
        />
      )}
    </div>
  )
}
