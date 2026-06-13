import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export async function registrarAuditoria(
  usuarioId: string,
  acao: string,
  detalhes?: string
) {
  try {
    const hdrs = await headers()
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      hdrs.get("x-real-ip") ??
      null

    await prisma.logAuditoria.create({
      data: {
        usuarioId: BigInt(usuarioId),
        acao: acao.slice(0, 50),
        detalhes: detalhes ?? null,
        ip,
      },
    })
  } catch {
    // Auditoria nunca deve quebrar a operação principal
  }
}
