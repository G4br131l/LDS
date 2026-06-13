import { cache } from "react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { TipoPerfil } from "@/generated/prisma/client"

export type SessionUser = {
  id: string
  nome: string
  email: string
  perfil: TipoPerfil
  clinicaIds: string[]
}

export const verifySession = cache(async (): Promise<SessionUser> => {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  return session.user as SessionUser
})

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth()
  if (!session?.user?.id) return null
  return session.user as SessionUser
})
