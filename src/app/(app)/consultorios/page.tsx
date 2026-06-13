import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { serialize } from "@/lib/serialize"
import { ConsultoriosClient } from "@/components/consultorios/consultorios-client"
import { getClinicaIdAtual } from "@/app/(app)/actions"
import { redirect } from "next/navigation"

function inicioSemana(d: Date): Date {
  const dt = new Date(d)
  const dia = dt.getUTCDay()
  const diff = dia === 0 ? -6 : 1 - dia
  dt.setUTCDate(dt.getUTCDate() + diff)
  return dt
}

export default async function ConsultoriosPage(props: {
  searchParams: Promise<{ semana?: string; dia?: string; clinicaId?: string }>
}) {
  const user = await verifySession()
  if (!(await can(user.perfil, "Consultorios", "ver"))) redirect("/dashboard")

  const searchParams = await props.searchParams
  const hoje = new Date()
  const defSemana = inicioSemana(hoje).toISOString().slice(0, 10)
  const hojeStr = hoje.toISOString().slice(0, 10)
  const semanaStr = searchParams.semana ?? defSemana
  const diaStr = searchParams.dia ?? hojeStr
  const dataInicio = new Date(`${semanaStr}T00:00:00Z`)
  const dataFim = new Date(dataInicio)
  dataFim.setUTCDate(dataFim.getUTCDate() + 6)

  const semanaAnterior = new Date(dataInicio)
  semanaAnterior.setUTCDate(semanaAnterior.getUTCDate() - 7)
  const semanaProxima = new Date(dataInicio)
  semanaProxima.setUTCDate(semanaProxima.getUTCDate() + 7)

  const diaAnterior = new Date(`${diaStr}T12:00:00Z`)
  diaAnterior.setUTCDate(diaAnterior.getUTCDate() - 1)
  const diaProximo = new Date(`${diaStr}T12:00:00Z`)
  diaProximo.setUTCDate(diaProximo.getUTCDate() + 1)

  const [consultorios, agendamentos, profissionais, clinicas] = await Promise.all([
    prisma.consultorio.findMany({
      include: { clinica: { select: { id: true, nome: true } } },
      orderBy: [{ clinica: { nome: "asc" } }, { identificacao: "asc" }],
    }),
    prisma.agendamentoSala.findMany({
      where: { data: { gte: dataInicio, lte: dataFim } },
      include: {
        consultorio: { select: { identificacao: true } },
        profissional: { select: { nome: true } },
        horarios: true,
      },
      orderBy: { data: "asc" },
    }),
    prisma.profissional.findMany({
      where: { status: "Ativo" },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.clinica.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ])

  const clinicaAtualId = await getClinicaIdAtual(clinicas[0]?.id.toString() ?? "")

  const consData = serialize(
    consultorios.map((c) => ({
      id: c.id.toString(),
      clinicaId: c.clinicaId.toString(),
      clinicaNome: c.clinica.nome,
      identificacao: c.identificacao,
      andar: c.andar,
      especialidadePrincipal: c.especialidadePrincipal,
      capacidade: c.capacidade,
      horaAbertura: c.horaAbertura
        ? new Date(c.horaAbertura).toISOString().slice(11, 16)
        : null,
      horaFechamento: c.horaFechamento
        ? new Date(c.horaFechamento).toISOString().slice(11, 16)
        : null,
      valorPorHora: c.valorPorHora ? parseFloat(c.valorPorHora.toString()) : null,
      status: c.status,
      observacoes: c.observacoes,
    }))
  )

  const agData = serialize(
    agendamentos.map((a) => ({
      id: a.id.toString(),
      consultorioId: a.consultorioId.toString(),
      consultorioNome: a.consultorio.identificacao,
      profissionalNome: a.profissional.nome,
      data: a.data.toISOString().slice(0, 10),
      recorrencia: a.recorrencia,
      horarios: a.horarios.map((h) => new Date(h.horario).toISOString().slice(11, 16)),
    }))
  )

  // Mapa de ocupação semanal: "YYYY-MM-DD|HH:MM" → [{salaId, salaNome, quem, tipo}]
  type OcupacaoItem = { salaId: string; salaNome: string; quem: string; tipo: "agendamento" | "consulta" }
  const ocupacaoMap: Record<string, OcupacaoItem[]> = {}

  function addOcupacao(dia: string, hora: string, item: OcupacaoItem) {
    const key = `${dia}|${hora}`
    if (!ocupacaoMap[key]) ocupacaoMap[key] = []
    ocupacaoMap[key].push(item)
  }

  for (const ag of agendamentos) {
    const dia = ag.data.toISOString().slice(0, 10)
    for (const h of ag.horarios) {
      const hora = new Date(h.horario).toISOString().slice(11, 16)
      addOcupacao(dia, hora, {
        salaId: ag.consultorioId.toString(),
        salaNome: ag.consultorio.identificacao,
        quem: ag.profissional.nome,
        tipo: "agendamento",
      })
    }
  }

  const profData = serialize(
    profissionais.map((p) => ({ id: p.id.toString(), nome: p.nome }))
  )

  const clinData = serialize(
    clinicas.map((c) => ({ id: c.id.toString(), nome: c.nome }))
  )

  const canEdit = await can(user.perfil, "Consultorios", "editar")
  const canCreate = await can(user.perfil, "Consultorios", "criar")

  return (
    <ConsultoriosClient
      consultorios={consData}
      agendamentos={agData}
      profissionais={profData}
      clinicas={clinData}
      clinicaAtualId={clinicaAtualId}
      semanaAtual={semanaStr}
      semanaAnterior={semanaAnterior.toISOString().slice(0, 10)}
      semanaProxima={semanaProxima.toISOString().slice(0, 10)}
      diaAtual={diaStr}
      diaAnterior={diaAnterior.toISOString().slice(0, 10)}
      diaProximo={diaProximo.toISOString().slice(0, 10)}
      ocupacaoSemana={ocupacaoMap}
      canEdit={canEdit}
      canCreate={canCreate}
    />
  )
}
