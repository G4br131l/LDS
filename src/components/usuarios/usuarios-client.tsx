"use client"

import { useState, useTransition, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UsuarioForm } from "./usuario-form"
import { PermissoesMatrix } from "./permissoes-matrix"
import {
  alterarStatusUsuarioAction,
  redefinirSenhaAdminAction,
} from "@/app/(app)/usuarios/actions"
import { toast } from "sonner"
import { UserPlus, Settings, Search } from "lucide-react"
import type { TipoPerfil } from "@/generated/prisma/client"

type UsuarioRow = {
  id: string
  nome: string
  email: string
  cpf: string
  telefone: string | null
  perfilTipo: TipoPerfil
  perfilLabel: string
  clinicaIds: string[]
  clinicasNome: string
  status: "Ativo" | "Bloqueado" | "Inativo"
  ultimoAcesso: string | null
  exigir2fa: boolean
  restringirPorIp: boolean
}

type Clinica = { id: string; nome: string }

type PermissoesData = {
  perfilTipo: TipoPerfil
  permissoes: Array<{ modulo: string; ver: boolean; criar: boolean; editar: boolean; excluir: boolean }>
}

type AuditLog = {
  id: string
  acao: string
  detalhes: string | null
  ip: string | null
  dataHora: string
  usuarioNome: string
}

type Props = {
  usuarios: UsuarioRow[]
  clinicas: Clinica[]
  permissoesData: PermissoesData[]
  auditLogs: AuditLog[]
  canEdit: boolean
  canCreate: boolean
  canDelete: boolean
}

const PERFIL_CORES: Record<string, string> = {
  Proprietario: "bg-blue-100 text-blue-700",
  Gerente: "bg-purple-100 text-purple-700",
  Medico: "bg-green-100 text-green-700",
  Secretaria: "bg-slate-100 text-slate-600",
  Financeiro: "bg-yellow-100 text-yellow-700",
  Paciente: "bg-gray-100 text-gray-600",
}

const STATUS_CORES: Record<string, string> = {
  Ativo: "bg-green-100 text-green-700",
  Bloqueado: "bg-red-100 text-red-600",
  Inativo: "bg-gray-100 text-gray-500",
}

const PERFIL_LABELS: Record<string, string> = {
  Proprietario: "Proprietário",
  Gerente: "Gerente",
  Medico: "Médico",
  Secretaria: "Secretária",
  Financeiro: "Financeiro",
  Paciente: "Paciente",
}

export function UsuariosClient({
  usuarios,
  clinicas,
  permissoesData,
  auditLogs,
  canEdit,
  canCreate,
  canDelete,
}: Props) {
  const [busca, setBusca] = useState("")
  const [filtroPerfil, setFiltroPerfil] = useState("todos")
  const [selected, setSelected] = useState<UsuarioRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<UsuarioRow | undefined>()
  const [, startTransition] = useTransition()

  const filtrados = useMemo(() => {
    return usuarios.filter((u) => {
      const matchBusca =
        !busca ||
        u.nome.toLowerCase().includes(busca.toLowerCase()) ||
        u.email.toLowerCase().includes(busca.toLowerCase())
      const matchPerfil = filtroPerfil === "todos" || u.perfilTipo === filtroPerfil
      return matchBusca && matchPerfil
    })
  }, [usuarios, busca, filtroPerfil])

  const kpis = {
    total: usuarios.length,
    ativos: usuarios.filter((u) => u.status === "Ativo").length,
    bloqueados: usuarios.filter((u) => u.status === "Bloqueado").length,
    inativos: usuarios.filter((u) => u.status === "Inativo").length,
  }

  function abrirNovo() {
    setEditando(undefined)
    setShowForm(true)
  }

  function abrirEditar(u: UsuarioRow) {
    setEditando(u)
    setShowForm(true)
  }

  function handleAlterarStatus(u: UsuarioRow, status: "Ativo" | "Bloqueado" | "Inativo") {
    startTransition(async () => {
      await alterarStatusUsuarioAction(u.id, status)
      toast.success(`Usuário ${status === "Ativo" ? "desbloqueado" : status === "Bloqueado" ? "bloqueado" : "inativado"}`)
      setSelected(null)
    })
  }

  function handleRedefinirSenha(u: UsuarioRow) {
    startTransition(async () => {
      await redefinirSenhaAdminAction(u.id)
      toast.success("Senha temporária gerada (ver log do servidor)")
    })
  }

  const perfilFiltroOpcoes = [
    { value: "todos", label: "Todos", count: usuarios.length },
    ...["Proprietario", "Gerente", "Medico", "Secretaria", "Financeiro", "Paciente"].map((p) => ({
      value: p,
      label: PERFIL_LABELS[p],
      count: usuarios.filter((u) => u.perfilTipo === p).length,
    })),
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuários & Permissões</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {usuarios.length} usuários · {permissoesData.length} perfis de acesso
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Settings className="w-4 h-4" />
            Auditoria
          </Button>
          {canCreate && (
            <Button size="sm" className="gap-1.5" onClick={abrirNovo}>
              <UserPlus className="w-4 h-4" />
              Novo Usuário
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">Usuários</TabsTrigger>
          <TabsTrigger value="perfis">Perfis & Permissões</TabsTrigger>
          <TabsTrigger value="auditoria">Histórico de Acesso</TabsTrigger>
        </TabsList>

        {/* ── ABA LISTA ─────────────────────────────────────────────────── */}
        <TabsContent value="lista" className="space-y-4 mt-4">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total", valor: kpis.total, cor: "text-slate-800" },
              { label: "Ativos", valor: kpis.ativos, cor: "text-green-600" },
              { label: "Bloqueados", valor: kpis.bloqueados, cor: "text-red-600" },
              { label: "Inativos", valor: kpis.inativos, cor: "text-gray-500" },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-lg border border-slate-200 px-4 py-3">
                <p className={`text-2xl font-bold ${k.cor}`}>{k.valor}</p>
                <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Busca + filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {perfilFiltroOpcoes.map((op) => (
                <button
                  key={op.value}
                  onClick={() => setFiltroPerfil(op.value)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    filtroPerfil === op.value
                      ? "bg-slate-700 text-white border-slate-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {op.label} ({op.count})
                </button>
              ))}
            </div>
          </div>

          {/* Tabela */}
          <div className="flex gap-4">
            {/* Tabela */}
            <div className="flex-1 bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="text-left px-4 py-2.5 font-medium">Nome</th>
                    <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">E-mail</th>
                    <th className="text-left px-4 py-2.5 font-medium">Perfil</th>
                    <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Unidade</th>
                    <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Último acesso</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  ) : (
                    filtrados.map((u) => (
                      <tr
                        key={u.id}
                        className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${
                          selected?.id === u.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-800">{u.nome}</td>
                        <td className="px-4 py-2.5 text-slate-500 hidden md:table-cell">{u.email}</td>
                        <td className="px-4 py-2.5">
                          <Badge className={PERFIL_CORES[u.perfilTipo] ?? ""}>
                            {PERFIL_LABELS[u.perfilTipo]}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 hidden lg:table-cell text-xs">
                          {u.clinicasNome || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 hidden lg:table-cell text-xs">
                          {u.ultimoAcesso
                            ? new Date(u.ultimoAcesso).toLocaleString("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "Nunca"}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge className={STATUS_CORES[u.status] ?? ""}>{u.status}</Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => setSelected(selected?.id === u.id ? null : u)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </TabsContent>

        {/* ── ABA PERFIS ────────────────────────────────────────────────── */}
        <TabsContent value="perfis" className="mt-4">
          <PermissoesMatrix data={permissoesData} canEdit={canEdit} />
        </TabsContent>

        {/* ── ABA AUDITORIA ─────────────────────────────────────────────── */}
        <TabsContent value="auditoria" className="mt-4">
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Histórico de Acesso</h3>
              <Button variant="outline" size="sm">📥 Exportar log</Button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="text-left px-4 py-2.5 font-medium">Data/Hora</th>
                  <th className="text-left px-4 py-2.5 font-medium">Usuário</th>
                  <th className="text-left px-4 py-2.5 font-medium">Ação</th>
                  <th className="text-left px-4 py-2.5 font-medium">Detalhes</th>
                  <th className="text-left px-4 py-2.5 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      Nenhum registro de auditoria
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-500 text-xs">
                        {new Date(log.dataHora).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-700">{log.usuarioNome}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline">{log.acao}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{log.detalhes ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{log.ip ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Detalhe do usuário */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null) }}>
        <DialogContent showCloseButton className="sm:max-w-sm">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                    {selected.nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="truncate">{selected.nome}</DialogTitle>
                    <p className="text-xs text-slate-500 truncate">{selected.email}</p>
                    <Badge className={`mt-1 ${PERFIL_CORES[selected.perfilTipo] ?? ""}`}>
                      {PERFIL_LABELS[selected.perfilTipo]}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-2 text-xs">
                {[
                  ["Unidade(s)", selected.clinicasNome || "—"],
                  ["Status", selected.status],
                  ["Último acesso", selected.ultimoAcesso ? new Date(selected.ultimoAcesso).toLocaleString("pt-BR") : "Nunca"],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-1 py-1 border-b border-slate-50">
                    <span className="text-slate-500">{l}</span>
                    <span className="font-medium text-slate-700 text-right">{v}</span>
                  </div>
                ))}
              </div>

              {canEdit && (
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => { abrirEditar(selected); setSelected(null) }}
                    className="w-full text-left text-xs px-2 py-2 rounded hover:bg-slate-100 text-slate-700"
                  >
                    ✎ Editar dados
                  </button>
                  <button
                    onClick={() => handleRedefinirSenha(selected)}
                    className="w-full text-left text-xs px-2 py-2 rounded hover:bg-slate-100 text-slate-700"
                  >
                    🔑 Redefinir senha
                  </button>
                  {selected.status === "Ativo" && (
                    <button
                      onClick={() => handleAlterarStatus(selected, "Bloqueado")}
                      className="w-full text-left text-xs px-2 py-2 rounded hover:bg-red-50 text-red-600"
                    >
                      🚫 Bloquear acesso
                    </button>
                  )}
                  {selected.status === "Bloqueado" && (
                    <button
                      onClick={() => handleAlterarStatus(selected, "Ativo")}
                      className="w-full text-left text-xs px-2 py-2 rounded hover:bg-green-50 text-green-600"
                    >
                      ✓ Desbloquear
                    </button>
                  )}
                  {canDelete && selected.status !== "Inativo" && (
                    <button
                      onClick={() => handleAlterarStatus(selected, "Inativo")}
                      className="w-full text-left text-xs px-2 py-2 rounded hover:bg-slate-100 text-slate-500"
                    >
                      🗑 Inativar usuário
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Cadastro/edição de usuário */}
      {showForm && (
        <UsuarioForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditando(undefined) }}
          clinicas={clinicas}
          usuario={editando}
        />
      )}
    </div>
  )
}
