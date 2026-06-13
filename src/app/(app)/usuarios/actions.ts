"use server"

import { z } from "zod"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { registrarAuditoria } from "@/lib/auditoria"
import type { StatusUsuario, TipoPerfil, Modulo } from "@/generated/prisma/client"

// ─── Schemas ─────────────────────────────────────────────────────────────────

const usuarioBaseSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  cpf: z.string().min(11),
  telefone: z.string().optional(),
  perfilTipo: z.enum(["Proprietario", "Gerente", "Medico", "Secretaria", "Financeiro", "Paciente"]),
  clinicaIds: z.array(z.string()),
  exigir2fa: z.boolean().optional(),
  restringirPorIp: z.boolean().optional(),
})

const criarSchema = usuarioBaseSchema.extend({
  senha: z.string().min(6),
})

const editarSchema = usuarioBaseSchema

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getPerfil(tipo: TipoPerfil) {
  return prisma.perfilAcesso.findUniqueOrThrow({ where: { tipo } })
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type UsuarioActionState = { erro?: string; sucesso?: boolean } | undefined

export async function criarUsuarioAction(
  state: UsuarioActionState,
  formData: FormData
): Promise<UsuarioActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Usuarios", "criar"))) return { erro: "Sem permissão" }

  const clinicaIds = formData.getAll("clinicaIds").map(String)
  const parsed = criarSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    cpf: formData.get("cpf"),
    telefone: formData.get("telefone") || undefined,
    perfilTipo: formData.get("perfilTipo"),
    clinicaIds,
    senha: formData.get("senha"),
    exigir2fa: formData.get("exigir2fa") === "on",
    restringirPorIp: formData.get("restringirPorIp") === "on",
  })

  if (!parsed.success) return { erro: "Dados inválidos: " + parsed.error.issues[0].message }

  const { nome, email, cpf, telefone, perfilTipo, senha, exigir2fa, restringirPorIp } = parsed.data

  const perfil = await getPerfil(perfilTipo as TipoPerfil)
  const senhaHash = await bcrypt.hash(senha, 12)

  await prisma.usuario.create({
    data: {
      nome,
      email,
      cpf: cpf.replace(/\D/g, "").padStart(14, "0").slice(0, 14),
      telefone,
      senhaHash,
      exigir2fa: exigir2fa ?? false,
      restringirPorIp: restringirPorIp ?? false,
      perfilAcesso: { connect: { id: perfil.id } },
      clinicas: {
        create: parsed.data.clinicaIds.map((id) => ({
          clinicaId: BigInt(id),
        })),
      },
    },
  })

  await registrarAuditoria(user.id, "usuario_criado", `Email: ${email}, Perfil: ${perfilTipo}`)
  revalidatePath("/usuarios")
  return { sucesso: true }
}

export async function editarUsuarioAction(
  state: UsuarioActionState,
  formData: FormData
): Promise<UsuarioActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Usuarios", "editar"))) return { erro: "Sem permissão" }

  const id = formData.get("id") as string
  if (!id) return { erro: "ID do usuário não informado" }

  const clinicaIds = formData.getAll("clinicaIds").map(String)
  const parsed = editarSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    cpf: formData.get("cpf"),
    telefone: formData.get("telefone") || undefined,
    perfilTipo: formData.get("perfilTipo"),
    clinicaIds,
    exigir2fa: formData.get("exigir2fa") === "on",
    restringirPorIp: formData.get("restringirPorIp") === "on",
  })

  if (!parsed.success) return { erro: "Dados inválidos: " + parsed.error.issues[0].message }

  const { nome, email, cpf, telefone, perfilTipo, exigir2fa, restringirPorIp } = parsed.data
  const perfil = await getPerfil(perfilTipo as TipoPerfil)

  await prisma.$transaction([
    prisma.usuarioClinica.deleteMany({ where: { usuarioId: BigInt(id!) } }),
    prisma.usuario.update({
      where: { id: BigInt(id!) },
      data: {
        nome,
        email,
        cpf: cpf.replace(/\D/g, "").padStart(14, "0").slice(0, 14),
        telefone,
        exigir2fa: exigir2fa ?? false,
        restringirPorIp: restringirPorIp ?? false,
        perfilAcessoId: perfil.id,
        clinicas: {
          create: parsed.data.clinicaIds.map((cid) => ({ clinicaId: BigInt(cid) })),
        },
      },
    }),
  ])

  await registrarAuditoria(user.id, "usuario_editado", `ID: ${id}, Perfil: ${perfilTipo}`)
  revalidatePath("/usuarios")
  return { sucesso: true }
}

export async function alterarStatusUsuarioAction(
  id: string,
  status: StatusUsuario
): Promise<void> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Usuarios", "editar"))) return

  await prisma.usuario.update({
    where: { id: BigInt(id) },
    data: { status },
  })
  await registrarAuditoria(user.id, "usuario_status", `ID: ${id} → ${status}`)
  revalidatePath("/usuarios")
}

export async function redefinirSenhaAdminAction(id: string): Promise<void> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Usuarios", "editar"))) return

  const novaSenha = Math.random().toString(36).slice(-8)
  const hash = await bcrypt.hash(novaSenha, 12)
  await prisma.usuario.update({
    where: { id: BigInt(id) },
    data: { senhaHash: hash, resetToken: null, resetExpiraEm: null },
  })
  console.log(`[ADMIN RESET] Usuário ${id} → senha temporária: ${novaSenha}`)
  await registrarAuditoria(user.id, "senha_redefinida", `ID alvo: ${id}`)
  revalidatePath("/usuarios")
}

// ─── Permissões ───────────────────────────────────────────────────────────────

export type PermissoesMatrix = Record<string, { ver: boolean; criar: boolean; editar: boolean; excluir: boolean }>

export async function atualizarPermissoesAction(
  perfilTipo: TipoPerfil,
  matriz: PermissoesMatrix
): Promise<void> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Usuarios", "editar"))) return

  const perfil = await getPerfil(perfilTipo)

  await Promise.all(
    Object.entries(matriz).map(([moduloStr, acoes]) =>
      prisma.permissao.upsert({
        where: { perfilAcessoId_modulo: { perfilAcessoId: perfil.id, modulo: moduloStr as Modulo } },
        create: { perfilAcessoId: perfil.id, modulo: moduloStr as Modulo, ...acoes },
        update: acoes,
      })
    )
  )

  await registrarAuditoria(user.id, "permissoes_atualizadas", `Perfil: ${perfilTipo}`)
  revalidatePath("/usuarios")
}
