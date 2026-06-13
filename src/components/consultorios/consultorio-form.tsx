"use client"

import { useActionState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { criarConsultorioAction, editarConsultorioAction } from "@/app/(app)/consultorios/actions"

const ESPECIALIDADES = [
  "Cardiologia","Clínica Geral","Ortopedia","Dermatologia","Pediatria",
  "Neurologia","Cirurgia","Psicologia","Oftalmologia","Ginecologia",
  "Urologia","Fisioterapia","Nutrição","Odontologia","Outro",
]

const RECURSOS = [
  "Maca","Computador","Impressora","Ar-condicionado","Lavatório","Negatoscópio",
]

type ConsultorioData = {
  id: string
  clinicaId: string
  identificacao: string
  andar: string | null
  especialidadePrincipal: string | null
  capacidade: string
  horaAbertura: string | null
  horaFechamento: string | null
  valorPorHora: number | null
  status: string
  observacoes: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  clinicaId: string
  consultorio?: ConsultorioData
}

export function ConsultorioForm({ open, onClose, clinicaId, consultorio }: Props) {
  const isEditing = !!consultorio
  const action = isEditing ? editarConsultorioAction : criarConsultorioAction
  const [state, formAction, pending] = useActionState(action, undefined)

  useEffect(() => {
    if (state?.sucesso) onClose()
  }, [state, onClose])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar Sala ${consultorio.identificacao}` : "Novo Consultório"}
          </DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {isEditing && <input type="hidden" name="id" value={consultorio.id} />}
          <input type="hidden" name="clinicaId" value={clinicaId} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="identificacao">Identificação (nº/nome)</Label>
              <Input
                id="identificacao"
                name="identificacao"
                placeholder="Ex: 01, A, Sala Verde"
                defaultValue={consultorio?.identificacao}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="andar">Andar</Label>
              <Input
                id="andar"
                name="andar"
                placeholder="Ex: Térreo, 1º andar"
                defaultValue={consultorio?.andar ?? ""}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="especialidadePrincipal">Especialidade principal</Label>
            <select
              id="especialidadePrincipal"
              name="especialidadePrincipal"
              defaultValue={consultorio?.especialidadePrincipal ?? ""}
              className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">Selecionar...</option>
              {ESPECIALIDADES.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Capacidade</Label>
              <div className="flex gap-4 pt-1">
                {["Individual", "Dupla"].map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="capacidade"
                      value={c}
                      defaultChecked={consultorio ? consultorio.capacidade === c : c === "Individual"}
                      className="accent-slate-700"
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="valorPorHora">Valor por hora (R$)</Label>
              <Input
                id="valorPorHora"
                name="valorPorHora"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 120.00"
                defaultValue={consultorio?.valorPorHora ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="horaAbertura">Abertura</Label>
              <Input
                id="horaAbertura"
                name="horaAbertura"
                type="time"
                defaultValue={consultorio?.horaAbertura ?? "07:00"}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="horaFechamento">Fechamento</Label>
              <Input
                id="horaFechamento"
                name="horaFechamento"
                type="time"
                defaultValue={consultorio?.horaFechamento ?? "21:00"}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <div className="flex gap-4">
              {["Ativo", "Manutencao", "Inativo"].map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    defaultChecked={consultorio ? consultorio.status === s : s === "Ativo"}
                    className="accent-slate-700"
                  />
                  {s === "Manutencao" ? "Manutenção" : s}
                </label>
              ))}
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Recursos disponíveis
            </legend>
            <div className="flex flex-wrap gap-2">
              {RECURSOS.map((r) => (
                <label key={r} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" name="recursos" value={r} className="accent-slate-700" />
                  {r}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1">
            <Label htmlFor="observacoes">Observações</Label>
            <textarea
              id="observacoes"
              name="observacoes"
              rows={2}
              defaultValue={consultorio?.observacoes ?? ""}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            />
          </div>

          {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar Consultório"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
