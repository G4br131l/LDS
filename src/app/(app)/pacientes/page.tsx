import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { serialize } from "@/lib/serialize"
import { PacientesClient } from "@/components/pacientes/pacientes-client"
import { redirect } from "next/navigation"

export default async function PacientesPage(props: {
  searchParams: Promise<{ q?: string; tab?: string; pacienteId?: string }>
}) {
  const user = await verifySession()
  if (!(await can(user.perfil, "Pacientes", "ver"))) redirect("/dashboard")

  const searchParams = await props.searchParams
  const q = searchParams.q?.trim() ?? ""
  const tabAtiva = searchParams.tab ?? "lista"
  const pacienteIdSel = searchParams.pacienteId ?? null

  const pacientes = await prisma.paciente.findMany({
    where: q
      ? {
          OR: [
            { nome: { contains: q, mode: "insensitive" } },
            { cpf: { contains: q } },
            { codigo: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { nome: "asc" },
    select: {
      id: true,
      codigo: true,
      nome: true,
      cpf: true,
      telefone: true,
      email: true,
      dataNascimento: true,
      sexo: true,
      status: true,
      alergias: true,
      observacoes: true,
      endereco: true,
      cidade: true,
      estado: true,
      cep: true,
      rg: true,
      telefoneAlternativo: true,
      medicoReferenciaId: true,
      clinicaReferenciaId: true,
    },
    take: 100,
  })

  let pacienteSelecionado = null
  let consultasPaciente: object[] = []

  if (pacienteIdSel) {
    const p = pacientes.find((p) => p.id.toString() === pacienteIdSel)
    if (p) {
      pacienteSelecionado = p
      const consultas = await prisma.consulta.findMany({
        where: { pacienteId: p.id },
        orderBy: { data: "desc" },
        take: 10,
        select: {
          id: true,
          numero: true,
          tipo: true,
          data: true,
          hora: true,
          status: true,
          profissional: { select: { nome: true } },
          consultorio: { select: { identificacao: true } },
          especialidade: { select: { nome: true } },
          valor: true,
        },
      })
      consultasPaciente = serialize(
        consultas.map((c) => ({
          id: c.id.toString(),
          numero: c.numero,
          tipo: c.tipo,
          data: c.data.toISOString(),
          hora: new Date(c.hora).toISOString().slice(11, 16),
          status: c.status,
          profissionalNome: c.profissional.nome,
          consultorioNome: c.consultorio.identificacao,
          especialidadeNome: c.especialidade?.nome ?? null,
          valor: c.valor ? parseFloat(c.valor.toString()) : null,
        }))
      )
    }
  }

  const profissionais = await prisma.profissional.findMany({
    where: { status: "Ativo" },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  })

  const canEdit = await can(user.perfil, "Pacientes", "editar")
  const canCreate = await can(user.perfil, "Pacientes", "criar")

  const pacientesData = serialize(
    pacientes.map((p) => ({
      id: p.id.toString(),
      codigo: p.codigo,
      nome: p.nome,
      cpf: p.cpf,
      rg: p.rg,
      telefone: p.telefone,
      telefoneAlternativo: p.telefoneAlternativo,
      email: p.email,
      dataNascimento: p.dataNascimento.toISOString(),
      sexo: p.sexo,
      status: p.status,
      alergias: p.alergias,
      observacoes: p.observacoes,
      endereco: p.endereco,
      cidade: p.cidade,
      estado: p.estado,
      cep: p.cep,
      medicoReferenciaId: p.medicoReferenciaId?.toString() ?? null,
      clinicaReferenciaId: p.clinicaReferenciaId?.toString() ?? null,
    }))
  )

  const profData = serialize(profissionais.map((p) => ({ id: p.id.toString(), nome: p.nome })))

  return (
    <PacientesClient
      pacientes={pacientesData}
      profissionais={profData}
      pacienteIdSelecionado={pacienteIdSel}
      consultasPaciente={consultasPaciente as never[]}
      tabAtiva={tabAtiva}
      busca={q}
      canEdit={canEdit}
      canCreate={canCreate}
    />
  )
}
