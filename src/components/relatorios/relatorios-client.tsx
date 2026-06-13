"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type Profissional = { id: string; nome: string }
type Consultorio = { id: string; identificacao: string }

type Filtros = {
  tipo: string
  inicio: string
  fim: string
  profissionalId: string
  consultorioId: string
  agrupar: string
}

type ResultadoConsultas = {
  profissionalId: string
  nome: string
  total: number
  realizadas: number
  pendentes: number
}

type ResultadoReceita = {
  id: string
  nome: string
  tipo: string
  total: number
  pct: number
}

type Props = {
  profissionais: Profissional[]
  consultorios: Consultorio[]
  filtros: Filtros
  resultadoConsultas: ResultadoConsultas[]
  resultadoReceita: ResultadoReceita[]
}

export function RelatoriosClient({
  profissionais,
  consultorios,
  filtros,
  resultadoConsultas,
  resultadoReceita,
}: Props) {
  const router = useRouter()
  const mesAtual = new Date().toISOString().slice(0, 7)
  const defaultInicio = filtros.inicio || `${mesAtual}-01`
  const defaultFim =
    filtros.fim ||
    new Date(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth() + 1,
      0
    )
      .toISOString()
      .slice(0, 10)

  const [tipo, setTipo] = useState(filtros.tipo || "consultas")
  const [inicio, setInicio] = useState(defaultInicio)
  const [fim, setFim] = useState(defaultFim)
  const [profissionalId, setProfissionalId] = useState(filtros.profissionalId)
  const [consultorioId, setConsultorioId] = useState(filtros.consultorioId)
  const [agrupar, setAgrupar] = useState(filtros.agrupar || "medico")

  function gerar() {
    const params = new URLSearchParams({
      tipo,
      inicio,
      fim,
      ...(profissionalId ? { profissionalId } : {}),
      ...(consultorioId ? { consultorioId } : {}),
      agrupar,
    })
    router.push(`/relatorios?${params.toString()}`)
  }

  const temResultado = resultadoConsultas.length > 0 || resultadoReceita.length > 0
  const totalConsultas = resultadoConsultas.reduce((s, r) => s + r.total, 0)
  const totalRealizadas = resultadoConsultas.reduce((s, r) => s + r.realizadas, 0)
  const totalReceita = resultadoReceita.reduce((s, r) => s + r.total, 0)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Relatórios Gerenciais</h1>
        <p className="text-sm text-slate-500 mt-0.5">Geração de relatórios por período</p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* ── FILTROS DE CONSULTAS ────────────────────────────── */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
          <p className="font-semibold text-sm text-slate-700">Relatório de Consultas por Período</p>

          <div className="flex gap-2">
            {[
              { value: "consultas", label: "Consultas" },
              { value: "receita", label: "Receita" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setTipo(t.value)}
                className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                  tipo === t.value
                    ? "bg-slate-700 text-white border-slate-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="inicio">Data início</Label>
              <Input
                id="inicio"
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fim">Data fim</Label>
              <Input
                id="fim"
                type="date"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
              />
            </div>
          </div>

          {tipo === "consultas" && (
            <>
              <div className="space-y-1">
                <Label>Profissional (opcional)</Label>
                <select
                  value={profissionalId}
                  onChange={(e) => setProfissionalId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">Todos</option>
                  {profissionais.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Sala (opcional)</Label>
                <select
                  value={consultorioId}
                  onChange={(e) => setConsultorioId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">Todas</option>
                  {consultorios.map((c) => (
                    <option key={c.id} value={c.id}>Sala {c.identificacao}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {tipo === "receita" && (
            <div className="space-y-1">
              <Label>Agrupar por</Label>
              <div className="flex gap-2">
                {[
                  { value: "medico", label: "Por Médico" },
                  { value: "sala", label: "Por Sala" },
                ].map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAgrupar(a.value)}
                    className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                      agrupar === a.value
                        ? "bg-slate-700 text-white border-slate-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={gerar} size="sm">
              Gerar Relatório
            </Button>
          </div>
        </div>

        {/* ── RESULTADO ───────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
          {!temResultado ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm py-12">
              <p>Configure os filtros e clique em</p>
              <p className="font-medium">"Gerar Relatório"</p>
            </div>
          ) : filtros.tipo === "consultas" ? (
            <>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-slate-700">
                  Resultado — {filtros.inicio} a {filtros.fim}
                </p>
                <div className="flex gap-3 text-xs text-slate-400">
                  <span>Total: <strong className="text-slate-700">{totalConsultas}</strong></span>
                  <span>Realizadas: <strong className="text-green-600">{totalRealizadas}</strong></span>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-100">
                    <th className="py-2 text-left font-medium">Profissional</th>
                    <th className="py-2 text-center font-medium">Consultas</th>
                    <th className="py-2 text-center font-medium text-green-600">Realizadas</th>
                    <th className="py-2 text-center font-medium text-red-500">Pendentes</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadoConsultas.map((r) => (
                    <tr key={r.profissionalId} className="border-b border-slate-50">
                      <td className="py-2 text-slate-800">{r.nome}</td>
                      <td className="py-2 text-center text-slate-600">{r.total}</td>
                      <td className="py-2 text-center text-green-600 font-medium">{r.realizadas}</td>
                      <td className="py-2 text-center text-red-500">{r.pendentes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-slate-700">
                  Receita por {filtros.agrupar === "medico" ? "médico" : "sala"} — {filtros.inicio} a {filtros.fim}
                </p>
                <span className="text-xs text-green-600 font-bold">
                  Total: R$ {fmt(totalReceita)}
                </span>
              </div>
              <div className="space-y-3">
                {resultadoReceita.map((r) => (
                  <div key={r.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 font-medium">{r.nome}</span>
                      <span className="text-green-600 font-bold">R$ {fmt(r.total)}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded border border-slate-200">
                      <div
                        style={{ width: `${r.pct}%` }}
                        className="h-full rounded bg-blue-500 transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
