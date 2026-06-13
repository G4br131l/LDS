"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import type { StatusClinica, DiaSemana } from "@/generated/prisma/client"

const clinicaSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  cnpj: z.string().min(14, "CNPJ inválido"),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  responsavelTecnicoId: z.string().optional(),
  status: z.enum(["Ativa", "Em_implantacao", "Inativa"]).default("Ativa"),
})

const diasSemana: DiaSemana[] = [
  "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo",
]

export type ClinicaActionState = { erro?: string; sucesso?: boolean; id?: string } | undefined

// Extrai horários de funcionamento do formData: hor_Segunda_abertura, hor_Segunda_fechamento, ...
function extrairHorarios(formData: FormData) {
  return diasSemana.flatMap((dia) => {
    const abertura = (formData.get(`hor_${dia}_abertura`) as string)?.trim()
    const fechamento = (formData.get(`hor_${dia}_fechamento`) as string)?.trim()
    if (!abertura || !fechamento || abertura === "—" || fechamento === "—") return []
    return [{ dia, abertura, fechamento }]
  })
}

function toTime(hhmm: string): Date {
  return new Date(`1970-01-01T${hhmm}:00Z`)
}

export async function criarClinicaAction(
  state: ClinicaActionState,
  formData: FormData
): Promise<ClinicaActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Clinicas", "criar"))) return { erro: "Sem permissão" }

  const raw = Object.fromEntries(formData.entries())
  const parsed = clinicaSchema.safeParse(raw)
  if (!parsed.success) return { erro: parsed.error.issues[0].message }

  const d = parsed.data
  const horarios = extrairHorarios(formData)

  try {
    const clinica = await prisma.clinica.create({
      data: {
        nome: d.nome,
        cnpj: d.cnpj,
        telefone: d.telefone || null,
        endereco: d.endereco || null,
        cidade: d.cidade || null,
        estado: d.estado || null,
        cep: d.cep || null,
        responsavelTecnicoId: d.responsavelTecnicoId ? BigInt(d.responsavelTecnicoId) : null,
        status: d.status as StatusClinica,
        horariosFuncionamento: {
          create: horarios.map((h) => ({
            diaSemana: h.dia as DiaSemana,
            abertura: toTime(h.abertura),
            fechamento: toTime(h.fechamento),
          })),
        },
      },
    })
    revalidatePath("/clinicas")
    return { sucesso: true, id: clinica.id.toString() }
  } catch {
    return { erro: "Erro ao cadastrar. CNPJ pode já estar em uso." }
  }
}

export async function editarClinicaAction(
  state: ClinicaActionState,
  formData: FormData
): Promise<ClinicaActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Clinicas", "editar"))) return { erro: "Sem permissão" }

  const id = formData.get("id") as string
  if (!id) return { erro: "ID não informado" }

  const raw = Object.fromEntries(formData.entries())
  const parsed = clinicaSchema.safeParse(raw)
  if (!parsed.success) return { erro: parsed.error.issues[0].message }

  const d = parsed.data
  const horarios = extrairHorarios(formData)

  try {
    await prisma.$transaction([
      // Recria horários
      prisma.horarioFuncionamento.deleteMany({ where: { clinicaId: BigInt(id) } }),
      prisma.clinica.update({
        where: { id: BigInt(id) },
        data: {
          nome: d.nome,
          cnpj: d.cnpj,
          telefone: d.telefone || null,
          endereco: d.endereco || null,
          cidade: d.cidade || null,
          estado: d.estado || null,
          cep: d.cep || null,
          responsavelTecnicoId: d.responsavelTecnicoId ? BigInt(d.responsavelTecnicoId) : null,
          status: d.status as StatusClinica,
          horariosFuncionamento: {
            create: horarios.map((h) => ({
              diaSemana: h.dia as DiaSemana,
              abertura: toTime(h.abertura),
              fechamento: toTime(h.fechamento),
            })),
          },
        },
      }),
    ])
    revalidatePath("/clinicas")
    return { sucesso: true }
  } catch {
    return { erro: "Erro ao salvar. CNPJ pode já estar em uso." }
  }
}
