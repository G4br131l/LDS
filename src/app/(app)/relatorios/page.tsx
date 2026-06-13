import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { serialize } from "@/lib/serialize"
import { RelatoriosClient } from "@/components/relatorios/relatorios-client"
import { getClinicaIdAtual } from "@/app/(app)/actions"
import { redirect } from "next/navigation"

export default async function RelatoriosPage(props: {
  searchParams: Promise<{
    tipo?: string
    inicio?: string
    fim?: string
    profissionalId?: string
    consultorioId?: string
    agrupar?: string
  }>
}) {
  const user = await verifySession()
  if (!(await can(user.perfil, "Relatorios", "ver"))) redirect("/dashboard")

  const sp = await props.searchParams

  const clinicas = await prisma.clinica.findMany({
    where: { status: { not: "Inativa" } },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  })
  const clinicaAtualId = await getClinicaIdAtual(clinicas[0]?.id.toString() ?? "")
  const clinicaIdBigInt = BigInt(clinicaAtualId || clinicas[0]?.id || 0)

  const [profissionais, consultorios] = await Promise.all([
    prisma.profissional.findMany({
      where: { status: "Ativo" },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.consultorio.findMany({
      where: { status: "Ativo", clinicaId: clinicaIdBigInt },
      orderBy: { identificacao: "asc" },
      select: { id: true, identificacao: true },
    }),
  ])

  // Executa relatório se filtros informados
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

  let resultadoConsultas: ResultadoConsultas[] = []
  let resultadoReceita: ResultadoReceita[] = []

  if (sp.tipo === "consultas" && sp.inicio && sp.fim) {
    const dataInicio = new Date(`${sp.inicio}T00:00:00Z`)
    const dataFim = new Date(`${sp.fim}T00:00:00Z`)

    const whereBase = {
      data: { gte: dataInicio, lte: dataFim },
      consultorio: { clinicaId: clinicaIdBigInt },
      ...(sp.profissionalId ? { profissionalId: BigInt(sp.profissionalId) } : {}),
      ...(sp.consultorioId ? { consultorioId: BigInt(sp.consultorioId) } : {}),
    }

    const consultas = await prisma.consulta.findMany({
      where: whereBase,
      select: { profissionalId: true, status: true, profissional: { select: { nome: true } } },
    })

    const byProf: Record<string, ResultadoConsultas> = {}
    consultas.forEach((c) => {
      const key = c.profissionalId.toString()
      if (!byProf[key]) {
        byProf[key] = {
          profissionalId: key,
          nome: c.profissional.nome,
          total: 0,
          realizadas: 0,
          pendentes: 0,
        }
      }
      byProf[key].total++
      if (c.status === "Realizada") byProf[key].realizadas++
      if (c.status === "Agendada" || c.status === "Confirmada") byProf[key].pendentes++
    })
    resultadoConsultas = Object.values(byProf).sort((a, b) => b.total - a.total)
  }

  if (sp.tipo === "receita" && sp.inicio && sp.fim) {
    const dataInicio = new Date(`${sp.inicio}T00:00:00Z`)
    const dataFim = new Date(`${sp.fim}T00:00:00Z`)
    const agrupar = sp.agrupar ?? "medico"

    const consultas = await prisma.consulta.findMany({
      where: {
        data: { gte: dataInicio, lte: dataFim },
        status: "Realizada",
        consultorio: { clinicaId: clinicaIdBigInt },
        valor: { not: null },
      },
      select: {
        valor: true,
        profissionalId: true,
        consultorioId: true,
        profissional: { select: { nome: true } },
        consultorio: { select: { identificacao: true } },
      },
    })

    if (agrupar === "medico") {
      const byProf: Record<string, { nome: string; total: number }> = {}
      consultas.forEach((c) => {
        const key = c.profissionalId.toString()
        if (!byProf[key]) byProf[key] = { nome: c.profissional.nome, total: 0 }
        byProf[key].total += c.valor ? parseFloat(c.valor.toString()) : 0
      })
      const max = Math.max(...Object.values(byProf).map((v) => v.total), 1)
      resultadoReceita = Object.entries(byProf)
        .map(([id, v]) => ({
          id,
          nome: v.nome,
          tipo: "Médico",
          total: Math.round(v.total * 100) / 100,
          pct: Math.round((v.total / max) * 100),
        }))
        .sort((a, b) => b.total - a.total)
    } else {
      const bySala: Record<string, { nome: string; total: number }> = {}
      consultas.forEach((c) => {
        const key = c.consultorioId.toString()
        if (!bySala[key]) bySala[key] = { nome: `Sala ${c.consultorio.identificacao}`, total: 0 }
        bySala[key].total += c.valor ? parseFloat(c.valor.toString()) : 0
      })
      const max = Math.max(...Object.values(bySala).map((v) => v.total), 1)
      resultadoReceita = Object.entries(bySala)
        .map(([id, v]) => ({
          id,
          nome: v.nome,
          tipo: "Sala",
          total: Math.round(v.total * 100) / 100,
          pct: Math.round((v.total / max) * 100),
        }))
        .sort((a, b) => b.total - a.total)
    }
  }

  return (
    <RelatoriosClient
      profissionais={serialize(profissionais.map((p) => ({ id: p.id.toString(), nome: p.nome })))}
      consultorios={serialize(consultorios.map((c) => ({ id: c.id.toString(), identificacao: c.identificacao })))}
      filtros={{
        tipo: sp.tipo ?? "",
        inicio: sp.inicio ?? "",
        fim: sp.fim ?? "",
        profissionalId: sp.profissionalId ?? "",
        consultorioId: sp.consultorioId ?? "",
        agrupar: sp.agrupar ?? "medico",
      }}
      resultadoConsultas={resultadoConsultas}
      resultadoReceita={resultadoReceita}
    />
  )
}
