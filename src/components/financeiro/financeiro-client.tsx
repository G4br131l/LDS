"use client"

import { useActionState, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { registrarPagamentoAction } from "@/app/(app)/financeiro/actions"
import { alterarStatusConsultaAction } from "@/app/(app)/consultas/actions"
import { toast } from "sonner"

const STATUS_PAG: Record<string, string> = {
  Pendente: "bg-red-100 text-red-600 border-red-200",
  Recebido: "bg-green-100 text-green-700 border-green-200",
  Parcial: "bg-yellow-100 text-yellow-700 border-yellow-200",
}

const FORMAS = [
  { value: "Pix", label: "Pix" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Transferencia", label: "Transferência" },
  { value: "Cartao_credito", label: "Cartão de crédito" },
  { value: "Cartao_debito", label: "Cartão de débito" },
  { value: "Particular", label: "Particular" },
]

type ExtratoProfissional = {
  id: string
  nome: string
  modeloCobranca: string
  valorCobranca: number
  consultasCount: number
  totalConsultas: number
  valorDevido: number
  valorRecebido: number
  status: string
  pagamentoId: string | null
  formaPagamento: string | null
  dataRecebimento: string | null
}

type ConsultaNaoReg = {
  id: string
  pacienteNome: string
  profissionalNome: string
  consultorioNome: string
  data: string
  hora: string
  status: string
}

type Kpis = {
  aReceberMes: number
  aReceberSemana: number
  recebido: number
  pendentes: number
}

type Props = {
  extrato: ExtratoProfissional[]
  consultasNaoRegistradas: ConsultaNaoReg[]
  clinicas: { id: string; nome: string }[]
  clinicaAtualId: string
  kpis: Kpis
  semanaAtual: string
  semanaAnterior: string
  semanaProxima: string
  dataInicio: string
  dataFim: string
  canEdit: boolean
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtData(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  })
}

export function FinanceiroClient({
  extrato,
  consultasNaoRegistradas,
  kpis,
  semanaAnterior,
  semanaProxima,
  dataInicio,
  dataFim,
  clinicaAtualId,
  clinicas,
  canEdit,
}: Props) {
  const router = useRouter()
  const [profSel, setProfSel] = useState<ExtratoProfissional | null>(null)
  const [, startTransition] = useTransition()

  const [state, formAction, pending] = useActionState(registrarPagamentoAction, undefined)

  if (state?.sucesso) {
    toast.success("Pagamento registrado")
    router.refresh()
  }

  const semanaLabel = `${fmtData(dataInicio)} – ${fmtData(dataFim)}`

  function marcarConsulta(id: string, status: "Realizada" | "Nao_compareceu") {
    startTransition(async () => {
      const { erro } = await alterarStatusConsultaAction(id, status)
      if (erro) toast.error(erro)
      else {
        toast.success(status === "Realizada" ? "Marcada como realizada" : "Marcada como não compareceu")
        router.refresh()
      }
    })
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cobrança semanal · {semanaLabel}</p>
        </div>
        {/* Navegação semanal */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push(`/financeiro?semana=${semanaAnterior}`)}
            className="p-1.5 rounded border border-slate-200 hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm text-slate-600 font-medium min-w-[160px] text-center">
            {semanaLabel}
          </span>
          <button
            onClick={() => router.push(`/financeiro?semana=${semanaProxima}`)}
            className="p-1.5 rounded border border-slate-200 hover:bg-slate-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filtro clínica */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-500">Unidade:</span>
        {clinicas.map((c) => (
          <button
            key={c.id}
            onClick={() => router.push(`/financeiro?semana=${dataInicio}`)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              clinicaAtualId === c.id
                ? "bg-slate-700 text-white border-slate-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {c.nome}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-400">A receber no mês</p>
          <p className="text-xl font-bold text-blue-600">R$ {fmt(kpis.aReceberMes)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Total calculado</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-400">A receber na semana</p>
          <p className="text-xl font-bold text-blue-600">R$ {fmt(kpis.aReceberSemana)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{semanaLabel}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Já recebido</p>
          <p className="text-xl font-bold text-green-600">R$ {fmt(kpis.recebido)}</p>
          <p className="text-xs text-slate-400 mt-0.5">No mês</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Pendente</p>
          <p className="text-xl font-bold text-red-500">{kpis.pendentes}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {kpis.pendentes === 1 ? "profissional" : "profissionais"}
          </p>
        </div>
      </div>

      {/* Corpo */}
      <div className="grid grid-cols-3 gap-5">
        {/* Extrato + formulário */}
        <div className="col-span-2 space-y-4">
          {/* Tabela extrato */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="font-semibold text-sm text-slate-700">
                Extrato por profissional — {semanaLabel}
              </p>
            </div>
            {extrato.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                Nenhum profissional vinculado nesta clínica
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-100">
                    <th className="px-4 py-2 text-left font-medium">Profissional</th>
                    <th className="px-3 py-2 text-left font-medium">Modelo</th>
                    <th className="px-3 py-2 text-center font-medium">Consultas</th>
                    <th className="px-3 py-2 text-right font-medium">Valor devido</th>
                    <th className="px-3 py-2 text-center font-medium">Situação</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {extrato.map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800">{e.nome}</td>
                      <td className="px-3 py-3 text-slate-500 text-xs">
                        {e.modeloCobranca === "Percentual"
                          ? `Percentual ${e.valorCobranca}%`
                          : `Aluguel R$ ${fmt(e.valorCobranca)}`}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600">
                        {e.consultasCount}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-slate-800">
                        R$ {fmt(e.valorDevido)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge className={`text-xs ${STATUS_PAG[e.status] ?? ""}`}>
                          {e.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {e.status !== "Recebido" && canEdit ? (
                          <button
                            onClick={() => setProfSel(e)}
                            className="text-xs px-2.5 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            Registrar
                          </button>
                        ) : (
                          <button
                            onClick={() => setProfSel(e)}
                            className="text-xs px-2.5 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                          >
                            Ver
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Formulário de pagamento */}
          {canEdit && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
              <p className="font-semibold text-sm text-slate-700">Registrar pagamento recebido</p>
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="dataInicio" value={dataInicio} />
                <input type="hidden" name="dataFim" value={dataFim} />
                <input type="hidden" name="clinicaId" value={clinicaAtualId} />
                <input
                  type="hidden"
                  name="valorDevido"
                  value={profSel ? profSel.valorDevido.toString() : "0"}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Profissional</Label>
                    <select
                      name="profissionalId"
                      required
                      value={profSel?.id ?? ""}
                      onChange={(e) => {
                        const found = extrato.find((x) => x.id === e.target.value)
                        setProfSel(found ?? null)
                      }}
                      className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      <option value="">Selecionar...</option>
                      {extrato.map((e) => (
                        <option key={e.id} value={e.id}>{e.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Semana</Label>
                    <Input value={semanaLabel} readOnly className="bg-slate-50 text-slate-500" />
                  </div>
                </div>

                {profSel && (
                  <div className="px-3 py-2 bg-slate-50 rounded text-xs text-slate-600">
                    Valor devido:{" "}
                    <span className="font-bold">R$ {fmt(profSel.valorDevido)}</span>
                    {profSel.consultasCount > 0 && (
                      <span className="ml-2 text-slate-400">
                        ({profSel.consultasCount} consultas · total R$ {fmt(profSel.totalConsultas)})
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="valor-rec">Valor recebido</Label>
                    <Input
                      id="valor-rec"
                      name="valorRecebido"
                      type="text"
                      placeholder="0,00"
                      defaultValue={profSel?.valorDevido ? fmt(profSel.valorDevido) : ""}
                      key={profSel?.id ?? "none"}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Forma</Label>
                    <select
                      name="formaPagamento"
                      className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      <option value="">Selecione...</option>
                      {FORMAS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dt-rec">Data</Label>
                    <Input
                      id="dt-rec"
                      name="dataRecebimento"
                      type="date"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                </div>

                {state?.erro && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{state.erro}</p>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={pending || !profSel}>
                    {pending ? "Salvando..." : "Registrar pagamento"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Consultas não registradas */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <p className="font-semibold text-sm text-slate-700">
              Consultas não registradas
              {consultasNaoRegistradas.length > 0 && (
                <span className="ml-1.5 bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded-full">
                  {consultasNaoRegistradas.length}
                </span>
              )}
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Agendadas/confirmadas há mais de 7 dias sem confirmação de realização
          </p>

          {consultasNaoRegistradas.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700 text-center">
              ✓ Tudo em dia
            </div>
          ) : (
            <div className="space-y-2">
              {consultasNaoRegistradas.map((c) => (
                <div
                  key={c.id}
                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2"
                >
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{c.pacienteNome}</p>
                    <p className="text-xs text-slate-500">
                      {c.profissionalNome} · {fmtData(c.data.slice(0, 10))} · {c.hora} · Sala{" "}
                      {c.consultorioNome}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => marcarConsulta(c.id, "Realizada")}
                      className="flex-1 text-xs py-1 rounded border border-green-300 text-green-700 hover:bg-green-100 transition-colors"
                    >
                      ✓ Realizada
                    </button>
                    <button
                      onClick={() => marcarConsulta(c.id, "Nao_compareceu")}
                      className="flex-1 text-xs py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      ✕ Não
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
