"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import type { TipoCapacidade, StatusConsultorio, TipoRecorrencia } from "@/generated/prisma/client"

// ─── Consultório CRUD ─────────────────────────────────────────────────────────

const consultorioSchema = z.object({
  clinicaId: z.string(),
  identificacao: z.string().min(1),
  andar: z.string().optional(),
  especialidadePrincipal: z.string().optional(),
  capacidade: z.enum(["Individual", "Dupla"]),
  horaAbertura: z.string().optional(),
  horaFechamento: z.string().optional(),
  valorPorHora: z.string().optional(),
  status: z.enum(["Ativo", "Manutencao", "Inativo"]),
  observacoes: z.string().optional(),
})

export type ConsultorioActionState = { erro?: string; sucesso?: boolean } | undefined

export async function criarConsultorioAction(
  state: ConsultorioActionState,
  formData: FormData
): Promise<ConsultorioActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Consultorios", "criar"))) return { erro: "Sem permissão" }

  const parsed = consultorioSchema.safeParse({
    clinicaId: formData.get("clinicaId"),
    identificacao: formData.get("identificacao"),
    andar: formData.get("andar") || undefined,
    especialidadePrincipal: formData.get("especialidadePrincipal") || undefined,
    capacidade: formData.get("capacidade"),
    horaAbertura: formData.get("horaAbertura") || undefined,
    horaFechamento: formData.get("horaFechamento") || undefined,
    valorPorHora: formData.get("valorPorHora") || undefined,
    status: formData.get("status"),
    observacoes: formData.get("observacoes") || undefined,
  })

  if (!parsed.success) return { erro: "Dados inválidos: " + parsed.error.issues[0].message }

  const d = parsed.data
  await prisma.consultorio.create({
    data: {
      clinicaId: BigInt(d.clinicaId),
      identificacao: d.identificacao,
      andar: d.andar,
      especialidadePrincipal: d.especialidadePrincipal,
      capacidade: d.capacidade as TipoCapacidade,
      horaAbertura: d.horaAbertura ? new Date(`1970-01-01T${d.horaAbertura}:00Z`) : null,
      horaFechamento: d.horaFechamento ? new Date(`1970-01-01T${d.horaFechamento}:00Z`) : null,
      valorPorHora: d.valorPorHora ? parseFloat(d.valorPorHora) : null,
      status: d.status as StatusConsultorio,
      observacoes: d.observacoes,
    },
  })

  revalidatePath("/consultorios")
  return { sucesso: true }
}

export async function editarConsultorioAction(
  state: ConsultorioActionState,
  formData: FormData
): Promise<ConsultorioActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Consultorios", "editar"))) return { erro: "Sem permissão" }

  const id = formData.get("id") as string
  if (!id) return { erro: "ID não informado" }

  const parsed = consultorioSchema.safeParse({
    clinicaId: formData.get("clinicaId"),
    identificacao: formData.get("identificacao"),
    andar: formData.get("andar") || undefined,
    especialidadePrincipal: formData.get("especialidadePrincipal") || undefined,
    capacidade: formData.get("capacidade"),
    horaAbertura: formData.get("horaAbertura") || undefined,
    horaFechamento: formData.get("horaFechamento") || undefined,
    valorPorHora: formData.get("valorPorHora") || undefined,
    status: formData.get("status"),
    observacoes: formData.get("observacoes") || undefined,
  })

  if (!parsed.success) return { erro: "Dados inválidos: " + parsed.error.issues[0].message }

  const d = parsed.data
  await prisma.consultorio.update({
    where: { id: BigInt(id) },
    data: {
      identificacao: d.identificacao,
      andar: d.andar,
      especialidadePrincipal: d.especialidadePrincipal,
      capacidade: d.capacidade as TipoCapacidade,
      horaAbertura: d.horaAbertura ? new Date(`1970-01-01T${d.horaAbertura}:00Z`) : null,
      horaFechamento: d.horaFechamento ? new Date(`1970-01-01T${d.horaFechamento}:00Z`) : null,
      valorPorHora: d.valorPorHora ? parseFloat(d.valorPorHora) : null,
      status: d.status as StatusConsultorio,
      observacoes: d.observacoes,
    },
  })

  revalidatePath("/consultorios")
  return { sucesso: true }
}

// ─── Agendamento de Sala ──────────────────────────────────────────────────────

const agendamentoSchema = z.object({
  consultorioId: z.string(),
  profissionalId: z.string(),
  data: z.string(),
  dataFim: z.string().optional(),
  recorrencia: z.enum(["Nenhuma", "Semanal", "Mensal"]),
  horarios: z.array(z.string()).min(1, "Selecione ao menos um horário"),
})

function expandirDatas(dataInicio: string, dataFim: string | undefined, recorrencia: string): Date[] {
  const inicio = new Date(`${dataInicio}T12:00:00Z`)
  if (recorrencia === "Nenhuma") return [inicio]

  // Limite: dataFim fornecida ou 6 meses à frente
  const limite = dataFim
    ? new Date(`${dataFim}T12:00:00Z`)
    : (() => {
        const d = new Date(inicio)
        d.setUTCMonth(d.getUTCMonth() + 6)
        return d
      })()

  const datas: Date[] = []
  const atual = new Date(inicio)

  while (atual <= limite) {
    datas.push(new Date(atual))
    if (recorrencia === "Semanal") {
      atual.setUTCDate(atual.getUTCDate() + 7)
    } else {
      atual.setUTCMonth(atual.getUTCMonth() + 1)
    }
  }

  return datas
}

export async function agendarSalaAction(
  state: ConsultorioActionState,
  formData: FormData
): Promise<ConsultorioActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Consultorios", "criar"))) return { erro: "Sem permissão" }

  const horarios = formData.getAll("horarios").map(String)
  const parsed = agendamentoSchema.safeParse({
    consultorioId: formData.get("consultorioId"),
    profissionalId: formData.get("profissionalId"),
    data: formData.get("data"),
    dataFim: (formData.get("dataFim") as string) || undefined,
    recorrencia: formData.get("recorrencia"),
    horarios,
  })

  if (!parsed.success) return { erro: parsed.error.issues[0].message }

  const { consultorioId, profissionalId, data, dataFim, recorrencia, horarios: hrs } = parsed.data

  const datas = expandirDatas(data, dataFim, recorrencia)
  const horariosDb = hrs.map((h) => new Date(`1970-01-01T${h}:00Z`))

  // Verifica conflito em todas as datas expandidas
  const existentes = await prisma.agendamentoHorario.findMany({
    where: {
      agendamentoSala: {
        consultorioId: BigInt(consultorioId),
        data: { in: datas },
      },
      horario: { in: horariosDb },
    },
    include: { agendamentoSala: { select: { data: true } } },
  })

  if (existentes.length > 0) {
    const conflitos = existentes
      .map((e) => {
        const d = new Date(e.agendamentoSala.data).toLocaleDateString("pt-BR")
        const h = new Date(e.horario).toISOString().slice(11, 16)
        return `${d} ${h}`
      })
      .slice(0, 3)
      .join(", ")
    const extra = existentes.length > 3 ? ` e mais ${existentes.length - 3}` : ""
    return { erro: `Conflito de horário: ${conflitos}${extra}` }
  }

  // Cria um AgendamentoSala por data
  await prisma.$transaction(
    datas.map((dt) =>
      prisma.agendamentoSala.create({
        data: {
          consultorioId: BigInt(consultorioId),
          profissionalId: BigInt(profissionalId),
          data: dt,
          recorrencia: recorrencia as TipoRecorrencia,
          horarios: {
            create: horariosDb.map((h) => ({ horario: h })),
          },
        },
      })
    )
  )

  revalidatePath("/consultorios")
  return { sucesso: true }
}

export async function removerAgendamentoAction(agendamentoId: string): Promise<void> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Consultorios", "excluir"))) return

  await prisma.$transaction([
    prisma.agendamentoHorario.deleteMany({ where: { agendamentoSalaId: BigInt(agendamentoId) } }),
    prisma.agendamentoSala.delete({ where: { id: BigInt(agendamentoId) } }),
  ])

  revalidatePath("/consultorios")
}
