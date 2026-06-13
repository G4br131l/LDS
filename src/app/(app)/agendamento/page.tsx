import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { serialize } from "@/lib/serialize"
import { AgendamentoForm } from "@/components/agenda/agendamento-form"
import { getClinicaIdAtual } from "@/app/(app)/actions"
import { redirect } from "next/navigation"

export default async function AgendamentoPage() {
  const user = await verifySession()
  if (!(await can(user.perfil, "Agenda", "criar"))) redirect("/agenda")

  const clinicas = await prisma.clinica.findMany({
    where: { status: { not: "Inativa" } },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  })

  const clinicaAtualId = await getClinicaIdAtual(clinicas[0]?.id.toString() ?? "")
  const clinicaIdBigInt = BigInt(clinicaAtualId || clinicas[0]?.id || 0)

  const [pacientes, profissionais, consultorios] = await Promise.all([
    prisma.paciente.findMany({
      where: { status: "Ativo" },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, codigo: true, cpf: true },
    }),
    prisma.profissional.findMany({
      where: { status: "Ativo" },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        especialidades: {
          select: {
            especialidade: { select: { id: true, nome: true } },
          },
        },
      },
    }),
    prisma.consultorio.findMany({
      where: { status: "Ativo", clinicaId: clinicaIdBigInt },
      orderBy: { identificacao: "asc" },
      select: { id: true, identificacao: true, clinicaId: true },
    }),
  ])

  const pacData = serialize(
    pacientes.map((p) => ({
      id: p.id.toString(),
      nome: p.nome,
      codigo: p.codigo,
      cpf: p.cpf,
    }))
  )

  const profData = serialize(
    profissionais.map((p) => ({
      id: p.id.toString(),
      nome: p.nome,
      especialidades: p.especialidades.map((e) => ({
        id: e.especialidade.id.toString(),
        nome: e.especialidade.nome,
      })),
    }))
  )

  const consData = serialize(
    consultorios.map((c) => ({
      id: c.id.toString(),
      identificacao: c.identificacao,
      clinicaId: c.clinicaId.toString(),
    }))
  )

  const clinData = serialize(clinicas.map((c) => ({ id: c.id.toString(), nome: c.nome })))

  return (
    <AgendamentoForm
      pacientes={pacData}
      profissionais={profData}
      consultorios={consData}
      clinicas={clinData}
      clinicaAtualId={clinicaAtualId}
    />
  )
}
