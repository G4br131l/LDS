import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { serialize } from "@/lib/serialize"
import { ConsultaDetalhe } from "@/components/agenda/consulta-detalhe"
import { notFound, redirect } from "next/navigation"

export default async function ConsultaDetalhePage(props: {
  params: Promise<{ id: string }>
}) {
  const user = await verifySession()
  if (!(await can(user.perfil, "Agenda", "ver"))) redirect("/dashboard")

  const { id } = await props.params

  const consulta = await prisma.consulta.findUnique({
    where: { id: BigInt(id) },
    include: {
      paciente: {
        select: {
          id: true,
          nome: true,
          codigo: true,
          cpf: true,
          telefone: true,
          email: true,
          dataNascimento: true,
          sexo: true,
          endereco: true,
          cidade: true,
          estado: true,
          alergias: true,
        },
      },
      profissional: {
        select: {
          nome: true,
          conselho: true,
          registroConselho: true,
          ufConselho: true,
        },
      },
      consultorio: {
        select: {
          identificacao: true,
          clinica: { select: { nome: true } },
        },
      },
      especialidade: { select: { nome: true } },
    },
  })

  if (!consulta) notFound()

  const canEdit = await can(user.perfil, "Agenda", "editar")

  const consultorios = await prisma.consultorio.findMany({
    where: { status: "Ativo", clinicaId: consulta.consultorio.clinica ? undefined : undefined },
    orderBy: [{ clinicaId: "asc" }, { identificacao: "asc" }],
    select: { id: true, identificacao: true },
  })

  const data = serialize({
    id: consulta.id.toString(),
    numero: consulta.numero,
    tipo: consulta.tipo,
    data: consulta.data.toISOString(),
    hora: new Date(consulta.hora).toISOString().slice(11, 16),
    duracaoMinutos: consulta.duracaoMinutos,
    status: consulta.status,
    motivo: consulta.motivo,
    valor: consulta.valor ? parseFloat(consulta.valor.toString()) : null,
    pago: consulta.pago,
    formaPagamento: consulta.formaPagamento,
    especialidadeNome: consulta.especialidade?.nome ?? null,
    profissionalNome: consulta.profissional.nome,
    profissionalConselho: `${consulta.profissional.conselho} ${consulta.profissional.registroConselho}/${consulta.profissional.ufConselho}`,
    consultorioNome: consulta.consultorio.identificacao,
    clinicaNome: consulta.consultorio.clinica.nome,
    paciente: {
      id: consulta.paciente.id.toString(),
      nome: consulta.paciente.nome,
      codigo: consulta.paciente.codigo,
      cpf: consulta.paciente.cpf,
      telefone: consulta.paciente.telefone,
      email: consulta.paciente.email,
      dataNascimento: consulta.paciente.dataNascimento.toISOString(),
      sexo: consulta.paciente.sexo,
      endereco: consulta.paciente.endereco,
      cidade: consulta.paciente.cidade,
      estado: consulta.paciente.estado,
      alergias: consulta.paciente.alergias,
    },
    consultorios: consultorios.map((c) => ({
      id: c.id.toString(),
      identificacao: c.identificacao,
    })),
  })

  return <ConsultaDetalhe consulta={data} canEdit={canEdit} />
}
