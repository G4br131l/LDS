"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronLeft, ChevronRight } from "lucide-react"

const HORARIOS = [
  "07:00","08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00",
]

const DIAS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

const CORES_SALA = [
  { bg: "bg-blue-500",    light: "bg-blue-100",    text: "text-blue-800"    },
  { bg: "bg-emerald-500", light: "bg-emerald-100", text: "text-emerald-800" },
  { bg: "bg-violet-500",  light: "bg-violet-100",  text: "text-violet-800"  },
  { bg: "bg-orange-400",  light: "bg-orange-100",  text: "text-orange-800"  },
  { bg: "bg-rose-500",    light: "bg-rose-100",    text: "text-rose-800"    },
  { bg: "bg-cyan-500",    light: "bg-cyan-100",    text: "text-cyan-800"    },
  { bg: "bg-yellow-500",  light: "bg-yellow-100",  text: "text-yellow-800"  },
  { bg: "bg-fuchsia-500", light: "bg-fuchsia-100", text: "text-fuchsia-800" },
  { bg: "bg-teal-500",    light: "bg-teal-100",    text: "text-teal-800"    },
  { bg: "bg-red-400",     light: "bg-red-100",     text: "text-red-800"     },
]

type OcupacaoItem = {
  salaId: string
  salaNome: string
  quem: string
  tipo: "agendamento" | "consulta"
}

type Sala = { id: string; identificacao: string; especialidadePrincipal: string | null }

type Props = {
  salas: Sala[]
  ocupacaoSemana: Record<string, OcupacaoItem[]>
  semanaAtual: string
  semanaAnterior: string
  semanaProxima: string
  diaAtual: string
  diaAnterior: string
  diaProximo: string
  clinicaId: string
}

function diasDaSemana(segundaISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${segundaISO}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function inicioSemana(d: Date): string {
  const dt = new Date(d)
  const dia = dt.getUTCDay()
  const diff = dia === 0 ? -6 : 1 - dia
  dt.setUTCDate(dt.getUTCDate() + diff)
  return dt.toISOString().slice(0, 10)
}

export function GradeHorarios({
  salas,
  ocupacaoSemana,
  semanaAtual,
  semanaAnterior,
  semanaProxima,
  diaAtual,
  diaAnterior,
  diaProximo,
  clinicaId,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [visao, setVisao] = useState<"diaria" | "semanal">("semanal")

  const dias = diasDaSemana(semanaAtual)
  const hoje = new Date().toISOString().slice(0, 10)

  const salaCorIdx: Record<string, number> = {}
  salas.forEach((s, i) => { salaCorIdx[s.id] = i % CORES_SALA.length })

  function nav(params: Record<string, string>) {
    startTransition(() => {
      const p = new URLSearchParams({ semana: semanaAtual, dia: diaAtual, ...params })
      if (clinicaId) p.set("clinicaId", clinicaId)
      router.push(`/consultorios?${p.toString()}`)
    })
  }

  function onCalendarioSeleciona(date: Date | undefined) {
    if (!date) return
    const iso = date.toLocaleDateString("en-CA")
    const semana = inicioSemana(date)
    if (visao === "diaria") {
      nav({ semana, dia: iso })
    } else {
      nav({ semana, dia: iso })
    }
  }

  if (salas.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">
        Nenhum consultório ativo nesta unidade
      </p>
    )
  }

  // Calendário: destaca a semana inteira na visão semanal, só o dia na diária
  const calModifiers = visao === "semanal"
    ? { semana: dias.map((d) => new Date(`${d}T12:00:00Z`)) }
    : { diaAtual: [new Date(`${diaAtual}T12:00:00Z`)] }

  const calModifiersClassNames: Record<string, string> = visao === "semanal"
    ? { semana: "bg-slate-100 rounded-none" }
    : { diaAtual: "!bg-slate-900 !text-white rounded-full" }

  return (
    <TooltipProvider delay={100}>
      <div className="flex gap-5">
        {/* ── Calendário lateral ── */}
        <div className="shrink-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Selecionar data
          </p>
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <Calendar
              mode="single"
              selected={new Date(`${diaAtual}T12:00:00Z`)}
              onSelect={onCalendarioSeleciona}
              modifiers={calModifiers}
              modifiersClassNames={calModifiersClassNames}
            />
          </div>

          {/* Legenda de salas */}
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Salas</p>
            {salas.map((s) => {
              const cor = CORES_SALA[salaCorIdx[s.id]]
              return (
                <div key={s.id} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cor.bg}`} />
                  <span>Sala {s.identificacao}</span>
                  {s.especialidadePrincipal && (
                    <span className="text-slate-400 truncate">· {s.especialidadePrincipal}</span>
                  )}
                </div>
              )
            })}
          </div>

        </div>

        {/* ── Grade ── */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Barra superior: toggle + navegação */}
          <div className="flex items-center justify-between">
            {/* Toggle visão */}
            <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs">
              {(["diaria", "semanal"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVisao(v)}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    visao === v
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {v === "diaria" ? "Exibição diária" : "Exibição semanal"}
                </button>
              ))}
            </div>

            {/* Navegação */}
            <div className="flex items-center gap-2">
              {visao === "diaria" ? (
                <>
                  <button
                    onClick={() => nav({ semana: inicioSemana(new Date(`${diaAnterior}T12:00:00Z`)), dia: diaAnterior })}
                    className="p-1.5 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center">
                    {new Date(`${diaAtual}T12:00:00Z`).toLocaleDateString("pt-BR", {
                      weekday: "short", day: "2-digit", month: "short", year: "numeric",
                    })}
                  </span>
                  <button
                    onClick={() => nav({ semana: inicioSemana(new Date(`${diaProximo}T12:00:00Z`)), dia: diaProximo })}
                    className="p-1.5 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => nav({ semana: semanaAnterior, dia: semanaAnterior })}
                    className="p-1.5 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-medium text-slate-700 min-w-[160px] text-center">
                    {new Date(`${dias[0]}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    {" – "}
                    {new Date(`${dias[6]}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  <button
                    onClick={() => nav({ semana: semanaProxima, dia: semanaProxima })}
                    className="p-1.5 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  const h = new Date().toLocaleDateString("en-CA")
                  nav({ semana: inicioSemana(new Date()), dia: h })
                }}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50"
              >
                Hoje
              </button>
            </div>
          </div>

          {/* ── GRADE DIÁRIA: horas × salas ── */}
          {visao === "diaria" && (
            <GradeDiaria
              salas={salas}
              salaCorIdx={salaCorIdx}
              ocupacaoSemana={ocupacaoSemana}
              diaAtual={diaAtual}
              hoje={hoje}
            />
          )}

          {/* ── GRADE SEMANAL: horas × dias (pontos) ── */}
          {visao === "semanal" && (
            <GradeSemanal
              dias={dias}
              salaCorIdx={salaCorIdx}
              ocupacaoSemana={ocupacaoSemana}
              hoje={hoje}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

// ── Visão diária: linhas = horas, colunas = salas ─────────────────────────────
function GradeDiaria({
  salas,
  salaCorIdx,
  ocupacaoSemana,
  diaAtual,
  hoje,
}: {
  salas: Sala[]
  salaCorIdx: Record<string, number>
  ocupacaoSemana: Record<string, OcupacaoItem[]>
  diaAtual: string
  hoje: string
}) {
  const isDiaria = diaAtual === hoje
  const totalOcup = HORARIOS.reduce((acc, h) => acc + (ocupacaoSemana[`${diaAtual}|${h}`]?.length ?? 0), 0)

  return (
    <div>
      {isDiaria && (
        <p className="text-xs text-blue-600 font-medium mb-2">Hoje · {totalOcup} ocupações</p>
      )}
      {!isDiaria && (
        <p className="text-xs text-slate-400 mb-2">{totalOcup} ocupações neste dia</p>
      )}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="text-xs border-collapse" style={{ minWidth: `${80 + salas.length * 130}px` }}>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 z-10 bg-slate-50 border-r border-slate-200 px-3 py-2.5 text-left text-slate-500 font-medium w-14">
                Hora
              </th>
              {salas.map((s) => {
                const cor = CORES_SALA[salaCorIdx[s.id]]
                return (
                  <th
                    key={s.id}
                    className="border-r border-slate-200 last:border-r-0 px-3 py-2 text-center"
                    style={{ minWidth: 130 }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${cor.bg}`} />
                      <span className="font-medium text-slate-700">Sala {s.identificacao}</span>
                    </div>
                    {s.especialidadePrincipal && (
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        {s.especialidadePrincipal}
                      </div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {HORARIOS.map((hora) => (
              <tr key={hora} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40">
                <td className="sticky left-0 z-10 bg-white border-r border-slate-100 px-3 h-10 text-slate-400 font-mono text-xs">
                  {hora}
                </td>
                {salas.map((s) => {
                  const key = `${diaAtual}|${hora}`
                  const itens = (ocupacaoSemana[key] ?? []).filter((i) => i.salaId === s.id)
                  const cor = CORES_SALA[salaCorIdx[s.id]]

                  return (
                    <td
                      key={s.id}
                      className="border-r border-slate-100 last:border-r-0 h-10 p-0.5 align-middle"
                    >
                      {itens.length > 0 ? (
                        <Tooltip>
                          <TooltipTrigger
                            className={`w-full h-full rounded px-2 flex items-center cursor-default border-0 ${cor.light}`}
                          >
                            <span className={`text-xs font-medium truncate ${cor.text}`}>
                              {itens[0].quem.replace(/^Dr\.?\s*/i, "").split(" ")[0]}
                              {itens.length > 1 && ` +${itens.length - 1}`}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {itens.map((item, idx) => (
                              <div key={idx} className={idx > 0 ? "mt-1 pt-1 border-t border-slate-700" : ""}>
                                <p className="font-medium">{item.quem}</p>
                              </div>
                            ))}
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Visão semanal: linhas = horas, colunas = dias (pontos por sala) ──────────
function GradeSemanal({
  dias,
  salaCorIdx,
  ocupacaoSemana,
  hoje,
}: {
  dias: string[]
  salaCorIdx: Record<string, number>
  ocupacaoSemana: Record<string, OcupacaoItem[]>
  hoje: string
}) {
  const totalOcupacoes = Object.values(ocupacaoSemana).reduce((s, v) => s + v.length, 0)

  return (
    <div>
      <p className="text-xs text-slate-400 mb-2">{totalOcupacoes} ocupações na semana</p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="text-xs border-collapse w-full" style={{ minWidth: 560 }}>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 z-10 bg-slate-50 border-r border-slate-200 px-3 py-2.5 text-left text-slate-500 font-medium w-14">
                Hora
              </th>
              {dias.map((dia, i) => {
                const isHoje = dia === hoje
                const dt = new Date(`${dia}T12:00:00Z`)
                return (
                  <th
                    key={dia}
                    className={`border-r border-slate-200 last:border-r-0 px-2 py-2 text-center font-medium ${
                      isHoje ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className={`text-xs ${isHoje ? "text-blue-600" : "text-slate-500"}`}>{DIAS_PT[i]}</div>
                    <div className={`text-base font-bold leading-tight mt-0.5 ${isHoje ? "text-blue-700" : "text-slate-800"}`}>
                      {dt.getUTCDate()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {dt.toLocaleDateString("pt-BR", { month: "short" })}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {HORARIOS.map((hora) => (
              <tr key={hora} className="border-b border-slate-100 last:border-b-0">
                <td className="sticky left-0 z-10 bg-white border-r border-slate-100 px-3 h-10 text-slate-400 font-mono">
                  {hora}
                </td>
                {dias.map((dia) => {
                  const itens = ocupacaoSemana[`${dia}|${hora}`] ?? []
                  const isHoje = dia === hoje
                  return (
                    <td
                      key={dia}
                      className={`border-r border-slate-100 last:border-r-0 h-10 px-1 align-middle ${
                        isHoje ? "bg-blue-50/30" : ""
                      }`}
                    >
                      {itens.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 items-center justify-center">
                          {itens.map((item, idx) => {
                            const cor = CORES_SALA[salaCorIdx[item.salaId] ?? 0]
                            return (
                              <Tooltip key={idx}>
                                <TooltipTrigger
                                  className={`w-2.5 h-2.5 rounded-full border-0 p-0 cursor-default ${cor.bg}`}
                                />
                                <TooltipContent side="top">
                                  <p className="font-medium">Sala {item.salaNome}</p>
                                  <p className="text-slate-300">{item.quem}</p>
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
