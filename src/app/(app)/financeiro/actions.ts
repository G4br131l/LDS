"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import type { FormaPagamento, StatusPagamento } from "@/generated/prisma/client"

const pagamentoSchema = z.object({
  profissionalId: z.string().min(1, "Selecione o profissional"),
  clinicaId: z.string().min(1, "Selecione a clínica"),
  dataInicio: z.string().min(1),
  dataFim: z.string().min(1),
  valorDevido: z.string().min(1),
  valorRecebido: z.string().min(1),
  formaPagamento: z.string().optional(),
  dataRecebimento: z.string().optional(),
  status: z.enum(["Pendente", "Recebido", "Parcial"]).optional(),
})

export type FinanceiroActionState = { erro?: string; sucesso?: boolean } | undefined

export async function registrarPagamentoAction(
  state: FinanceiroActionState,
  formData: FormData
): Promise<FinanceiroActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Financeiro", "criar"))) return { erro: "Sem permissão" }

  const raw = Object.fromEntries(formData.entries())
  const parsed = pagamentoSchema.safeParse(raw)
  if (!parsed.success) return { erro: parsed.error.issues[0].message }

  const d = parsed.data
  const valorDevido = parseFloat(d.valorDevido.replace(",", "."))
  const valorRecebido = parseFloat(d.valorRecebido.replace(",", "."))
  const status: StatusPagamento =
    valorRecebido >= valorDevido
      ? "Recebido"
      : valorRecebido > 0
      ? "Parcial"
      : "Pendente"

  try {
    await prisma.pagamento.upsert({
      where: {
        profissionalId_dataInicio_dataFim: {
          profissionalId: BigInt(d.profissionalId),
          dataInicio: new Date(`${d.dataInicio}T00:00:00Z`),
          dataFim: new Date(`${d.dataFim}T00:00:00Z`),
        },
      },
      update: {
        valorDevido,
        valorRecebido,
        formaPagamento: (d.formaPagamento as FormaPagamento) || null,
        dataRecebimento: d.dataRecebimento
          ? new Date(`${d.dataRecebimento}T00:00:00Z`)
          : null,
        status,
      },
      create: {
        profissionalId: BigInt(d.profissionalId),
        clinicaId: BigInt(d.clinicaId),
        dataInicio: new Date(`${d.dataInicio}T00:00:00Z`),
        dataFim: new Date(`${d.dataFim}T00:00:00Z`),
        valorDevido,
        valorRecebido,
        formaPagamento: (d.formaPagamento as FormaPagamento) || null,
        dataRecebimento: d.dataRecebimento
          ? new Date(`${d.dataRecebimento}T00:00:00Z`)
          : null,
        status,
      },
    })
    revalidatePath("/financeiro")
    return { sucesso: true }
  } catch {
    return { erro: "Erro ao registrar pagamento" }
  }
}
