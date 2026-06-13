"use client"

import { useState, useTransition } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { atualizarPermissoesAction, type PermissoesMatrix } from "@/app/(app)/usuarios/actions"
import { toast } from "sonner"
import type { TipoPerfil } from "@/generated/prisma/client"

const PERFIS: { tipo: TipoPerfil; label: string; cor: string }[] = [
  { tipo: "Proprietario", label: "Proprietário", cor: "bg-blue-100 text-blue-700" },
  { tipo: "Gerente", label: "Gerente de Unidade", cor: "bg-purple-100 text-purple-700" },
  { tipo: "Medico", label: "Médico", cor: "bg-green-100 text-green-700" },
  { tipo: "Secretaria", label: "Secretária", cor: "bg-slate-100 text-slate-600" },
  { tipo: "Financeiro", label: "Financeiro", cor: "bg-yellow-100 text-yellow-700" },
  { tipo: "Paciente", label: "Paciente", cor: "bg-gray-100 text-gray-600" },
]

const MODULOS = [
  { id: "Dashboard", label: "Dashboard" },
  { id: "Agenda", label: "Agenda" },
  { id: "Pacientes", label: "Pacientes" },
  { id: "Prontuario", label: "Prontuário" },
  { id: "Profissionais", label: "Profissionais" },
  { id: "Clinicas", label: "Rede de Clínicas" },
  { id: "Consultorios", label: "Consultórios" },
  { id: "Financeiro", label: "Financeiro" },
  { id: "Relatorios", label: "Relatórios" },
  { id: "Usuarios", label: "Usuários & Permissões" },
] as const

const ACOES: { key: "ver" | "criar" | "editar" | "excluir"; label: string }[] = [
  { key: "ver", label: "Ver" },
  { key: "criar", label: "Criar" },
  { key: "editar", label: "Editar" },
  { key: "excluir", label: "Excluir" },
]

type PermissoesData = {
  perfilTipo: TipoPerfil
  permissoes: Array<{
    modulo: string
    ver: boolean
    criar: boolean
    editar: boolean
    excluir: boolean
  }>
}

type Props = {
  data: PermissoesData[]
  canEdit: boolean
}

export function PermissoesMatrix({ data, canEdit }: Props) {
  const [perfilSelecionado, setPerfilSelecionado] = useState<TipoPerfil>("Proprietario")
  const [, startTransition] = useTransition()

  const perfilData = data.find((d) => d.perfilTipo === perfilSelecionado)

  const getPermissao = (modulo: string) =>
    perfilData?.permissoes.find((p) => p.modulo === modulo) ?? {
      modulo,
      ver: false,
      criar: false,
      editar: false,
      excluir: false,
    }

  const [matriz, setMatriz] = useState<PermissoesMatrix>(() => {
    const m: PermissoesMatrix = {}
    MODULOS.forEach(({ id }) => {
      const p = perfilData?.permissoes.find((p) => p.modulo === id)
      m[id] = { ver: p?.ver ?? false, criar: p?.criar ?? false, editar: p?.editar ?? false, excluir: p?.excluir ?? false }
    })
    return m
  })

  // Recarrega matriz quando troca de perfil
  function handlePerfilChange(tipo: TipoPerfil) {
    setPerfilSelecionado(tipo)
    const pd = data.find((d) => d.perfilTipo === tipo)
    const m: PermissoesMatrix = {}
    MODULOS.forEach(({ id }) => {
      const p = pd?.permissoes.find((p) => p.modulo === id)
      m[id] = { ver: p?.ver ?? false, criar: p?.criar ?? false, editar: p?.editar ?? false, excluir: p?.excluir ?? false }
    })
    setMatriz(m)
  }

  function toggle(modulo: string, acao: "ver" | "criar" | "editar" | "excluir") {
    if (!canEdit) return
    setMatriz((prev) => ({
      ...prev,
      [modulo]: { ...prev[modulo], [acao]: !prev[modulo][acao] },
    }))
  }

  function handleSalvar() {
    startTransition(async () => {
      await atualizarPermissoesAction(perfilSelecionado, matriz)
      toast.success("Permissões atualizadas")
    })
  }

  const perfilInfo = PERFIS.find((p) => p.tipo === perfilSelecionado)!

  return (
    <div className="space-y-4">
      {/* Seletor de perfil */}
      <div className="flex flex-wrap gap-2">
        {PERFIS.map((p) => (
          <button
            key={p.tipo}
            onClick={() => handlePerfilChange(p.tipo)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              perfilSelecionado === p.tipo
                ? p.cor + " border-transparent"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Cabeçalho do perfil selecionado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={perfilInfo.cor}>{perfilInfo.label}</Badge>
          <span className="text-sm text-slate-500">— matriz de permissões</span>
        </div>
        {canEdit && (
          <Button size="sm" onClick={handleSalvar}>
            Salvar alterações
          </Button>
        )}
      </div>

      {/* Matriz */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-2.5 font-medium text-slate-600 w-44">Módulo</th>
              {ACOES.map((a) => (
                <th key={a.key} className="px-3 py-2.5 font-medium text-slate-600 text-center w-20">
                  {a.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULOS.map(({ id, label }, i) => {
              const p = matriz[id] ?? getPermissao(id)
              return (
                <tr
                  key={id}
                  className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-700">{label}</td>
                  {ACOES.map((a) => (
                    <td key={a.key} className="px-3 py-2.5 text-center">
                      <Checkbox
                        checked={p[a.key]}
                        onCheckedChange={() => toggle(id, a.key)}
                        disabled={!canEdit}
                      />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!canEdit && (
        <p className="text-xs text-slate-400">
          Somente o Proprietário pode editar as permissões.
        </p>
      )}
    </div>
  )
}
