"use client"

import { Badge } from "@/components/ui/badge"
import Link from "next/link"

type AgendamentoData = {
  id: string
  consultorioNome: string
  clinicaNome: string
  data: string
  recorrencia: string
  horarios: string[]
}

type Props = {
  agendamentos: AgendamentoData[]
}

const RECORRENCIA_LABEL: Record<string, string> = {
  Nenhuma: "",
  Semanal: "· Semanal",
  Mensal: "· Mensal",
}

export function VinculosTab({ agendamentos }: Props) {
  const hoje = new Date().toISOString().slice(0, 10)
  const proximos = agendamentos.filter((a) => a.data >= hoje)
  const passados = agendamentos.filter((a) => a.data < hoje)

  if (agendamentos.length === 0) {
    return (
      <div className="py-6 text-center space-y-2">
        <p className="text-sm text-slate-400">Nenhum agendamento de sala cadastrado</p>
        <Link
          href="/consultorios"
          className="text-xs text-blue-600 hover:underline"
        >
          Ir para Consultórios → Agendar Sala
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {proximos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Próximos ({proximos.length})
          </p>
          {proximos.map((a) => (
            <AgendamentoCard key={a.id} a={a} />
          ))}
        </div>
      )}

      {passados.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Anteriores ({passados.length})
          </p>
          {passados.map((a) => (
            <AgendamentoCard key={a.id} a={a} muted />
          ))}
        </div>
      )}

      <div className="pt-1 border-t border-slate-100">
        <Link
          href="/consultorios"
          className="text-xs text-blue-600 hover:underline"
        >
          Gerenciar agendamentos em Consultórios →
        </Link>
      </div>
    </div>
  )
}

function AgendamentoCard({ a, muted }: { a: AgendamentoData; muted?: boolean }) {
  const data = new Date(`${a.data}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  return (
    <div className={`border rounded-lg p-3 space-y-1.5 ${muted ? "border-slate-100 bg-slate-50/50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <p className={`text-sm font-medium ${muted ? "text-slate-500" : "text-slate-800"}`}>
          {a.clinicaNome} · Sala {a.consultorioNome}
        </p>
        {a.recorrencia !== "Nenhuma" && (
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {a.recorrencia === "Semanal" ? "Semanal" : "Mensal"}
          </span>
        )}
      </div>
      <p className={`text-xs ${muted ? "text-slate-400" : "text-slate-500"}`}>{data}</p>
      <div className="flex flex-wrap gap-1">
        {a.horarios.sort().map((h) => (
          <Badge key={h} variant="outline" className="text-xs px-1.5 py-0">
            {h}
          </Badge>
        ))}
      </div>
    </div>
  )
}
