"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import type { TipoCampoClinico } from "@/generated/prisma/client"

// ── Schema para uma entrada ──────────────────────────────────────────────────
const entradaSchema = z.object({
  pacienteId: z.string().min(1),
  especialidadeId: z.string().min(1, "Especialidade obrigatória"),
  consultaId: z.string().optional(),
  data: z.string().min(1),
  texto: z.string().min(1, "Texto da entrada obrigatório"),
  valorConsulta: z.string().default("0"),
  totalProcedimentos: z.string().default("0"),
})

export type EntradaActionState = { erro?: string; sucesso?: boolean; id?: string } | undefined

// ── Criar entrada (rascunho) ──────────────────────────────────────────────────
export async function criarEntradaAction(
  state: EntradaActionState,
  formData: FormData
): Promise<EntradaActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Prontuario", "criar"))) return { erro: "Sem permissão" }

  const raw = Object.fromEntries(formData.entries())
  const parsed = entradaSchema.safeParse(raw)
  if (!parsed.success) return { erro: parsed.error.issues[0].message }

  const d = parsed.data

  // Busca ou cria prontuário do paciente
  let prontuario = await prisma.prontuario.findUnique({
    where: { pacienteId: BigInt(d.pacienteId) },
  })
  if (!prontuario) {
    prontuario = await prisma.prontuario.create({
      data: { pacienteId: BigInt(d.pacienteId) },
    })
  }

  // Verifica que profissional está vinculado ao usuário
  const usuarioDb = await prisma.usuario.findUnique({
    where: { id: BigInt(user.id) },
    select: { profissionalId: true },
  })
  if (!usuarioDb?.profissionalId) return { erro: "Usuário não vinculado a profissional" }

  // Extrai campos clínicos do formData: campo_tipo_N, campo_valor_N, etc.
  const campos: { tipo: TipoCampoClinico; nomeCustom?: string; valor?: string; unidade?: string; preco?: number }[] = []
  let idx = 0
  while (formData.has(`campo_tipo_${idx}`)) {
    const tipo = formData.get(`campo_tipo_${idx}`) as TipoCampoClinico
    const valor = (formData.get(`campo_valor_${idx}`) as string) || undefined
    const unidade = (formData.get(`campo_unidade_${idx}`) as string) || undefined
    const nomeCustom = (formData.get(`campo_nome_${idx}`) as string) || undefined
    const precoStr = formData.get(`campo_preco_${idx}`) as string
    const preco = precoStr ? parseFloat(precoStr) : undefined
    campos.push({ tipo, nomeCustom, valor, unidade, preco })
    idx++
  }

  try {
    const entrada = await prisma.entradaProntuario.create({
      data: {
        prontuarioId: prontuario.id,
        profissionalId: usuarioDb.profissionalId,
        especialidadeId: BigInt(d.especialidadeId),
        consultaId: d.consultaId ? BigInt(d.consultaId) : null,
        data: new Date(`${d.data}T12:00:00Z`),
        texto: d.texto,
        valorConsulta: parseFloat(d.valorConsulta),
        totalProcedimentos: parseFloat(d.totalProcedimentos),
        rascunho: true,
        campos: {
          create: campos.map((c) => ({
            tipo: c.tipo,
            nomeCustom: c.nomeCustom ?? null,
            valor: c.valor ?? null,
            unidade: c.unidade ?? null,
            preco: c.preco ?? null,
          })),
        },
      },
    })
    revalidatePath("/prontuario")
    return { sucesso: true, id: entrada.id.toString() }
  } catch {
    return { erro: "Erro ao salvar entrada" }
  }
}

// ── Finalizar entrada ──────────────────────────────────────────────────────────
export async function finalizarEntradaAction(
  state: EntradaActionState,
  formData: FormData
): Promise<EntradaActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Prontuario", "editar"))) return { erro: "Sem permissão" }

  const entradaId = formData.get("entradaId") as string
  if (!entradaId) return { erro: "ID não informado" }

  try {
    await prisma.entradaProntuario.update({
      where: { id: BigInt(entradaId) },
      data: { rascunho: false },
    })
    revalidatePath("/prontuario")
    return { sucesso: true }
  } catch {
    return { erro: "Erro ao finalizar entrada" }
  }
}

// ── Editar entrada (rascunho) ─────────────────────────────────────────────────
export async function editarEntradaAction(
  state: EntradaActionState,
  formData: FormData
): Promise<EntradaActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Prontuario", "editar"))) return { erro: "Sem permissão" }

  const entradaId = formData.get("entradaId") as string
  if (!entradaId) return { erro: "ID não informado" }

  const raw = Object.fromEntries(formData.entries())
  const parsed = entradaSchema.safeParse(raw)
  if (!parsed.success) return { erro: parsed.error.issues[0].message }

  const d = parsed.data

  // Recria campos clínicos
  const campos: { tipo: TipoCampoClinico; nomeCustom?: string; valor?: string; unidade?: string; preco?: number }[] = []
  let idx = 0
  while (formData.has(`campo_tipo_${idx}`)) {
    const tipo = formData.get(`campo_tipo_${idx}`) as TipoCampoClinico
    const valor = (formData.get(`campo_valor_${idx}`) as string) || undefined
    const unidade = (formData.get(`campo_unidade_${idx}`) as string) || undefined
    const nomeCustom = (formData.get(`campo_nome_${idx}`) as string) || undefined
    const precoStr = formData.get(`campo_preco_${idx}`) as string
    const preco = precoStr ? parseFloat(precoStr) : undefined
    campos.push({ tipo, nomeCustom, valor, unidade, preco })
    idx++
  }

  try {
    await prisma.$transaction([
      prisma.campoClinico.deleteMany({ where: { entradaProntuarioId: BigInt(entradaId) } }),
      prisma.entradaProntuario.update({
        where: { id: BigInt(entradaId) },
        data: {
          especialidadeId: BigInt(d.especialidadeId),
          data: new Date(`${d.data}T12:00:00Z`),
          texto: d.texto,
          valorConsulta: parseFloat(d.valorConsulta),
          totalProcedimentos: parseFloat(d.totalProcedimentos),
          campos: {
            create: campos.map((c) => ({
              tipo: c.tipo,
              nomeCustom: c.nomeCustom ?? null,
              valor: c.valor ?? null,
              unidade: c.unidade ?? null,
              preco: c.preco ?? null,
            })),
          },
        },
      }),
    ])
    revalidatePath("/prontuario")
    return { sucesso: true }
  } catch {
    return { erro: "Erro ao atualizar entrada" }
  }
}
