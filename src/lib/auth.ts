import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { registrarAuditoria } from "@/lib/auditoria"
import type { TipoPerfil } from "@/generated/prisma/client"
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      nome: string
      perfil: TipoPerfil
      clinicaIds: string[]
    } & DefaultSession["user"]
  }
  interface User {
    nome: string
    perfil: TipoPerfil
    clinicaIds: string[]
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    nome: string
    perfil: TipoPerfil
    clinicaIds: string[]
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email as string },
          include: {
            perfilAcesso: true,
            clinicas: { select: { clinicaId: true } },
          },
        })

        if (!usuario || usuario.status !== "Ativo") return null

        const senhaValida = await bcrypt.compare(
          credentials.password as string,
          usuario.senhaHash
        )
        if (!senhaValida) return null

        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { ultimoAcesso: new Date() },
        })

        await registrarAuditoria(usuario.id.toString(), "login", `Perfil: ${usuario.perfilAcesso.tipo}`)

        return {
          id: usuario.id.toString(),
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfilAcesso.tipo,
          clinicaIds: usuario.clinicas.map((c) => c.clinicaId.toString()),
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!
        token.nome = user.nome
        token.perfil = user.perfil
        token.clinicaIds = user.clinicaIds
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id
      session.user.nome = token.nome
      session.user.perfil = token.perfil
      session.user.clinicaIds = token.clinicaIds
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
})
