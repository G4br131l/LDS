import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { serialize } from "@/lib/serialize"
import { ProntuarioClient } from "@/components/prontuario/prontuario-client"
import { redirect } from "next/navigation"

type Entrada = {
  id: string
  data: string
  profissionalNome: string
  especialidadeId: string
  especialidadeNome: string
  texto: string
  valorConsulta: number
  totalProcedimentos: number
  rascunho: boolean
  campos: { id?: string; tipo: string; nomeCustom?: string | null; valor?: string | null; unidade?: string | null; preco?: number | null }[]
}

export default async function ProntuarioPage(props: {
  searchParams: Promise<{ pacienteId?: string; entradaId?: string; q?: string }>
}) {
  const user = await verifySession()
  if (!(await can(user.perfil, "Prontuario", "ver"))) redirect("/dashboard")

  const searchParams = await props.searchParams
  const pacienteIdStr = searchParams.pacienteId ?? null
  const entradaIdStr = searchParams.entradaId ?? null
  const qPaciente = searchParams.q?.trim() ?? ""

  // Busca pacientes para o search
  const pacientes = await prisma.paciente.findMany({
    where: qPaciente
      ? {
          OR: [
            { nome: { contains: qPaciente, mode: "insensitive" } },
            { cpf: { contains: qPaciente } },
            { codigo: { contains: qPaciente } },
          ],
        }
      : { id: { gt: BigInt(0) } },
    orderBy: { nome: "asc" },
    select: { id: true, codigo: true, nome: true, cpf: true, alergias: true },
    take: qPaciente ? 20 : 0, // Sem busca não carrega a lista (muitos registros)
  })

  let pacienteAtual = null
  let entradas: object[] = []
  let entradaSelecionada = null

  if (pacienteIdStr) {
    const p = await prisma.paciente.findUnique({
      where: { id: BigInt(pacienteIdStr) },
      select: {
        id: true,
        codigo: true,
        nome: true,
        cpf: true,
        dataNascimento: true,
        sexo: true,
        alergias: true,
        telefone: true,
      },
    })

    if (p) {
      pacienteAtual = serialize({
        id: p.id.toString(),
        codigo: p.codigo,
        nome: p.nome,
        cpf: p.cpf,
        dataNascimento: p.dataNascimento.toISOString(),
        sexo: p.sexo,
        alergias: p.alergias,
        telefone: p.telefone,
      })

      // Entradas do prontuário
      const prontuario = await prisma.prontuario.findUnique({
        where: { pacienteId: p.id },
        include: {
          entradas: {
            orderBy: { data: "desc" },
            include: {
              profissional: { select: { nome: true } },
              especialidade: { select: { id: true, nome: true } },
              campos: true,
            },
          },
        },
      })

      if (prontuario) {
        entradas = serialize(
          prontuario.entradas.map((e) => ({
            id: e.id.toString(),
            data: e.data.toISOString(),
            profissionalNome: e.profissional.nome,
            especialidadeId: e.especialidadeId.toString(),
            especialidadeNome: e.especialidade.nome,
            texto: e.texto,
            valorConsulta: parseFloat(e.valorConsulta.toString()),
            totalProcedimentos: parseFloat(e.totalProcedimentos.toString()),
            rascunho: e.rascunho,
            campos: e.campos.map((c) => ({
              id: c.id.toString(),
              tipo: c.tipo,
              nomeCustom: c.nomeCustom,
              valor: c.valor,
              unidade: c.unidade,
              preco: c.preco ? parseFloat(c.preco.toString()) : null,
            })),
          }))
        )

        if (entradaIdStr) {
          entradaSelecionada = (entradas as Entrada[]).find((e) => e.id === entradaIdStr) ?? null
        }
      }
    }
  }

  // Especialidades para o form
  const especialidades = await prisma.especialidade.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  })

  // Consultas do paciente para vincular à entrada
  const consultasPaciente = pacienteIdStr
    ? await prisma.consulta.findMany({
        where: {
          pacienteId: BigInt(pacienteIdStr),
          status: "Realizada",
        },
        orderBy: { data: "desc" },
        take: 20,
        select: { id: true, numero: true, data: true, profissional: { select: { nome: true } } },
      })
    : []

  const canCreate = await can(user.perfil, "Prontuario", "criar")
  const canEdit = await can(user.perfil, "Prontuario", "editar")

  return (
    <ProntuarioClient
      pacientes={serialize(pacientes.map((p) => ({ id: p.id.toString(), codigo: p.codigo, nome: p.nome, cpf: p.cpf, alergias: p.alergias })))}
      pacienteAtual={pacienteAtual}
      entradas={entradas as never[]}
      entradaSelecionada={entradaSelecionada}
      especialidades={serialize(especialidades.map((e) => ({ id: e.id.toString(), nome: e.nome })))}
      consultasPaciente={serialize(
        consultasPaciente.map((c) => ({
          id: c.id.toString(),
          numero: c.numero,
          data: c.data.toISOString(),
          profissionalNome: c.profissional.nome,
        }))
      )}
      pacienteIdAtual={pacienteIdStr}
      entradaIdAtual={entradaIdStr}
      busca={qPaciente}
      canCreate={canCreate}
      canEdit={canEdit}
    />
  )
}
