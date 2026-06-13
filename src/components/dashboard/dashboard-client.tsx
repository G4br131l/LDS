"use client"

import Link from "next/link"
import { CalendarDays, TrendingUp, DoorOpen, AlertCircle } from "lucide-react"

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type Kpis = {
  consultasHoje: number
  receitaMes: number
  salasEmUso: number
  consultoriosTotal: number
  pagamentosPendentes: number
}

type BarraDia = {
  label: string
  data: string
  count: number
  isHoje: boolean
}

type Receita = {
  percentual: number
  aluguel: number
  totalRecebido: number
  totalDevido: number
}

type Alerta = { texto: string; nivel: "red" | "yellow" | "green" }

type Props = {
  nomeUsuario: string
  kpis: Kpis
  barrasDias: BarraDia[]
  receita: Receita
  consultasHojeConfirmadas: number
  alertas: Alerta[]
}

export function DashboardClient({
  nomeUsuario,
  kpis,
  barrasDias,
  receita,
  consultasHojeConfirmadas,
  alertas,
}: Props) {
  const maxCount = Math.max(...barrasDias.map((b) => b.count), 1)
  const totalReceita = receita.percentual + receita.aluguel
  const pctPercentual = totalReceita > 0 ? Math.round((receita.percentual / totalReceita) * 100) : 0
  const pctAluguel = totalReceita > 0 ? 100 - pctPercentual : 0

  const hoje = new Date()
  const mesLabel = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Painel do Proprietário</h1>
        <p className="text-sm text-slate-500 mt-0.5 capitalize">Visão geral — {mesLabel}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Consultas hoje</p>
          <p className="text-2xl font-bold text-blue-600">{kpis.consultasHoje}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {consultasHojeConfirmadas} confirmadas / {kpis.consultasHoje - consultasHojeConfirmadas} agendadas
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Receita do mês</p>
          <p className="text-2xl font-bold text-green-600">R$ {fmt(kpis.receitaMes)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Consultas realizadas</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Salas em uso hoje</p>
          <p className="text-2xl font-bold text-yellow-600">
            {kpis.salasEmUso}/{kpis.consultoriosTotal}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Salas ativas</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Pagamentos pendentes</p>
          <p className="text-2xl font-bold text-red-500">{kpis.pagamentosPendentes}</p>
          <p className="text-xs text-slate-400 mt-0.5">Profissionais em atraso</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-5 gap-4">
        {/* Consultas últimos 7 dias */}
        <div className="col-span-3 bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <p className="font-semibold text-sm text-slate-700">Consultas realizadas — últimos 7 dias</p>
          </div>
          <div className="flex items-end gap-2 h-28 px-2">
            {barrasDias.map((b) => (
              <div key={b.data} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-slate-400">{b.count > 0 ? b.count : ""}</span>
                <div className="w-full flex-1 flex items-end">
                  <div
                    style={{ height: b.count > 0 ? `${Math.max(6, (b.count / maxCount) * 100)}%` : "4px" }}
                    className={`w-full rounded-t transition-all ${
                      b.isHoje ? "bg-blue-500 border border-blue-600" : "bg-blue-200 border border-blue-300"
                    }`}
                  />
                </div>
                <span className={`text-xs ${b.isHoje ? "font-bold text-slate-700" : "text-slate-400"}`}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Receita por modelo */}
        <div className="col-span-2 bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <p className="font-semibold text-sm text-slate-700">Receita por modelo</p>
          </div>
          <div className="space-y-3">
            {[
              { label: "Percentual por consulta", val: pctPercentual, color: "bg-blue-500", border: "border-blue-300" },
              { label: "Aluguel fixo de sala", val: pctAluguel, color: "bg-green-500", border: "border-green-300" },
            ].map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{b.label}</span>
                  <span className="font-bold text-slate-700">{b.val}%</span>
                </div>
                <div className={`h-3 bg-slate-100 rounded border ${b.border}`}>
                  <div
                    style={{ width: `${b.val}%` }}
                    className={`h-full rounded ${b.color} transition-all`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 mt-4 pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Total recebido</span>
              <span className="font-bold text-green-600">R$ {fmt(receita.totalRecebido)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">A receber</span>
              <span className="font-bold text-yellow-600">
                R$ {fmt(Math.max(0, receita.totalDevido - receita.totalRecebido))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-5 gap-4">
        {/* Atalhos rápidos */}
        <div className="col-span-3 bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <DoorOpen className="w-4 h-4 text-slate-400" />
            <p className="font-semibold text-sm text-slate-700">Acesso rápido</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { href: "/agendamento", label: "Nova consulta", color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" },
              { href: "/agenda", label: "Ver agenda", color: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100" },
              { href: "/financeiro", label: "Financeiro", color: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" },
              { href: "/profissionais", label: "Profissionais", color: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100" },
              { href: "/pacientes", label: "Pacientes", color: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100" },
              { href: "/relatorios", label: "Relatórios", color: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-center text-sm px-3 py-2.5 rounded-lg border font-medium transition-colors ${item.color}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Alertas & Pendências */}
        <div className="col-span-2 bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <p className="font-semibold text-sm text-slate-700">Alertas & Pendências</p>
          </div>
          {alertas.length === 0 ? (
            <p className="text-sm text-green-600 text-center py-4">✓ Nenhuma pendência</p>
          ) : (
            <div className="space-y-0">
              {alertas.map((a, i) => (
                <div
                  key={i}
                  className="flex gap-2 py-2 border-b border-dashed border-slate-100 last:border-0 text-sm"
                >
                  <span>{a.nivel === "red" ? "⚠️" : a.nivel === "yellow" ? "🔍" : "✅"}</span>
                  <span
                    className={
                      a.nivel === "red"
                        ? "text-red-600"
                        : a.nivel === "yellow"
                        ? "text-yellow-700"
                        : "text-green-700"
                    }
                  >
                    {a.texto}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
