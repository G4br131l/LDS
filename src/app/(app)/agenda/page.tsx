import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { serialize } from "@/lib/serialize"
import { AgendaClient } from "@/components/agenda/agenda-client"
import { getClinicaIdAtual } from "@/app/(app)/actions"
import { redirect } from "next/navigation"

export default async function AgendaPage(props: {
  searchParams: Promise<{ data?: string }>
}) {
  const user = await verifySession()
  if (!(await can(user.perfil, "Agenda", "ver"))) redirect("/dashboard")

  const searchParams = await props.searchParams
  const dataStr = searchParams.data ?? new Date().toISOString().slice(0, 10)
  const dataFiltro = new Date(`${dataStr}T00:00:00Z`)

  const clinicas = await prisma.clinica.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  })

  const clinicaAtualId = await getClinicaIdAtual(clinicas[0]?.id.toString() ?? "")
  const clinicaIdBigInt = BigInt(clinicaAtualId || clinicas[0]?.id || 0)

  const [consultas, profissionais, consultorios, pacientes] = await Promise.all([
    prisma.consulta.findMany({
      where: {
        data: dataFiltro,
        consultorio: { clinicaId: clinicaIdBigInt },
      },
      include: {
        paciente: { select: { nome: true, codigo: true } },
        profissional: { select: { nome: true } },
        consultorio: { select: { identificacao: true } },
        especialidade: { select: { nome: true } },
      },
      orderBy: [{ hora: "asc" }],
    }),
    prisma.profissional.findMany({
      where: { status: "Ativo" },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        especialidades: { select: { especialidade: { select: { id: true, nome: true } } } },
      },
    }),
    prisma.consultorio.findMany({
      where: { status: "Ativo", clinicaId: clinicaIdBigInt },
      orderBy: { identificacao: "asc" },
      select: { id: true, identificacao: true, clinicaId: true },
    }),
    prisma.paciente.findMany({
      where: { status: "Ativo" },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, codigo: true, cpf: true },
    }),
  ])

  const canCreate = await can(user.perfil, "Agenda", "criar")
  const canEdit = await can(user.perfil, "Agenda", "editar")

  const consultasData = serialize(
    consultas.map((c) => ({
      id: c.id.toString(),
      numero: c.numero,
      pacienteNome: c.paciente.nome,
      pacienteCodigo: c.paciente.codigo,
      profissionalId: c.profissionalId.toString(),
      profissionalNome: c.profissional.nome,
      consultorioId: c.consultorioId.toString(),
      consultorioNome: c.consultorio.identificacao,
      especialidadeNome: c.especialidade?.nome ?? null,
      tipo: c.tipo,
      data: c.data.toISOString(),
      hora: new Date(c.hora).toISOString().slice(11, 16),
      duracaoMinutos: c.duracaoMinutos,
      status: c.status,
      motivo: c.motivo,
      valor: c.valor ? parseFloat(c.valor.toString()) : null,
      pago: c.pago,
    }))
  )

  const profData = serialize(profissionais.map((p) => ({
    id: p.id.toString(),
    nome: p.nome,
    especialidades: p.especialidades.map((e) => ({ id: e.especialidade.id.toString(), nome: e.especialidade.nome })),
  })))
  const consData = serialize(consultorios.map((c) => ({
    id: c.id.toString(),
    identificacao: c.identificacao,
    clinicaId: c.clinicaId.toString(),
  })))
  const clinData = serialize(clinicas.map((c) => ({ id: c.id.toString(), nome: c.nome })))
  const pacData = serialize(pacientes.map((p) => ({
    id: p.id.toString(),
    nome: p.nome,
    codigo: p.codigo,
    cpf: p.cpf,
  })))

  return (
    <AgendaClient
      consultas={consultasData}
      pacientes={pacData}
      profissionais={profData}
      consultorios={consData}
      clinicas={clinData}
      clinicaAtualId={clinicaAtualId}
      dataAtual={dataStr}
      canCreate={canCreate}
      canEdit={canEdit}
    />
  )
}
