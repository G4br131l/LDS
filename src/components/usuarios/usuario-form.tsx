"use client"

import { useActionState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { criarUsuarioAction, editarUsuarioAction } from "@/app/(app)/usuarios/actions"

const PERFIS = [
  { value: "Proprietario", label: "Proprietário" },
  { value: "Gerente", label: "Gerente de Unidade" },
  { value: "Medico", label: "Médico" },
  { value: "Secretaria", label: "Secretária" },
  { value: "Financeiro", label: "Financeiro" },
  { value: "Paciente", label: "Paciente" },
]

type Clinica = { id: string; nome: string }
type UsuarioData = {
  id: string
  nome: string
  email: string
  cpf: string
  telefone: string | null
  perfilTipo: string
  clinicaIds: string[]
  exigir2fa: boolean
  restringirPorIp: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  clinicas: Clinica[]
  usuario?: UsuarioData
}

export function UsuarioForm({ open, onClose, clinicas, usuario }: Props) {
  const isEditing = !!usuario

  const action = isEditing ? editarUsuarioAction : criarUsuarioAction

  const [state, formAction, pending] = useActionState(action, undefined)

  useEffect(() => {
    if (state?.sucesso) onClose()
  }, [state, onClose])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar: ${usuario.nome}` : "Cadastrar Novo Usuário"}
          </DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-5">
          {isEditing && <input type="hidden" name="id" value={usuario.id} />}
          {/* Dados pessoais */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-700 mb-2">
              Dados do usuário
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" name="nome" defaultValue={usuario?.nome} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={usuario?.email} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" name="cpf" placeholder="000.000.000-00" defaultValue={usuario?.cpf} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" defaultValue={usuario?.telefone ?? ""} />
              </div>
              {!isEditing && (
                <div className="space-y-1">
                  <Label htmlFor="senha">Senha temporária</Label>
                  <Input id="senha" name="senha" type="password" placeholder="Mínimo 6 caracteres" required />
                </div>
              )}
            </div>
          </fieldset>

          {/* Perfil */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-700 mb-2">
              Perfil de acesso
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {PERFIS.map((p) => (
                <label
                  key={p.value}
                  className="flex items-center gap-2 border rounded-md p-2.5 cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="radio"
                    name="perfilTipo"
                    value={p.value}
                    defaultChecked={usuario ? usuario.perfilTipo === p.value : p.value === "Secretaria"}
                    className="accent-slate-700"
                    required
                  />
                  <span className="text-sm">{p.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Unidades */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-700 mb-2">
              Vínculo com unidades
            </legend>
            <div className="space-y-2">
              {clinicas.map((c) => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="clinicaIds"
                    value={c.id}
                    defaultChecked={usuario?.clinicaIds.includes(c.id)}
                    className="accent-slate-700"
                  />
                  <span className="text-sm">{c.nome}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Segurança */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-700 mb-2">
              Credenciais e segurança
            </legend>
            {!isEditing && (
              <p className="text-xs text-slate-500 bg-blue-50 rounded p-2">
                💡 Uma senha temporária será gerada e enviada por e-mail.
              </p>
            )}
            <div className="flex items-center justify-between py-1">
              <span className="text-sm">Exigir 2FA no login</span>
              <Switch name="exigir2fa" defaultChecked={usuario?.exigir2fa} />
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm">Restringir por IP</span>
              <Switch name="restringirPorIp" defaultChecked={usuario?.restringirPorIp} />
            </div>
          </fieldset>

          {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Salvando..."
                : isEditing
                ? "Salvar alterações"
                : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
