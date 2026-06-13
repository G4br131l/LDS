"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { registrarAuditoria } from "@/lib/auditoria"
import type { TipoConselho, ModeloCobranca, StatusProfissional } from "@/generated/prisma/client"

// ─── Schemas ─────────────────────────────────────────────────────────────────

const profissionalSchema = z.object({
  nome: z.string().min(2),
  conselho: z.string(),
  registroConselho: z.string().min(1),
  ufConselho: z.string().length(2),
  telefone: z.string().optional(),
  email: z.string().email(),
  modeloCobranca: z.enum(["Percentual", "Aluguel"]),
  valorCobranca: z.string().min(1),
  status: z.enum(["Ativo", "Inativo"]),
  especialidadeIds: z.array(z.string()),
})

// ─── Profissional CRUD ────────────────────────────────────────────────────────

export type ProfissionalActionState = { erro?: string; sucesso?: boolean } | undefined

export async function criarProfissionalAction(
  state: ProfissionalActionState,
  formData: FormData
): Promise<ProfissionalActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Profissionais", "criar"))) return { erro: "Sem permissão" }

  const especialidadeIds = formData.getAll("especialidadeIds").map(String)
  const parsed = profissionalSchema.safeParse({
    nome: formData.get("nome"),
    conselho: formData.get("conselho"),
    registroConselho: formData.get("registroConselho"),
    ufConselho: formData.get("ufConselho"),
    telefone: formData.get("telefone") || undefined,
    email: formData.get("email"),
    modeloCobranca: formData.get("modeloCobranca"),
    valorCobranca: formData.get("valorCobranca"),
    status: formData.get("status"),
    especialidadeIds,
  })

  if (!parsed.success) return { erro: "Dados inválidos: " + parsed.error.issues[0].message }

  const { nome, conselho, registroConselho, ufConselho, telefone, email, modeloCobranca, valorCobranca, status, especialidadeIds: espIds } = parsed.data

  await prisma.profissional.create({
    data: {
      nome,
      conselho: conselho as TipoConselho,
      registroConselho,
      ufConselho,
      telefone,
      email,
      modeloCobranca: modeloCobranca as ModeloCobranca,
      valorCobranca: parseFloat(valorCobranca),
      status: status as StatusProfissional,
      especialidades: {
        create: espIds.map((id) => ({ especialidadeId: BigInt(id) })),
      },
    },
  })

  await registrarAuditoria(user.id, "profissional_criado", `Nome: ${nome}`)
  revalidatePath("/profissionais")
  return { sucesso: true }
}

export async function editarProfissionalAction(
  state: ProfissionalActionState,
  formData: FormData
): Promise<ProfissionalActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Profissionais", "editar"))) return { erro: "Sem permissão" }

  const id = formData.get("id") as string
  if (!id) return { erro: "ID não informado" }

  const especialidadeIds = formData.getAll("especialidadeIds").map(String)
  const parsed = profissionalSchema.safeParse({
    nome: formData.get("nome"),
    conselho: formData.get("conselho"),
    registroConselho: formData.get("registroConselho"),
    ufConselho: formData.get("ufConselho"),
    telefone: formData.get("telefone") || undefined,
    email: formData.get("email"),
    modeloCobranca: formData.get("modeloCobranca"),
    valorCobranca: formData.get("valorCobranca"),
    status: formData.get("status"),
    especialidadeIds,
  })

  if (!parsed.success) return { erro: "Dados inválidos: " + parsed.error.issues[0].message }

  const { nome, conselho, registroConselho, ufConselho, telefone, email, modeloCobranca, valorCobranca, status, especialidadeIds: espIds } = parsed.data

  await prisma.$transaction([
    prisma.profissionalEspecialidade.deleteMany({ where: { profissionalId: BigInt(id) } }),
    prisma.profissional.update({
      where: { id: BigInt(id) },
      data: {
        nome,
        conselho: conselho as TipoConselho,
        registroConselho,
        ufConselho,
        telefone,
        email,
        modeloCobranca: modeloCobranca as ModeloCobranca,
        valorCobranca: parseFloat(valorCobranca),
        status: status as StatusProfissional,
        especialidades: {
          create: espIds.map((eid) => ({ especialidadeId: BigInt(eid) })),
        },
      },
    }),
  ])

  await registrarAuditoria(user.id, "profissional_editado", `ID: ${id}, Nome: ${nome}`)
  revalidatePath("/profissionais")
  return { sucesso: true }
}

// ─── Vínculos ────────────────────────────────────────────────────────────────

const vinculoSchema = z.object({
  profissionalId: z.string(),
  consultorioId: z.string(),
  diasSemana: z.string().min(1),
  horarios: z.array(z.string()),
})

export async function adicionarVinculoAction(
  state: ProfissionalActionState,
  formData: FormData
): Promise<ProfissionalActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Profissionais", "editar"))) return { erro: "Sem permissão" }

  const horarios = formData.getAll("horarios").map(String)
  const parsed = vinculoSchema.safeParse({
    profissionalId: formData.get("profissionalId"),
    consultorioId: formData.get("consultorioId"),
    diasSemana: formData.get("diasSemana"),
    horarios,
  })

  if (!parsed.success) return { erro: "Dados inválidos: " + parsed.error.issues[0].message }

  const { profissionalId, consultorioId, diasSemana, horarios: hrs } = parsed.data

  if (hrs.length === 0) return { erro: "Selecione ao menos um horário" }

  await prisma.vinculoProfissional.create({
    data: {
      profissionalId: BigInt(profissionalId),
      consultorioId: BigInt(consultorioId),
      diasSemana,
      horarios: {
        create: hrs.map((h) => ({ horario: new Date(`1970-01-01T${h}:00Z`) })),
      },
    },
  })

  revalidatePath("/profissionais")
  return { sucesso: true }
}

export async function removerVinculoAction(vinculoId: string): Promise<void> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Profissionais", "editar"))) return

  await prisma.$transaction([
    prisma.vinculoHorario.deleteMany({ where: { vinculoId: BigInt(vinculoId) } }),
    prisma.vinculoProfissional.delete({ where: { id: BigInt(vinculoId) } }),
  ])

  revalidatePath("/profissionais")
}
