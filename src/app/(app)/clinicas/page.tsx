import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { serialize } from "@/lib/serialize"
import { ClinicasClient } from "@/components/clinicas/clinicas-client"
import { redirect } from "next/navigation"

export default async function ClinicasPage(props: {
  searchParams: Promise<{ tab?: string; clinicaId?: string }>
}) {
  const user = await verifySession()
  if (!(await can(user.perfil, "Clinicas", "ver"))) redirect("/dashboard")

  const searchParams = await props.searchParams
  const tabAtiva = searchParams.tab ?? "lista"
  const clinicaIdSel = searchParams.clinicaId ?? null

  // Mês atual para receita
  const hoje = new Date()
  const inicioMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1))
  const fimMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 0))

  const clinicas = await prisma.clinica.findMany({
    orderBy: { nome: "asc" },
    include: {
      horariosFuncionamento: { orderBy: { diaSemana: "asc" } },
      responsavelTecnico: { select: { id: true, nome: true } },
      consultorios: {
        where: { status: { not: "Inativo" } },
        select: {
          id: true,
          identificacao: true,
          especialidadePrincipal: true,
          status: true,
          vinculos: {
            select: {
              profissional: { select: { id: true, nome: true } },
            },
          },
        },
        orderBy: { identificacao: "asc" },
        take: 20,
      },
      _count: {
        select: { consultorios: true },
      },
    },
  })

  // Receita do mês por clínica (pagamentos recebidos)
  const pagamentosMes = await prisma.pagamento.findMany({
    where: {
      status: { in: ["Recebido", "Parcial"] },
      dataInicio: { gte: inicioMes },
      dataFim: { lte: fimMes },
    },
    select: { clinicaId: true, valorRecebido: true },
  })

  const receitaMap: Record<string, number> = {}
  for (const p of pagamentosMes) {
    const key = p.clinicaId.toString()
    receitaMap[key] = (receitaMap[key] ?? 0) + parseFloat(p.valorRecebido.toString())
  }

  // Profissionais distintos por clínica (via vínculos em consultórios)
  const vinculosDistintos = await prisma.vinculoProfissional.findMany({
    select: {
      profissionalId: true,
      consultorio: { select: { clinicaId: true } },
    },
  })

  const profPorClinica: Record<string, Set<string>> = {}
  for (const v of vinculosDistintos) {
    const cid = v.consultorio.clinicaId.toString()
    if (!profPorClinica[cid]) profPorClinica[cid] = new Set()
    profPorClinica[cid].add(v.profissionalId.toString())
  }

  // KPIs globais
  const ativas = clinicas.filter((c) => c.status === "Ativa").length
  const totalSalas = clinicas.reduce((s, c) => s + c._count.consultorios, 0)
  const totalProfSet = new Set(vinculosDistintos.map((v) => v.profissionalId.toString()))
  const receitaTotal = Object.values(receitaMap).reduce((s, v) => s + v, 0)

  // Profissionais disponíveis para responsável técnico
  const profissionais = await prisma.profissional.findMany({
    where: { status: "Ativo" },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  })

  const canEdit = await can(user.perfil, "Clinicas", "editar")
  const canCreate = await can(user.perfil, "Clinicas", "criar")

  const clinicasData = serialize(
    clinicas.map((c) => ({
      id: c.id.toString(),
      nome: c.nome,
      cnpj: c.cnpj,
      telefone: c.telefone,
      endereco: c.endereco,
      cidade: c.cidade,
      estado: c.estado,
      cep: c.cep,
      status: c.status,
      responsavelTecnicoId: c.responsavelTecnicoId?.toString() ?? null,
      responsavelTecnicoNome: c.responsavelTecnico?.nome ?? null,
      salasCount: c._count.consultorios,
      profissionaisCount: profPorClinica[c.id.toString()]?.size ?? 0,
      receitaMes: receitaMap[c.id.toString()] ?? 0,
      horarios: c.horariosFuncionamento.map((h) => ({
        dia: h.diaSemana,
        abertura: new Date(h.abertura).toISOString().slice(11, 16),
        fechamento: new Date(h.fechamento).toISOString().slice(11, 16),
      })),
      consultorios: c.consultorios.map((ct) => ({
        id: ct.id.toString(),
        identificacao: ct.identificacao,
        especialidadePrincipal: ct.especialidadePrincipal,
        status: ct.status,
      })),
      profissionaisVinculados: Array.from(
        new Map(
          c.consultorios
            .flatMap((ct) => ct.vinculos.map((v) => v.profissional))
            .map((p) => [p.id.toString(), p.nome])
        ).entries()
      )
        .slice(0, 5)
        .map(([id, nome]) => ({ id, nome })),
    }))
  )

  const profData = serialize(profissionais.map((p) => ({ id: p.id.toString(), nome: p.nome })))

  return (
    <ClinicasClient
      clinicas={clinicasData}
      profissionais={profData}
      kpis={{
        ativas,
        emImplantacao: clinicas.filter((c) => c.status === "Em_implantacao").length,
        totalSalas,
        totalProfissionais: totalProfSet.size,
        receitaTotal,
      }}
      tabAtiva={tabAtiva}
      clinicaIdSelecionada={clinicaIdSel}
      canEdit={canEdit}
      canCreate={canCreate}
      mesCurrent={`${hoje.toLocaleString("pt-BR", { month: "long" })} ${hoje.getFullYear()}`}
    />
  )
}
