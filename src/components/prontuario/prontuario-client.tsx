"use client"

import { useState, useTransition, useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { criarEntradaAction, editarEntradaAction, finalizarEntradaAction, type EntradaActionState } from "@/app/(app)/prontuario/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Plus, AlertTriangle, FileText, ChevronRight, CheckCircle, Edit } from "lucide-react"
import { toast } from "sonner"

type Paciente = { id: string; codigo: string; nome: string; cpf: string; alergias?: string | null }
type PacienteAtual = Paciente & {
  dataNascimento: string
  sexo: string
  telefone: string
}
type Campo = {
  id?: string
  tipo: string
  nomeCustom?: string | null
  valor?: string | null
  unidade?: string | null
  preco?: number | null
}
type Entrada = {
  id: string
  data: string
  profissionalNome: string
  especialidadeId: string
  especialidadeNome: string
  texto: string
  valorConsulta: number
  totalProcedimentos: number
  rascunho: boolean
  campos: Campo[]
}
type Especialidade = { id: string; nome: string }
type ConsultaVinculo = { id: string; numero: string; data: string; profissionalNome: string }

type Props = {
  pacientes: Paciente[]
  pacienteAtual: PacienteAtual | null
  entradas: Entrada[]
  entradaSelecionada: Entrada | null
  especialidades: Especialidade[]
  consultasPaciente: ConsultaVinculo[]
  pacienteIdAtual: string | null
  entradaIdAtual: string | null
  busca: string
  canCreate: boolean
  canEdit: boolean
}

const CAMPO_TIPOS = [
  { tipo: "PressaoArterial", label: "Pressão Arterial", unidade: "mmHg" },
  { tipo: "Peso", label: "Peso", unidade: "kg" },
  { tipo: "Altura", label: "Altura", unidade: "cm" },
  { tipo: "Temperatura", label: "Temperatura", unidade: "°C" },
  { tipo: "Glicemia", label: "Glicemia", unidade: "mg/dL" },
  { tipo: "Saturacao", label: "Saturação O₂", unidade: "%" },
  { tipo: "FrequenciaCardiaca", label: "Freq. Cardíaca", unidade: "bpm" },
  { tipo: "Procedimento", label: "Procedimento", temPreco: true },
  { tipo: "Medicamento", label: "Medicamento" },
  { tipo: "Exame", label: "Exame" },
  { tipo: "Custom", label: "Campo Personalizado" },
]

type CampoForm = {
  tipo: string
  nomeCustom: string
  valor: string
  unidade: string
  preco: string
}

function calcIdade(iso: string): number {
  const nasc = new Date(iso)
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  if (
    hoje.getMonth() < nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())
  )
    idade--
  return idade
}

export function ProntuarioClient({
  pacientes,
  pacienteAtual,
  entradas,
  entradaSelecionada,
  especialidades,
  consultasPaciente,
  pacienteIdAtual,
  entradaIdAtual,
  busca,
  canCreate,
  canEdit,
}: Props) {
  const router = useRouter()
  const [buscaLocal, setBuscaLocal] = useState(busca)
  const [, startTransition] = useTransition()

  const [modoEditor, setModoEditor] = useState<"nova" | "editar" | null>(null)
  const [camposForm, setCamposForm] = useState<CampoForm[]>([])

  // Actions
  const [stateCriar, formCriar, pendingCriar] = useActionState<EntradaActionState, FormData>(criarEntradaAction, undefined)
  const [stateEditar, formEditar, pendingEditar] = useActionState<EntradaActionState, FormData>(editarEntradaAction, undefined)
  const [stateFinalizar, formFinalizar, pendingFinalizar] = useActionState<EntradaActionState, FormData>(finalizarEntradaAction, undefined)

  useEffect(() => {
    if (stateCriar?.sucesso) { toast.success("Rascunho salvo"); setModoEditor(null) }
    if (stateCriar?.erro) toast.error(stateCriar.erro)
  }, [stateCriar])

  useEffect(() => {
    if (stateEditar?.sucesso) { toast.success("Entrada atualizada"); setModoEditor(null) }
    if (stateEditar?.erro) toast.error(stateEditar.erro)
  }, [stateEditar])

  useEffect(() => {
    if (stateFinalizar?.sucesso) toast.success("Entrada finalizada")
    if (stateFinalizar?.erro) toast.error(stateFinalizar.erro)
  }, [stateFinalizar])

  function buscarPaciente(e: React.FormEvent) {
    e.preventDefault()
    startTransition(() => {
      router.push(`/prontuario?q=${encodeURIComponent(buscaLocal)}`)
    })
  }

  function selecionarPaciente(id: string) {
    startTransition(() => {
      router.push(`/prontuario?pacienteId=${id}`)
    })
  }

  function selecionarEntrada(id: string) {
    startTransition(() => {
      router.push(`/prontuario?pacienteId=${pacienteIdAtual}&entradaId=${id}`)
    })
  }

  function novaEntrada() {
    setCamposForm([])
    setModoEditor("nova")
  }

  function editarEntrada(entrada: Entrada) {
    setCamposForm(
      entrada.campos.map((c) => ({
        tipo: c.tipo,
        nomeCustom: c.nomeCustom ?? "",
        valor: c.valor ?? "",
        unidade: c.unidade ?? "",
        preco: c.preco?.toString() ?? "",
      }))
    )
    setModoEditor("editar")
  }

  function adicionarCampo(tipo: string) {
    const def = CAMPO_TIPOS.find((t) => t.tipo === tipo)
    setCamposForm((prev) => [
      ...prev,
      { tipo, nomeCustom: "", valor: "", unidade: def?.unidade ?? "", preco: "" },
    ])
  }

  function removerCampo(idx: number) {
    setCamposForm((prev) => prev.filter((_, i) => i !== idx))
  }

  function atualizarCampo(idx: number, field: keyof CampoForm, value: string) {
    setCamposForm((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }

  const hojeISO = new Date().toISOString().slice(0, 10)

  // Renderiza campos hidden para campos clínicos
  function renderCamposHidden() {
    return camposForm.map((c, i) => (
      <span key={i}>
        <input type="hidden" name={`campo_tipo_${i}`} value={c.tipo} />
        <input type="hidden" name={`campo_valor_${i}`} value={c.valor} />
        <input type="hidden" name={`campo_unidade_${i}`} value={c.unidade} />
        <input type="hidden" name={`campo_nome_${i}`} value={c.nomeCustom} />
        <input type="hidden" name={`campo_preco_${i}`} value={c.preco} />
      </span>
    ))
  }

  return (
    <div className="flex h-[calc(100vh-60px)]">
      {/* Painel Esquerdo */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
        {/* Busca de paciente */}
        <div className="p-4 border-b border-slate-100">
          <form onSubmit={buscarPaciente} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                value={buscaLocal}
                onChange={(e) => setBuscaLocal(e.target.value)}
                placeholder="Buscar paciente..."
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Button type="submit" size="sm" variant="outline" className="h-8">
              <Search className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>

        {/* Pacientes encontrados ou paciente atual */}
        {!pacienteAtual && (
          <div className="flex-1 overflow-y-auto">
            {pacientes.length === 0 && busca ? (
              <p className="text-sm text-slate-400 p-4">Nenhum paciente encontrado</p>
            ) : pacientes.length === 0 ? (
              <p className="text-sm text-slate-400 p-4">Busque um paciente pelo nome, CPF ou código</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {pacientes.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selecionarPaciente(p.id)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-slate-900 truncate">{p.nome}</p>
                    <p className="text-xs text-slate-500">#{p.codigo} · {p.cpf}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {pacienteAtual && (
          <>
            {/* Info do paciente selecionado */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 font-mono">#{pacienteAtual.codigo}</p>
                  <p className="font-semibold text-slate-900 truncate">{pacienteAtual.nome}</p>
                  <p className="text-xs text-slate-500">{pacienteAtual.sexo} · {calcIdade(pacienteAtual.dataNascimento)} anos</p>
                </div>
                <button
                  onClick={() => router.push("/prontuario")}
                  className="text-xs text-slate-400 hover:text-slate-600 ml-2"
                >
                  Trocar
                </button>
              </div>
              {pacienteAtual.alergias && (
                <div className="mt-2 flex items-center gap-1 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span className="truncate">{pacienteAtual.alergias}</span>
                </div>
              )}
            </div>

            {/* Lista de entradas */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Entradas ({entradas.length})
                </span>
                {canCreate && (
                  <button
                    onClick={novaEntrada}
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova
                  </button>
                )}
              </div>

              {entradas.length === 0 ? (
                <p className="text-sm text-slate-400 p-4">Nenhuma entrada registrada</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {entradas.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => selecionarEntrada(e.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                        e.id === entradaIdAtual ? "bg-slate-100" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {new Date(e.data).toLocaleDateString("pt-BR")}
                        </span>
                        <div className="flex items-center gap-1">
                          {e.rascunho && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 rounded">
                              Rascunho
                            </span>
                          )}
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-800 truncate">{e.especialidadeNome}</p>
                      <p className="text-xs text-slate-500 truncate">{e.profissionalNome}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Painel Direito */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
        {/* Editor: nova entrada */}
        {modoEditor === "nova" && pacienteAtual && (
          <EntradaEditor
            modo="nova"
            pacienteId={pacienteAtual.id}
            especialidades={especialidades}
            consultasPaciente={consultasPaciente}
            camposForm={camposForm}
            onAdicionarCampo={adicionarCampo}
            onRemoverCampo={removerCampo}
            onAtualizarCampo={atualizarCampo}
            renderCamposHidden={renderCamposHidden}
            formAction={formCriar}
            pending={pendingCriar}
            hojeISO={hojeISO}
            onCancelar={() => setModoEditor(null)}
          />
        )}

        {/* Editor: editar entrada */}
        {modoEditor === "editar" && entradaSelecionada && pacienteAtual && (
          <EntradaEditor
            modo="editar"
            pacienteId={pacienteAtual.id}
            entrada={entradaSelecionada}
            especialidades={especialidades}
            consultasPaciente={consultasPaciente}
            camposForm={camposForm}
            onAdicionarCampo={adicionarCampo}
            onRemoverCampo={removerCampo}
            onAtualizarCampo={atualizarCampo}
            renderCamposHidden={renderCamposHidden}
            formAction={formEditar}
            pending={pendingEditar}
            hojeISO={hojeISO}
            onCancelar={() => setModoEditor(null)}
          />
        )}

        {/* Visualizar entrada selecionada */}
        {modoEditor === null && entradaSelecionada && (
          <EntradaView
            entrada={entradaSelecionada}
            canEdit={canEdit}
            formFinalizar={formFinalizar}
            pendingFinalizar={pendingFinalizar}
            onEditar={() => editarEntrada(entradaSelecionada)}
          />
        )}

        {/* Estado inicial */}
        {modoEditor === null && !entradaSelecionada && !pacienteAtual && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Selecione um paciente</p>
            <p className="text-sm text-slate-400 mt-1">Busque pelo nome, CPF ou código do paciente</p>
          </div>
        )}

        {modoEditor === null && !entradaSelecionada && pacienteAtual && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nenhuma entrada selecionada</p>
            {canCreate && (
              <Button onClick={novaEntrada} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Nova Entrada
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente: visualizar entrada ────────────────────────────────────────────
function EntradaView({
  entrada,
  canEdit,
  formFinalizar,
  pendingFinalizar,
  onEditar,
}: {
  entrada: Entrada
  canEdit: boolean
  formFinalizar: (payload: FormData) => void
  pendingFinalizar: boolean
  onEditar: () => void
}) {
  const totalProc = entrada.campos
    .filter((c) => c.tipo === "Procedimento" && c.preco)
    .reduce((s, c) => s + (c.preco ?? 0), 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{new Date(entrada.data).toLocaleDateString("pt-BR")}</p>
            <CardTitle className="text-lg">{entrada.especialidadeNome}</CardTitle>
            <p className="text-sm text-slate-500">{entrada.profissionalNome}</p>
          </div>
          <div className="flex items-center gap-2">
            {entrada.rascunho && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-medium">
                Rascunho
              </span>
            )}
            {canEdit && entrada.rascunho && (
              <form action={formFinalizar}>
                <input type="hidden" name="entradaId" value={entrada.id} />
                <Button type="submit" size="sm" disabled={pendingFinalizar}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Finalizar
                </Button>
              </form>
            )}
            {canEdit && entrada.rascunho && (
              <Button size="sm" variant="outline" onClick={onEditar}>
                <Edit className="w-3.5 h-3.5 mr-1" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Texto clínico */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Anamnese / Observações</h4>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{entrada.texto}</p>
        </div>

        {/* Campos clínicos */}
        {entrada.campos.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Dados Clínicos</h4>
            <div className="grid grid-cols-2 gap-2">
              {entrada.campos.map((c, i) => {
                const def = CAMPO_TIPOS.find((t) => t.tipo === c.tipo)
                const label = c.tipo === "Custom" ? (c.nomeCustom ?? "Campo") : def?.label ?? c.tipo
                return (
                  <div key={i} className="bg-slate-50 rounded p-2">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-sm font-medium text-slate-800">
                      {c.valor ?? "—"}
                      {c.unidade && <span className="text-xs text-slate-400 ml-1">{c.unidade}</span>}
                      {c.preco != null && (
                        <span className="text-xs text-slate-400 ml-1">
                          · R$ {c.preco.toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Totais */}
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <p className="text-xs text-slate-500">Valor da Consulta</p>
            <p className="text-sm font-semibold">R$ {entrada.valorConsulta.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Procedimentos</p>
            <p className="text-sm font-semibold">R$ {totalProc.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Componente: editor de entrada ─────────────────────────────────────────────
function EntradaEditor({
  modo,
  pacienteId,
  entrada,
  especialidades,
  consultasPaciente,
  camposForm,
  onAdicionarCampo,
  onRemoverCampo,
  onAtualizarCampo,
  renderCamposHidden,
  formAction,
  pending,
  hojeISO,
  onCancelar,
}: {
  modo: "nova" | "editar"
  pacienteId: string
  entrada?: Entrada
  especialidades: Especialidade[]
  consultasPaciente: ConsultaVinculo[]
  camposForm: CampoForm[]
  onAdicionarCampo: (tipo: string) => void
  onRemoverCampo: (idx: number) => void
  onAtualizarCampo: (idx: number, field: "tipo" | "nomeCustom" | "valor" | "unidade" | "preco", value: string) => void
  renderCamposHidden: () => React.ReactNode
  formAction: (payload: FormData) => void
  pending: boolean
  hojeISO: string
  onCancelar: () => void
}) {
  const totalProc = camposForm
    .filter((c) => c.tipo === "Procedimento" && c.preco)
    .reduce((s, c) => s + (parseFloat(c.preco) || 0), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{modo === "nova" ? "Nova Entrada" : "Editar Entrada"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="pacienteId" value={pacienteId} />
          {modo === "editar" && entrada && (
            <input type="hidden" name="entradaId" value={entrada.id} />
          )}
          {renderCamposHidden()}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                name="data"
                type="date"
                defaultValue={
                  entrada ? new Date(entrada.data).toISOString().slice(0, 10) : hojeISO
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="especialidadeId">Especialidade *</Label>
              <select
                id="especialidadeId"
                name="especialidadeId"
                defaultValue={entrada?.especialidadeId ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                required
              >
                <option value="">Selecione...</option>
                {especialidades.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
            {consultasPaciente.length > 0 && (
              <div className="col-span-2">
                <Label htmlFor="consultaId">Vincular à Consulta (opcional)</Label>
                <select
                  id="consultaId"
                  name="consultaId"
                  defaultValue={entrada ? "" : ""}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">Nenhuma</option>
                  {consultasPaciente.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numero} · {new Date(c.data).toLocaleDateString("pt-BR")} · {c.profissionalNome}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label htmlFor="valorConsulta">Valor da Consulta (R$)</Label>
              <Input
                id="valorConsulta"
                name="valorConsulta"
                type="number"
                step="0.01"
                min="0"
                defaultValue={entrada?.valorConsulta ?? "0"}
              />
            </div>
            <div>
              <Label>Total Procedimentos</Label>
              <Input
                name="totalProcedimentos"
                type="number"
                step="0.01"
                min="0"
                value={totalProc.toFixed(2)}
                readOnly
                className="bg-slate-50"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="texto">Anamnese / Observações *</Label>
            <textarea
              id="texto"
              name="texto"
              rows={5}
              defaultValue={entrada?.texto ?? ""}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none mt-1"
              placeholder="Descreva a evolução clínica, queixas, diagnóstico..."
              required
            />
          </div>

          {/* Campos clínicos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Dados Clínicos</Label>
              <select
                onChange={(e) => { if (e.target.value) { onAdicionarCampo(e.target.value); e.target.value = "" } }}
                className="text-xs border border-slate-200 rounded px-2 py-1"
              >
                <option value="">+ Adicionar campo</option>
                {CAMPO_TIPOS.map((t) => (
                  <option key={t.tipo} value={t.tipo}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              {camposForm.map((c, i) => {
                const def = CAMPO_TIPOS.find((t) => t.tipo === c.tipo)
                return (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 rounded p-2">
                    {c.tipo === "Custom" && (
                      <Input
                        placeholder="Nome do campo"
                        value={c.nomeCustom}
                        onChange={(e) => onAtualizarCampo(i, "nomeCustom", e.target.value)}
                        className="h-7 text-xs w-28"
                      />
                    )}
                    {c.tipo !== "Custom" && (
                      <span className="text-xs text-slate-500 w-32 shrink-0">{def?.label ?? c.tipo}</span>
                    )}
                    <Input
                      placeholder="Valor"
                      value={c.valor}
                      onChange={(e) => onAtualizarCampo(i, "valor", e.target.value)}
                      className="h-7 text-xs flex-1"
                    />
                    <Input
                      placeholder="Unidade"
                      value={c.unidade}
                      onChange={(e) => onAtualizarCampo(i, "unidade", e.target.value)}
                      className="h-7 text-xs w-16"
                    />
                    {(c.tipo === "Procedimento" || c.tipo === "Exame") && (
                      <Input
                        placeholder="R$"
                        type="number"
                        step="0.01"
                        min="0"
                        value={c.preco}
                        onChange={(e) => onAtualizarCampo(i, "preco", e.target.value)}
                        className="h-7 text-xs w-20"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoverCampo(i)}
                      className="text-xs text-red-400 hover:text-red-600 px-1"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar Rascunho"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
