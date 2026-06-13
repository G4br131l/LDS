import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { serialize } from "@/lib/serialize"
import { FinanceiroClient } from "@/components/financeiro/financeiro-client"
import { getClinicaIdAtual } from "@/app/(app)/actions"
import { redirect } from "next/navigation"

// Retorna segunda-feira da semana que contém a data
function inicioSemana(d: Date): Date {
  const dt = new Date(d)
  const dia = dt.getUTCDay() // 0=dom, 1=seg...
  const diff = dia === 0 ? -6 : 1 - dia
  dt.setUTCDate(dt.getUTCDate() + diff)
  return dt
}

export default async function FinanceiroPage(props: {
  searchParams: Promise<{ semana?: string }>
}) {
  const user = await verifySession()
  if (!(await can(user.perfil, "Financeiro", "ver"))) redirect("/dashboard")

  const searchParams = await props.searchParams

  // Determina semana: "YYYY-MM-DD" = segunda-feira da semana
  const hoje = new Date()
  const defSemana = inicioSemana(hoje).toISOString().slice(0, 10)
  const semanaStr = searchParams.semana ?? defSemana
  const dataInicio = new Date(`${semanaStr}T00:00:00Z`)
  const dataFim = new Date(dataInicio)
  dataFim.setUTCDate(dataFim.getUTCDate() + 6)

  // Semana anterior / próxima para navegação
  const semanaAnterior = new Date(dataInicio)
  semanaAnterior.setUTCDate(semanaAnterior.getUTCDate() - 7)
  const semanaProxima = new Date(dataInicio)
  semanaProxima.setUTCDate(semanaProxima.getUTCDate() + 7)

  // Início do mês atual
  const inicioMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1))
  const fimMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 0))

  const clinicas = await prisma.clinica.findMany({
    where: { status: { not: "Inativa" } },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  })
  const clinicaAtualId = await getClinicaIdAtual(clinicas[0]?.id.toString() ?? "")
  const clinicaIdBigInt = BigInt(clinicaAtualId || clinicas[0]?.id || 0)

  // Profissionais ativos com vínculos nesta clínica
  const profissionais = await prisma.profissional.findMany({
    where: {
      status: "Ativo",
      vinculos: { some: { consultorio: { clinicaId: clinicaIdBigInt } } },
    },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      modeloCobranca: true,
      valorCobranca: true,
    },
  })

  // Consultas realizadas na semana nesta clínica
  const consultasSemana = await prisma.consulta.findMany({
    where: {
      data: { gte: dataInicio, lte: dataFim },
      status: "Realizada",
      consultorio: { clinicaId: clinicaIdBigInt },
    },
    select: {
      profissionalId: true,
      valor: true,
    },
  })

  // Consultas realizadas no mês (para KPI)
  const consultasMes = await prisma.consulta.findMany({
    where: {
      data: { gte: inicioMes, lte: fimMes },
      status: "Realizada",
      consultorio: { clinicaId: clinicaIdBigInt },
    },
    select: { profissionalId: true, valor: true },
  })

  // Pagamentos existentes na semana
  const pagamentosSemana = await prisma.pagamento.findMany({
    where: {
      clinicaId: clinicaIdBigInt,
      dataInicio: dataInicio,
      dataFim: dataFim,
    },
    select: {
      id: true,
      profissionalId: true,
      valorDevido: true,
      valorRecebido: true,
      status: true,
      formaPagamento: true,
      dataRecebimento: true,
    },
  })

  // Pagamentos no mês (para KPI)
  const pagamentosMes = await prisma.pagamento.findMany({
    where: {
      clinicaId: clinicaIdBigInt,
      dataInicio: { gte: inicioMes },
      dataFim: { lte: fimMes },
    },
    select: {
      valorDevido: true,
      valorRecebido: true,
      status: true,
    },
  })

  // Consultas não registradas: Agendada/Confirmada com data < hoje - 7 dias
  const limiteNaoReg = new Date(hoje)
  limiteNaoReg.setUTCDate(limiteNaoReg.getUTCDate() - 7)
  const consultasNaoRegistradas = await prisma.consulta.findMany({
    where: {
      data: { lt: limiteNaoReg },
      status: { in: ["Agendada", "Confirmada"] },
      consultorio: { clinicaId: clinicaIdBigInt },
    },
    include: {
      paciente: { select: { nome: true } },
      profissional: { select: { nome: true } },
      consultorio: { select: { identificacao: true } },
    },
    orderBy: [{ data: "desc" }, { hora: "asc" }],
    take: 20,
  })

  // Monta extrato por profissional
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

  const extrato: ExtratoProfissional[] = profissionais.map((prof) => {
    const consultas = consultasSemana.filter(
      (c) => c.profissionalId.toString() === prof.id.toString()
    )
    const totalConsultas = consultas.reduce(
      (sum, c) => sum + (c.valor ? parseFloat(c.valor.toString()) : 0),
      0
    )
    const cobranca = parseFloat(prof.valorCobranca.toString())
    const valorDevido =
      prof.modeloCobranca === "Percentual"
        ? Math.round(totalConsultas * (cobranca / 100) * 100) / 100
        : cobranca

    const pag = pagamentosSemana.find(
      (p) => p.profissionalId.toString() === prof.id.toString()
    )

    return {
      id: prof.id.toString(),
      nome: prof.nome,
      modeloCobranca: prof.modeloCobranca,
      valorCobranca: cobranca,
      consultasCount: consultas.length,
      totalConsultas,
      valorDevido,
      valorRecebido: pag ? parseFloat(pag.valorRecebido.toString()) : 0,
      status: pag?.status ?? "Pendente",
      pagamentoId: pag ? pag.id.toString() : null,
      formaPagamento: pag?.formaPagamento ?? null,
      dataRecebimento: pag?.dataRecebimento
        ? pag.dataRecebimento.toISOString().slice(0, 10)
        : null,
    }
  })

  // KPIs
  const totalDevido = extrato.reduce((s, e) => s + e.valorDevido, 0)
  const totalRecebidoSemana = extrato.reduce((s, e) => s + e.valorRecebido, 0)
  const pendentes = extrato.filter((e) => e.status === "Pendente" || e.status === "Parcial")

  const totalDevidoMes = pagamentosMes.reduce(
    (s, p) => s + parseFloat(p.valorDevido.toString()),
    0
  )
  const totalRecebidoMes = pagamentosMes.reduce(
    (s, p) => s + parseFloat(p.valorRecebido.toString()),
    0
  )

  const canEdit = await can(user.perfil, "Financeiro", "criar")

  const naoRegData = serialize(
    consultasNaoRegistradas.map((c) => ({
      id: c.id.toString(),
      pacienteNome: c.paciente.nome,
      profissionalNome: c.profissional.nome,
      consultorioNome: c.consultorio.identificacao,
      data: c.data.toISOString(),
      hora: new Date(c.hora).toISOString().slice(11, 16),
      status: c.status,
    }))
  )

  return (
    <FinanceiroClient
      extrato={extrato}
      consultasNaoRegistradas={naoRegData}
      clinicas={serialize(clinicas.map((c) => ({ id: c.id.toString(), nome: c.nome })))}
      clinicaAtualId={clinicaAtualId}
      kpis={{
        aReceberMes: totalDevidoMes - totalRecebidoMes,
        aReceberSemana: totalDevido - totalRecebidoSemana,
        recebido: totalRecebidoMes,
        pendentes: pendentes.length,
      }}
      semanaAtual={semanaStr}
      semanaAnterior={semanaAnterior.toISOString().slice(0, 10)}
      semanaProxima={semanaProxima.toISOString().slice(0, 10)}
      dataInicio={dataInicio.toISOString().slice(0, 10)}
      dataFim={dataFim.toISOString().slice(0, 10)}
      canEdit={canEdit}
    />
  )
}
