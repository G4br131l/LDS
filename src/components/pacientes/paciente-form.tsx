"use client"

import { useActionState, useEffect } from "react"
import { criarPacienteAction, editarPacienteAction, type PacienteActionState } from "@/app/(app)/pacientes/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

type Profissional = { id: string; nome: string }

type Paciente = {
  id: string
  nome: string
  cpf: string
  rg?: string | null
  dataNascimento: string
  sexo: string
  telefone: string
  telefoneAlternativo?: string | null
  email?: string | null
  cep?: string | null
  endereco?: string | null
  cidade?: string | null
  estado?: string | null
  alergias?: string | null
  observacoes?: string | null
  medicoReferenciaId?: string | null
  status: string
}

type Props = {
  paciente?: Paciente
  profissionais: Profissional[]
  onSuccess?: (id: string) => void
  onCancel?: () => void
}

export function PacienteForm({ paciente, profissionais, onSuccess, onCancel }: Props) {
  const isEdit = !!paciente
  const action = isEdit ? editarPacienteAction : criarPacienteAction

  const [state, formAction, pending] = useActionState<PacienteActionState, FormData>(action, undefined)

  useEffect(() => {
    if (state?.sucesso) {
      toast.success(isEdit ? "Paciente atualizado" : "Paciente cadastrado")
      onSuccess?.(state.id ?? paciente?.id ?? "")
    }
    if (state?.erro) toast.error(state.erro)
  }, [state])

  const nascFormatted = paciente?.dataNascimento
    ? new Date(paciente.dataNascimento).toISOString().slice(0, 10)
    : ""

  return (
    <form action={formAction} className="space-y-6">
      {isEdit && <input type="hidden" name="id" value={paciente.id} />}

      {/* Dados Pessoais */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-1 border-b">Dados Pessoais</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="nome">Nome completo *</Label>
            <Input id="nome" name="nome" defaultValue={paciente?.nome} required />
          </div>
          <div>
            <Label htmlFor="cpf">CPF *</Label>
            <Input id="cpf" name="cpf" placeholder="000.000.000-00" defaultValue={paciente?.cpf} required />
          </div>
          <div>
            <Label htmlFor="rg">RG</Label>
            <Input id="rg" name="rg" defaultValue={paciente?.rg ?? ""} />
          </div>
          <div>
            <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
            <Input id="dataNascimento" name="dataNascimento" type="date" defaultValue={nascFormatted} required />
          </div>
          <div>
            <Label htmlFor="sexo">Sexo *</Label>
            <select
              id="sexo"
              name="sexo"
              defaultValue={paciente?.sexo ?? "Masculino"}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              required
            >
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={paciente?.status ?? "Ativo"}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
          <div>
            <Label htmlFor="medicoReferenciaId">Médico de Referência</Label>
            <select
              id="medicoReferenciaId"
              name="medicoReferenciaId"
              defaultValue={paciente?.medicoReferenciaId ?? ""}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Nenhum</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-1 border-b">Contato</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="telefone">Telefone *</Label>
            <Input id="telefone" name="telefone" placeholder="(00) 00000-0000" defaultValue={paciente?.telefone} required />
          </div>
          <div>
            <Label htmlFor="telefoneAlternativo">Telefone Alternativo</Label>
            <Input id="telefoneAlternativo" name="telefoneAlternativo" defaultValue={paciente?.telefoneAlternativo ?? ""} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" defaultValue={paciente?.email ?? ""} />
          </div>
        </div>
      </section>

      {/* Endereço */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-1 border-b">Endereço</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="cep">CEP</Label>
            <Input id="cep" name="cep" placeholder="00000-000" defaultValue={paciente?.cep ?? ""} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input id="endereco" name="endereco" defaultValue={paciente?.endereco ?? ""} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" name="cidade" defaultValue={paciente?.cidade ?? ""} />
          </div>
          <div>
            <Label htmlFor="estado">UF</Label>
            <Input id="estado" name="estado" maxLength={2} placeholder="SP" defaultValue={paciente?.estado ?? ""} />
          </div>
        </div>
      </section>

      {/* Informações Clínicas */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-1 border-b">Informações Clínicas</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="alergias">Alergias conhecidas</Label>
            <textarea
              id="alergias"
              name="alergias"
              rows={2}
              defaultValue={paciente?.alergias ?? ""}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none"
              placeholder="Descreva alergias a medicamentos, alimentos, etc."
            />
          </div>
          <div>
            <Label htmlFor="observacoes">Observações gerais</Label>
            <textarea
              id="observacoes"
              name="observacoes"
              rows={3}
              defaultValue={paciente?.observacoes ?? ""}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : isEdit ? "Salvar Alterações" : "Cadastrar Paciente"}
        </Button>
      </div>
    </form>
  )
}
