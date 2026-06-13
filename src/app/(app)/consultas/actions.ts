"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { registrarAuditoria } from "@/lib/auditoria"
import type { TipoConsulta, StatusConsulta, FormaPagamento } from "@/generated/prisma/client"

const consultaSchema = z.object({
  pacienteId: z.string().min(1, "Selecione o paciente"),
  profissionalId: z.string().min(1, "Selecione o profissional"),
  consultorioId: z.string().min(1, "Selecione o consultório"),
  especialidadeId: z.string().optional(),
  tipo: z.enum(["Primeira_consulta", "Retorno", "Procedimento", "Urgencia"]),
  data: z.string().min(1, "Informe a data"),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  duracaoMinutos: z.string().optional(),
  motivo: z.string().optional(),
  valor: z.string().optional(),
  formaPagamento: z.string().optional(),
})

export type ConsultaActionState = { erro?: string; sucesso?: boolean; id?: string } | undefined

async function gerarNumero(): Promise<string> {
  const count = await prisma.consulta.count()
  return `CST-${String(count + 1).padStart(6, "0")}`
}

export async function agendarConsultaAction(
  state: ConsultaActionState,
  formData: FormData
): Promise<ConsultaActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Agenda", "criar"))) return { erro: "Sem permissão" }

  const raw = Object.fromEntries(formData.entries())
  const parsed = consultaSchema.safeParse(raw)
  if (!parsed.success) return { erro: parsed.error.issues[0].message }

  const d = parsed.data
  const numero = await gerarNumero()

  try {
    const consulta = await prisma.consulta.create({
      data: {
        numero,
        pacienteId: BigInt(d.pacienteId),
        profissionalId: BigInt(d.profissionalId),
        consultorioId: BigInt(d.consultorioId),
        especialidadeId: d.especialidadeId ? BigInt(d.especialidadeId) : null,
        tipo: d.tipo as TipoConsulta,
        data: new Date(`${d.data}T00:00:00Z`),
        hora: new Date(`1970-01-01T${d.hora}:00Z`),
        duracaoMinutos: d.duracaoMinutos ? parseInt(d.duracaoMinutos) : 30,
        motivo: d.motivo || null,
        valor: d.valor ? parseFloat(d.valor.replace(",", ".")) : null,
        formaPagamento: (d.formaPagamento as FormaPagamento) || null,
      },
    })
    await registrarAuditoria(user.id, "consulta_agendada", `Nº ${numero}, Paciente: ${d.pacienteId}`)
    revalidatePath("/agenda")
    return { sucesso: true, id: consulta.id.toString() }
  } catch {
    return { erro: "Erro ao salvar consulta. Verifique os dados e tente novamente." }
  }
}

export async function alterarStatusConsultaAction(
  consultaId: string,
  novoStatus: StatusConsulta
): Promise<{ erro?: string }> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Agenda", "editar"))) return { erro: "Sem permissão" }

  await prisma.consulta.update({
    where: { id: BigInt(consultaId) },
    data: { status: novoStatus },
  })

  await registrarAuditoria(user.id, "consulta_status", `ID: ${consultaId} → ${novoStatus}`)
  revalidatePath("/agenda")
  revalidatePath(`/consultas/${consultaId}`)
  return {}
}

export async function reagendarConsultaAction(
  state: ConsultaActionState,
  formData: FormData
): Promise<ConsultaActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Agenda", "editar"))) return { erro: "Sem permissão" }

  const id = formData.get("id") as string
  const data = formData.get("data") as string
  const hora = formData.get("hora") as string
  const consultorioId = formData.get("consultorioId") as string | null

  if (!id || !data || !hora) return { erro: "Dados incompletos" }

  try {
    await prisma.consulta.update({
      where: { id: BigInt(id) },
      data: {
        data: new Date(`${data}T00:00:00Z`),
        hora: new Date(`1970-01-01T${hora}:00Z`),
        ...(consultorioId ? { consultorioId: BigInt(consultorioId) } : {}),
        status: "Agendada",
      },
    })
    revalidatePath("/agenda")
    revalidatePath(`/consultas/${id}`)
    return { sucesso: true }
  } catch {
    return { erro: "Erro ao reagendar" }
  }
}

export async function registrarPagamentoConsultaAction(
  state: ConsultaActionState,
  formData: FormData
): Promise<ConsultaActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Agenda", "editar"))) return { erro: "Sem permissão" }

  const id = formData.get("id") as string
  const valorStr = formData.get("valor") as string
  const formaPgto = formData.get("formaPagamento") as string

  if (!id) return { erro: "Consulta não informada" }

  await prisma.consulta.update({
    where: { id: BigInt(id) },
    data: {
      pago: true,
      valor: valorStr ? parseFloat(valorStr.replace(",", ".")) : undefined,
      formaPagamento: (formaPgto as FormaPagamento) || null,
    },
  })

  revalidatePath(`/consultas/${id}`)
  return { sucesso: true }
}
