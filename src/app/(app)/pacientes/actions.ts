"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { can } from "@/lib/permissions"
import { registrarAuditoria } from "@/lib/auditoria"
import type { Sexo, StatusPaciente } from "@/generated/prisma/client"

const pacienteSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  cpf: z.string().min(11, "CPF inválido"),
  rg: z.string().optional(),
  dataNascimento: z.string().min(1, "Data de nascimento obrigatória"),
  sexo: z.enum(["Masculino", "Feminino", "Outro"]),
  telefone: z.string().min(8, "Telefone obrigatório"),
  telefoneAlternativo: z.string().optional(),
  email: z.string().optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  alergias: z.string().optional(),
  observacoes: z.string().optional(),
  clinicaReferenciaId: z.string().optional(),
  medicoReferenciaId: z.string().optional(),
  status: z.enum(["Ativo", "Inativo"]).default("Ativo"),
})

export type PacienteActionState = { erro?: string; sucesso?: boolean; id?: string } | undefined

function gerarCodigo(id: bigint): string {
  return String(id).padStart(5, "0")
}

export async function criarPacienteAction(
  state: PacienteActionState,
  formData: FormData
): Promise<PacienteActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Pacientes", "criar"))) return { erro: "Sem permissão" }

  const raw = Object.fromEntries(formData.entries())
  const parsed = pacienteSchema.safeParse(raw)
  if (!parsed.success) return { erro: parsed.error.issues[0].message }

  const d = parsed.data
  try {
    const paciente = await prisma.paciente.create({
      data: {
        nome: d.nome,
        cpf: d.cpf,
        rg: d.rg || null,
        dataNascimento: new Date(`${d.dataNascimento}T12:00:00Z`),
        sexo: d.sexo as Sexo,
        telefone: d.telefone,
        telefoneAlternativo: d.telefoneAlternativo || null,
        email: d.email || null,
        cep: d.cep || null,
        endereco: d.endereco || null,
        cidade: d.cidade || null,
        estado: d.estado || null,
        alergias: d.alergias || null,
        observacoes: d.observacoes || null,
        clinicaReferenciaId: d.clinicaReferenciaId ? BigInt(d.clinicaReferenciaId) : null,
        medicoReferenciaId: d.medicoReferenciaId ? BigInt(d.medicoReferenciaId) : null,
        status: d.status as StatusPaciente,
        codigo: "TMP",
      },
    })
    // Atualiza o código com o ID gerado
    const codigo = gerarCodigo(paciente.id)
    await prisma.paciente.update({ where: { id: paciente.id }, data: { codigo } })
    await registrarAuditoria(user.id, "paciente_criado", `Código: ${codigo}, Nome: ${d.nome}`)
    revalidatePath("/pacientes")
    return { sucesso: true, id: paciente.id.toString() }
  } catch {
    return { erro: "Erro ao cadastrar paciente. CPF pode já estar em uso." }
  }
}

export async function editarPacienteAction(
  state: PacienteActionState,
  formData: FormData
): Promise<PacienteActionState> {
  const user = await verifySession()
  if (!(await can(user.perfil, "Pacientes", "editar"))) return { erro: "Sem permissão" }

  const id = formData.get("id") as string
  if (!id) return { erro: "ID não informado" }

  const raw = Object.fromEntries(formData.entries())
  const parsed = pacienteSchema.safeParse(raw)
  if (!parsed.success) return { erro: parsed.error.issues[0].message }

  const d = parsed.data
  try {
    await prisma.paciente.update({
      where: { id: BigInt(id) },
      data: {
        nome: d.nome,
        cpf: d.cpf,
        rg: d.rg || null,
        dataNascimento: new Date(`${d.dataNascimento}T12:00:00Z`),
        sexo: d.sexo as Sexo,
        telefone: d.telefone,
        telefoneAlternativo: d.telefoneAlternativo || null,
        email: d.email || null,
        cep: d.cep || null,
        endereco: d.endereco || null,
        cidade: d.cidade || null,
        estado: d.estado || null,
        alergias: d.alergias || null,
        observacoes: d.observacoes || null,
        clinicaReferenciaId: d.clinicaReferenciaId ? BigInt(d.clinicaReferenciaId) : null,
        medicoReferenciaId: d.medicoReferenciaId ? BigInt(d.medicoReferenciaId) : null,
        status: d.status as StatusPaciente,
      },
    })
    await registrarAuditoria(user.id, "paciente_editado", `ID: ${id}`)
    revalidatePath("/pacientes")
    revalidatePath(`/prontuario`)
    return { sucesso: true }
  } catch {
    return { erro: "Erro ao salvar. CPF pode já estar em uso." }
  }
}
