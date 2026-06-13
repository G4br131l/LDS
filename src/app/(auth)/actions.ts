"use server"

import { signIn, signOut } from "@/lib/auth"
import { AuthError } from "next-auth"
import { z } from "zod"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
})

export type LoginState = { erro?: string } | undefined

export async function loginAction(
  state: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  })

  if (!parsed.success) {
    return { erro: "Email ou senha inválidos" }
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.senha,
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { erro: "Email ou senha incorretos" }
    }
    // redirect() lança exceção — deixa propagar
    throw error
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" })
}

const resetSchema = z.object({
  email: z.string().email(),
})

export type ResetState = { mensagem?: string; erro?: string } | undefined

export async function solicitarResetAction(
  state: ResetState,
  formData: FormData
): Promise<ResetState> {
  const parsed = resetSchema.safeParse({ email: formData.get("email") })
  if (!parsed.success) return { erro: "Email inválido" }

  const usuario = await prisma.usuario.findUnique({
    where: { email: parsed.data.email },
  })

  // Sempre retorna sucesso para não expor se email existe
  if (!usuario) {
    return { mensagem: "Se o email existir, você receberá as instruções em breve." }
  }

  const token = crypto.randomBytes(32).toString("hex")
  const expira = new Date(Date.now() + 60 * 60 * 1000) // 1h

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { resetToken: token, resetExpiraEm: expira },
  })

  // Em dev expõe o token no log no lugar de enviar email
  console.log(`[RESET] Token para ${parsed.data.email}: ${token}`)

  return { mensagem: "Se o email existir, você receberá as instruções em breve." }
}

const novaSenhaSchema = z.object({
  token: z.string().min(1),
  senha: z.string().min(6),
})

export async function redefinirSenhaAction(
  state: ResetState,
  formData: FormData
): Promise<ResetState> {
  const parsed = novaSenhaSchema.safeParse({
    token: formData.get("token"),
    senha: formData.get("senha"),
  })
  if (!parsed.success) {
    return { erro: "Dados inválidos" }
  }

  const usuario = await prisma.usuario.findFirst({
    where: {
      resetToken: parsed.data.token,
      resetExpiraEm: { gt: new Date() },
    },
  })

  if (!usuario) {
    return { erro: "Link inválido ou expirado" }
  }

  const hash = await bcrypt.hash(parsed.data.senha, 12)
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { senhaHash: hash, resetToken: null, resetExpiraEm: null },
  })

  redirect("/login")
}
