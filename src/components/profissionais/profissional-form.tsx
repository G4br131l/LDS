"use client"

import { useActionState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { criarProfissionalAction, editarProfissionalAction } from "@/app/(app)/profissionais/actions"

const CONSELHOS = ["CRM","CRO","COREN","CRP","CREFITO","CRN","CRF","CRFa","CREF","CRBM","Outro"]
const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]

type Especialidade = { id: string; nome: string }

type ProfissionalData = {
  id: string
  nome: string
  conselho: string
  registroConselho: string
  ufConselho: string
  telefone: string | null
  email: string
  modeloCobranca: string
  valorCobranca: number
  status: string
  especialidadeIds: string[]
}

type Props = {
  especialidades: Especialidade[]
  profissional?: ProfissionalData
  onSucesso: () => void
  onCancelar: () => void
}

export function ProfissionalForm({ especialidades, profissional, onSucesso, onCancelar }: Props) {
  const isEditing = !!profissional
  const action = isEditing ? editarProfissionalAction : criarProfissionalAction
  const [state, formAction, pending] = useActionState(action, undefined)

  useEffect(() => {
    if (state?.sucesso) onSucesso()
  }, [state, onSucesso])

  return (
    <form action={formAction} className="space-y-4">
      {isEditing && <input type="hidden" name="id" value={profissional.id} />}

      {/* Registro conselho */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Registro no Conselho de Classe
        </legend>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label htmlFor="conselho">Conselho</Label>
            <select
              id="conselho"
              name="conselho"
              defaultValue={profissional?.conselho ?? "CRM"}
              className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              {CONSELHOS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="registroConselho">Nº Registro</Label>
            <Input id="registroConselho" name="registroConselho" defaultValue={profissional?.registroConselho} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ufConselho">UF</Label>
            <select
              id="ufConselho"
              name="ufConselho"
              defaultValue={profissional?.ufConselho ?? "SP"}
              className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>
      </fieldset>

      {/* Dados pessoais */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="nome">Nome completo</Label>
          <Input id="nome" name="nome" defaultValue={profissional?.nome} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={profissional?.email} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" name="telefone" defaultValue={profissional?.telefone ?? ""} />
        </div>
      </div>

      {/* Especialidades */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Especialidades
        </legend>
        <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border rounded-md p-2">
          {especialidades.map((e) => (
            <label key={e.id} className="flex items-center gap-2 cursor-pointer text-sm py-0.5">
              <input
                type="checkbox"
                name="especialidadeIds"
                value={e.id}
                defaultChecked={profissional?.especialidadeIds.includes(e.id)}
                className="accent-slate-700"
              />
              {e.nome}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Modelo de cobrança */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Modelo de Cobrança
        </legend>
        <div className="flex gap-4">
          {["Percentual", "Aluguel"].map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="modeloCobranca"
                value={m}
                defaultChecked={profissional ? profissional.modeloCobranca === m : m === "Percentual"}
                className="accent-slate-700"
              />
              {m === "Percentual" ? "Percentual (% por consulta)" : "Aluguel (R$/semana)"}
            </label>
          ))}
        </div>
        <div className="space-y-1">
          <Label htmlFor="valorCobranca">
            Valor (% ou R$)
          </Label>
          <Input
            id="valorCobranca"
            name="valorCobranca"
            type="number"
            step="0.01"
            min="0"
            placeholder="Ex: 15 para 15% ou 800 para R$ 800"
            defaultValue={profissional?.valorCobranca}
            required
          />
        </div>
      </fieldset>

      {/* Status */}
      <div className="space-y-1">
        <Label>Status</Label>
        <div className="flex gap-4">
          {["Ativo", "Inativo"].map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="status"
                value={s}
                defaultChecked={profissional ? profissional.status === s : s === "Ativo"}
                className="accent-slate-700"
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}

      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar"}
        </Button>
      </div>
    </form>
  )
}
