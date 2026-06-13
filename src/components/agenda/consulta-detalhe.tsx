"use client"

import { useActionState, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import { alterarStatusConsultaAction, reagendarConsultaAction, registrarPagamentoConsultaAction } from "@/app/(app)/consultas/actions"
import { toast } from "sonner"

const STATUS_LABEL: Record<string, string> = {
  Agendada: "Agendada",
  Confirmada: "Confirmada",
  Realizada: "Realizada",
  Cancelada: "Cancelada",
  Nao_compareceu: "Não compareceu",
}

const STATUS_BADGE: Record<string, string> = {
  Agendada: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Confirmada: "bg-blue-100 text-blue-700 border-blue-200",
  Realizada: "bg-green-100 text-green-700 border-green-200",
  Cancelada: "bg-red-100 text-red-600 border-red-200",
  Nao_compareceu: "bg-gray-100 text-gray-500 border-gray-200",
}

const TIPO_LABEL: Record<string, string> = {
  Primeira_consulta: "Primeira consulta",
  Retorno: "Retorno",
  Procedimento: "Procedimento",
  Urgencia: "Urgência",
}

const FORMAS_PAGAMENTO = [
  { value: "Particular", label: "Particular" },
  { value: "Pix", label: "Pix" },
  { value: "Cartao_credito", label: "Cartão de crédito" },
  { value: "Cartao_debito", label: "Cartão de débito" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Transferencia", label: "Transferência" },
]

type Paciente = {
  id: string
  nome: string
  codigo: string
  cpf: string
  telefone: string
  email: string | null
  dataNascimento: string
  sexo: string
  endereco: string | null
  cidade: string | null
  estado: string | null
  alergias: string | null
}

type ConsultaData = {
  id: string
  numero: string
  tipo: string
  data: string
  hora: string
  duracaoMinutos: number
  status: string
  motivo: string | null
  valor: number | null
  pago: boolean
  formaPagamento: string | null
  especialidadeNome: string | null
  profissionalNome: string
  profissionalConselho: string
  consultorioNome: string
  clinicaNome: string
  paciente: Paciente
  consultorios: { id: string; identificacao: string }[]
}

type Props = {
  consulta: ConsultaData
  canEdit: boolean
}

export function ConsultaDetalhe({ consulta, canEdit }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(consulta.status)
  const [showReagendar, setShowReagendar] = useState(false)
  const [showPagamento, setShowPagamento] = useState(false)
  const [, startTransition] = useTransition()

  const [reagendarState, reagendarAction, reagendarPending] = useActionState(reagendarConsultaAction, undefined)
  const [pagtoState, pagtoAction, pagtoPending] = useActionState(registrarPagamentoConsultaAction, undefined)

  const dataFormatada = new Date(`${consulta.data.slice(0, 10)}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  function handleStatus(novoStatus: string) {
    startTransition(async () => {
      const { erro } = await alterarStatusConsultaAction(consulta.id, novoStatus as Parameters<typeof alterarStatusConsultaAction>[1])
      if (erro) toast.error(erro)
      else {
        setStatus(novoStatus)
        toast.success("Status atualizado")
      }
    })
  }

  const canAlterar = canEdit && (status === "Agendada" || status === "Confirmada")

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800">{consulta.numero}</h1>
            <Badge className={`${STATUS_BADGE[status]} text-xs`}>
              {STATUS_LABEL[status]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {TIPO_LABEL[consulta.tipo]}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 capitalize">
            {dataFormatada} · {consulta.hora} · {consulta.duracaoMinutos} min ·{" "}
            {consulta.clinicaNome} — Sala {consulta.consultorioNome}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Tabs — 2/3 */}
        <div className="col-span-2">
          <Tabs defaultValue="resumo">
            <TabsList>
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="paciente">Paciente</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            </TabsList>

            {/* Resumo */}
            <TabsContent value="resumo" className="mt-4 space-y-4">
              <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Profissional</p>
                    <p className="font-medium text-slate-800">{consulta.profissionalNome}</p>
                    <p className="text-xs text-slate-400">{consulta.profissionalConselho}</p>
                  </div>
                  {consulta.especialidadeNome && (
                    <div>
                      <p className="text-xs text-slate-400">Especialidade</p>
                      <p className="text-slate-700">{consulta.especialidadeNome}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-400">Consultório</p>
                    <p className="text-slate-700">
                      {consulta.clinicaNome} · Sala {consulta.consultorioNome}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Tipo</p>
                    <p className="text-slate-700">{TIPO_LABEL[consulta.tipo]}</p>
                  </div>
                </div>
                {consulta.motivo && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">Motivo</p>
                    <p className="text-sm text-slate-700">{consulta.motivo}</p>
                  </div>
                )}
              </div>

              {/* Reagendar form */}
              {showReagendar && canEdit && (
                <form
                  action={reagendarAction}
                  className="bg-white rounded-lg border border-slate-200 p-4 space-y-3"
                >
                  <p className="font-semibold text-sm text-slate-700">Reagendar consulta</p>
                  <input type="hidden" name="id" value={consulta.id} />
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="nova-data">Nova data</Label>
                      <Input
                        id="nova-data"
                        name="data"
                        type="date"
                        required
                        defaultValue={consulta.data.slice(0, 10)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="nova-hora">Novo horário</Label>
                      <Input
                        id="nova-hora"
                        name="hora"
                        type="time"
                        required
                        defaultValue={consulta.hora}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Consultório</Label>
                      <select
                        name="consultorioId"
                        defaultValue=""
                        className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      >
                        <option value="">Manter atual</option>
                        {consulta.consultorios.map((c) => (
                          <option key={c.id} value={c.id}>Sala {c.identificacao}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {reagendarState?.erro && (
                    <p className="text-sm text-red-600">{reagendarState.erro}</p>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={reagendarPending}>
                      {reagendarPending ? "Salvando..." : "Confirmar reagendamento"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowReagendar(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>

            {/* Paciente */}
            <TabsContent value="paciente" className="mt-4">
              <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Nome completo</p>
                    <p className="font-medium text-slate-800">{consulta.paciente.nome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Código</p>
                    <p className="text-slate-700 font-mono">{consulta.paciente.codigo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">CPF</p>
                    <p className="text-slate-700 font-mono">{consulta.paciente.cpf}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Sexo</p>
                    <p className="text-slate-700">{consulta.paciente.sexo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Data de nascimento</p>
                    <p className="text-slate-700">
                      {new Date(`${consulta.paciente.dataNascimento.slice(0, 10)}T12:00:00Z`)
                        .toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Telefone</p>
                    <p className="text-slate-700">{consulta.paciente.telefone}</p>
                  </div>
                  {consulta.paciente.email && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-400">E-mail</p>
                      <p className="text-slate-700">{consulta.paciente.email}</p>
                    </div>
                  )}
                  {consulta.paciente.endereco && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-400">Endereço</p>
                      <p className="text-slate-700">
                        {[consulta.paciente.endereco, consulta.paciente.cidade, consulta.paciente.estado]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  )}
                  {consulta.paciente.alergias && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-400">Alergias</p>
                      <p className="text-red-700 bg-red-50 px-2 py-1 rounded text-xs">
                        ⚠ {consulta.paciente.alergias}
                      </p>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <Link href={`/pacientes/${consulta.paciente.id}/prontuario`} className="text-xs text-blue-600 hover:underline">
                    Ver prontuário completo →
                  </Link>
                </div>
              </div>
            </TabsContent>

            {/* Financeiro */}
            <TabsContent value="financeiro" className="mt-4 space-y-4">
              <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Valor</p>
                    <p className="text-lg font-bold text-slate-800">
                      {consulta.valor != null
                        ? `R$ ${consulta.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Pagamento</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${consulta.pago ? "bg-green-500" : "bg-yellow-400"}`}
                      />
                      <span className={consulta.pago ? "text-green-700" : "text-yellow-700"}>
                        {consulta.pago ? "Pago" : "Pendente"}
                      </span>
                    </div>
                  </div>
                  {consulta.formaPagamento && (
                    <div>
                      <p className="text-xs text-slate-400">Forma de pagamento</p>
                      <p className="text-slate-700">
                        {FORMAS_PAGAMENTO.find((f) => f.value === consulta.formaPagamento)?.label ??
                          consulta.formaPagamento}
                      </p>
                    </div>
                  )}
                </div>

                {!consulta.pago && canEdit && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setShowPagamento(!showPagamento)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {showPagamento ? "Fechar" : "Registrar pagamento"}
                    </button>
                  </div>
                )}
              </div>

              {showPagamento && canEdit && (
                <form
                  action={pagtoAction}
                  className="bg-white rounded-lg border border-slate-200 p-4 space-y-3"
                >
                  <p className="font-semibold text-sm text-slate-700">Registrar pagamento</p>
                  <input type="hidden" name="id" value={consulta.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="pag-valor">Valor recebido</Label>
                      <Input
                        id="pag-valor"
                        name="valor"
                        type="text"
                        placeholder="0,00"
                        defaultValue={consulta.valor?.toString() ?? ""}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Forma de pagamento</Label>
                      <select
                        name="formaPagamento"
                        defaultValue={consulta.formaPagamento ?? ""}
                        className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      >
                        <option value="">Selecione...</option>
                        {FORMAS_PAGAMENTO.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {pagtoState?.erro && (
                    <p className="text-sm text-red-600">{pagtoState.erro}</p>
                  )}
                  <Button type="submit" size="sm" disabled={pagtoPending}>
                    {pagtoPending ? "Salvando..." : "Confirmar pagamento"}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column — actions */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</p>

          {canAlterar && (
            <>
              <button
                onClick={() => handleStatus("Realizada")}
                className="w-full text-left px-3 py-2.5 text-sm rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
              >
                <span className="font-medium">✓ Marcar como realizada</span>
              </button>
              {status === "Agendada" && (
                <button
                  onClick={() => handleStatus("Confirmada")}
                  className="w-full text-left px-3 py-2.5 text-sm rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  <span className="font-medium">✓ Confirmar presença</span>
                </button>
              )}
              <button
                onClick={() => { setShowReagendar(true) }}
                className="w-full text-left px-3 py-2.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium">↺ Reagendar</span>
              </button>
              <button
                onClick={() => handleStatus("Nao_compareceu")}
                className="w-full text-left px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium">✕ Não compareceu</span>
              </button>
              <button
                onClick={() => handleStatus("Cancelada")}
                className="w-full text-left px-3 py-2.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                <span className="font-medium">✕ Cancelar consulta</span>
              </button>
            </>
          )}

          {status === "Realizada" && (
            <div className="px-3 py-2.5 text-sm rounded-lg bg-green-50 border border-green-200 text-green-700">
              ✓ Consulta realizada
            </div>
          )}
          {status === "Cancelada" && (
            <div className="px-3 py-2.5 text-sm rounded-lg bg-red-50 border border-red-200 text-red-600">
              ✕ Consulta cancelada
            </div>
          )}
          {status === "Nao_compareceu" && (
            <div className="px-3 py-2.5 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-600">
              ✕ Paciente não compareceu
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <Link href="/agenda">
              <Button variant="outline" size="sm" className="w-full">
                Voltar à agenda
              </Button>
            </Link>
            <Link href={`/pacientes/${consulta.paciente.id}/prontuario`}>
              <Button variant="outline" size="sm" className="w-full">
                Prontuário do paciente
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
