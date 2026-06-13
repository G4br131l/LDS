import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { serialize } from "@/lib/serialize"
import { ProfissionaisClient } from "@/components/profissionais/profissionais-client"
import { redirect } from "next/navigation"

export default async function ProfissionaisPage() {
  const user = await verifySession()
  if (!(await can(user.perfil, "Profissionais", "ver"))) redirect("/dashboard")

  const [profissionais, especialidades] = await Promise.all([
    prisma.profissional.findMany({
      include: {
        especialidades: { include: { especialidade: true } },
        agendamentos: {
          include: {
            consultorio: { include: { clinica: { select: { nome: true } } } },
            horarios: true,
          },
          orderBy: { data: "asc" },
        },
        consultas: {
          orderBy: { data: "desc" },
          take: 50,
          include: {
            paciente: { select: { nome: true } },
            consultorio: {
              include: { clinica: { select: { nome: true } } },
            },
          },
        },
        pagamentos: {
          orderBy: { dataInicio: "desc" },
          take: 20,
        },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.especialidade.findMany({ orderBy: { nome: "asc" } }),
  ])

  const data = serialize(
    profissionais.map((p) => ({
      id: p.id.toString(),
      nome: p.nome,
      conselho: p.conselho,
      registroConselho: p.registroConselho,
      ufConselho: p.ufConselho,
      telefone: p.telefone,
      email: p.email,
      modeloCobranca: p.modeloCobranca,
      valorCobranca: parseFloat(p.valorCobranca.toString()),
      status: p.status,
      especialidades: p.especialidades.map((pe) => ({
        id: pe.especialidade.id.toString(),
        nome: pe.especialidade.nome,
      })),
      agendamentos: p.agendamentos.map((a) => ({
        id: a.id.toString(),
        consultorioNome: a.consultorio.identificacao,
        clinicaNome: a.consultorio.clinica.nome,
        data: a.data.toISOString().slice(0, 10),
        recorrencia: a.recorrencia,
        horarios: a.horarios.map((h) => new Date(h.horario).toISOString().slice(11, 16)),
      })),
      consultas: p.consultas.map((c) => ({
        id: c.id.toString(),
        data: c.data.toISOString(),
        hora: new Date(c.hora).toISOString().slice(11, 16),
        pacienteNome: c.paciente.nome,
        consultorioNome: c.consultorio.identificacao,
        clinicaNome: c.consultorio.clinica.nome,
        valor: c.valor ? parseFloat(c.valor.toString()) : null,
        status: c.status,
      })),
      pagamentos: p.pagamentos.map((pg) => ({
        id: pg.id.toString(),
        dataInicio: pg.dataInicio.toISOString(),
        dataFim: pg.dataFim.toISOString(),
        valorDevido: parseFloat(pg.valorDevido.toString()),
        valorRecebido: parseFloat(pg.valorRecebido.toString()),
        status: pg.status,
      })),
    }))
  )

  const espData = serialize(
    especialidades.map((e) => ({ id: e.id.toString(), nome: e.nome }))
  )

  const canEdit = await can(user.perfil, "Profissionais", "editar")
  const canCreate = await can(user.perfil, "Profissionais", "criar")

  return (
    <ProfissionaisClient
      profissionais={data}
      especialidades={espData}
      canEdit={canEdit}
      canCreate={canCreate}
      userPerfil={user.perfil}
    />
  )
}
