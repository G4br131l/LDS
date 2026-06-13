import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { serialize } from "@/lib/serialize"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { getClinicaIdAtual } from "@/app/(app)/actions"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const user = await verifySession()
  if (!(await can(user.perfil, "Dashboard", "ver"))) redirect("/agenda")

  const hoje = new Date()
  const hojeDate = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()))
  const inicioMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1))
  const fimMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 0))

  const dias7: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hojeDate)
    d.setUTCDate(d.getUTCDate() - 6 + i)
    return d
  })
  const inicio7dias = dias7[0]

  const clinicas = await prisma.clinica.findMany({
    where: { status: { not: "Inativa" } },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  })
  const clinicaAtualId = await getClinicaIdAtual(clinicas[0]?.id.toString() ?? "")
  const clinicaIdBigInt = BigInt(clinicaAtualId || clinicas[0]?.id || 0)

  const [
    consultasHojeTodas,
    consultasMes,
    pagamentosPendentes,
    consultasUltimos7,
    pagamentosMes,
    salasHoje,
    consultasNaoReg,
    consultoriosTotal,
    alertasPgto,
  ] = await Promise.all([
    prisma.consulta.findMany({
      where: { data: hojeDate, consultorio: { clinicaId: clinicaIdBigInt } },
      select: { status: true, consultorioId: true },
    }),
    prisma.consulta.aggregate({
      where: {
        data: { gte: inicioMes, lte: fimMes },
        status: "Realizada",
        consultorio: { clinicaId: clinicaIdBigInt },
      },
      _sum: { valor: true },
    }),
    prisma.pagamento.count({
      where: { clinicaId: clinicaIdBigInt, status: { in: ["Pendente", "Parcial"] } },
    }),
    prisma.consulta.findMany({
      where: {
        data: { gte: inicio7dias, lte: hojeDate },
        status: "Realizada",
        consultorio: { clinicaId: clinicaIdBigInt },
      },
      select: { data: true },
    }),
    prisma.pagamento.findMany({
      where: {
        clinicaId: clinicaIdBigInt,
        dataInicio: { gte: inicioMes },
        dataFim: { lte: fimMes },
      },
      select: {
        valorDevido: true,
        valorRecebido: true,
        profissional: { select: { modeloCobranca: true } },
      },
    }),
    prisma.consulta.findMany({
      where: { data: hojeDate, consultorio: { clinicaId: clinicaIdBigInt } },
      select: { consultorioId: true, status: true },
      distinct: ["consultorioId"],
    }),
    prisma.consulta.count({
      where: {
        data: { lt: inicio7dias },
        status: { in: ["Agendada", "Confirmada"] },
        consultorio: { clinicaId: clinicaIdBigInt },
      },
    }),
    prisma.consultorio.count({
      where: { clinicaId: clinicaIdBigInt, status: "Ativo" },
    }),
    prisma.pagamento.findMany({
      where: { clinicaId: clinicaIdBigInt, status: { in: ["Pendente", "Parcial"] } },
      select: {
        profissional: { select: { nome: true } },
        valorDevido: true,
        dataInicio: true,
      },
      orderBy: { dataInicio: "desc" },
      take: 5,
    }),
  ])

  const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
  const barrasDias = dias7.map((d) => ({
    label: DIAS_SEMANA[d.getUTCDay()],
    data: d.toISOString().slice(0, 10),
    count: consultasUltimos7.filter(
      (c) => c.data.toISOString().slice(0, 10) === d.toISOString().slice(0, 10)
    ).length,
    isHoje: d.toISOString().slice(0, 10) === hojeDate.toISOString().slice(0, 10),
  }))

  const receitaPercentual = pagamentosMes
    .filter((p) => p.profissional.modeloCobranca === "Percentual")
    .reduce((s, p) => s + parseFloat(p.valorRecebido.toString()), 0)
  const receitaAluguel = pagamentosMes
    .filter((p) => p.profissional.modeloCobranca === "Aluguel")
    .reduce((s, p) => s + parseFloat(p.valorRecebido.toString()), 0)
  const totalDevidoMes = pagamentosMes.reduce(
    (s, p) => s + parseFloat(p.valorDevido.toString()),
    0
  )

  const salasEmUso = new Set(
    salasHoje
      .filter((s) => ["Confirmada", "Agendada", "Realizada"].includes(s.status))
      .map((s) => s.consultorioId.toString())
  ).size

  const receita = consultasMes._sum.valor
    ? parseFloat(consultasMes._sum.valor.toString())
    : 0

  const consultasHoje = consultasHojeTodas.length
  const confirmadas = consultasHojeTodas.filter((c) => c.status === "Confirmada").length

  const alertas = serialize([
    ...alertasPgto.map((p) => ({
      texto: `${p.profissional.nome} — pagamento de R$ ${parseFloat(p.valorDevido.toString()).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em aberto`,
      nivel: "red" as const,
    })),
    ...(consultasNaoReg > 0
      ? [
          {
            texto: `${consultasNaoReg} consulta${consultasNaoReg > 1 ? "s" : ""} sem confirmação de realização (semana passada)`,
            nivel: "yellow" as const,
          },
        ]
      : []),
  ])

  return (
    <DashboardClient
      nomeUsuario={user.nome}
      kpis={{ consultasHoje, receitaMes: receita, salasEmUso, consultoriosTotal, pagamentosPendentes }}
      barrasDias={barrasDias}
      receita={{ percentual: receitaPercentual, aluguel: receitaAluguel, totalRecebido: receitaPercentual + receitaAluguel, totalDevido: totalDevidoMes }}
      consultasHojeConfirmadas={confirmadas}
      alertas={alertas}
    />
  )
}
