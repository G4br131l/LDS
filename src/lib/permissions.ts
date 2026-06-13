import { cache } from "react"
import { prisma } from "@/lib/prisma"
import type { TipoPerfil, Modulo } from "@/generated/prisma/client"

export type Acao = "ver" | "criar" | "editar" | "excluir"

export const getPermissoes = cache(async (perfilTipo: TipoPerfil) => {
  const perfil = await prisma.perfilAcesso.findUnique({
    where: { tipo: perfilTipo },
    include: { permissoes: true },
  })
  return perfil?.permissoes ?? []
})

export async function can(
  perfilTipo: TipoPerfil,
  modulo: Modulo,
  acao: Acao
): Promise<boolean> {
  const permissoes = await getPermissoes(perfilTipo)
  const p = permissoes.find((p) => p.modulo === modulo)
  if (!p) return false
  return p[acao]
}
