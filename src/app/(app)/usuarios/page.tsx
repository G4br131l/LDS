import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { serialize } from "@/lib/serialize"
import { UsuariosClient } from "@/components/usuarios/usuarios-client"
import { redirect } from "next/navigation"
import type { TipoPerfil } from "@/generated/prisma/client"

export default async function UsuariosPage() {
  const user = await verifySession()

  if (!(await can(user.perfil, "Usuarios", "ver"))) redirect("/dashboard")

  const [usuarios, clinicas, perfis, auditLogs] = await Promise.all([
    prisma.usuario.findMany({
      include: {
        perfilAcesso: true,
        clinicas: { include: { clinica: { select: { id: true, nome: true } } } },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.clinica.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.perfilAcesso.findMany({ include: { permissoes: true } }),
    prisma.logAuditoria.findMany({
      orderBy: { dataHora: "desc" },
      take: 100,
      include: { usuario: { select: { nome: true } } },
    }),
  ])

  const usuariosSerializados = serialize(
    usuarios.map((u) => ({
      id: u.id.toString(),
      nome: u.nome,
      email: u.email,
      cpf: u.cpf,
      telefone: u.telefone,
      perfilTipo: u.perfilAcesso.tipo as TipoPerfil,
      perfilLabel: u.perfilAcesso.tipo,
      clinicaIds: u.clinicas.map((uc) => uc.clinicaId.toString()),
      clinicasNome: u.clinicas.map((uc) => uc.clinica.nome).join(", "),
      status: u.status as "Ativo" | "Bloqueado" | "Inativo",
      ultimoAcesso: u.ultimoAcesso?.toISOString() ?? null,
      exigir2fa: u.exigir2fa,
      restringirPorIp: u.restringirPorIp,
    }))
  )

  const clinicasSerializadas = serialize(
    clinicas.map((c) => ({ id: c.id.toString(), nome: c.nome }))
  )

  const permissoesData = serialize(
    perfis.map((p) => ({
      perfilTipo: p.tipo as TipoPerfil,
      permissoes: p.permissoes.map((pm) => ({
        modulo: pm.modulo,
        ver: pm.ver,
        criar: pm.criar,
        editar: pm.editar,
        excluir: pm.excluir,
      })),
    }))
  )

  const auditLogsSerializados = serialize(
    auditLogs.map((l) => ({
      id: l.id.toString(),
      acao: l.acao,
      detalhes: l.detalhes,
      ip: l.ip,
      dataHora: l.dataHora.toISOString(),
      usuarioNome: l.usuario.nome,
    }))
  )

  const canEdit = await can(user.perfil, "Usuarios", "editar")
  const canCreate = await can(user.perfil, "Usuarios", "criar")
  const canDelete = await can(user.perfil, "Usuarios", "excluir")

  return (
    <UsuariosClient
      usuarios={usuariosSerializados}
      clinicas={clinicasSerializadas}
      permissoesData={permissoesData}
      auditLogs={auditLogsSerializados}
      canEdit={canEdit}
      canCreate={canCreate}
      canDelete={canDelete}
    />
  )
}
