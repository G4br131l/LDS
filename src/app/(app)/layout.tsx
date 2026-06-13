import { verifySession } from "@/lib/dal"
import { getPermissoes } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/app-shell"
import { ClinicSwitcher } from "@/components/clinic-switcher"
import { getClinicaIdAtual } from "@/app/(app)/actions"
import { Toaster } from "@/components/ui/sonner"
import type { Modulo } from "@/generated/prisma/client"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await verifySession()
  const permissoes = await getPermissoes(user.perfil)
  const modulosVisiveis = permissoes.filter((p) => p.ver).map((p) => p.modulo) as Modulo[]

  // Clínicas acessíveis ao usuário
  const clinicasVinculadas = await prisma.usuarioClinica.findMany({
    where: { usuarioId: BigInt(user.id) },
    include: { clinica: { select: { id: true, nome: true } } },
  })

  const clinicas = clinicasVinculadas.map((uc) => ({
    id: uc.clinica.id.toString(),
    nome: uc.clinica.nome,
  }))

  const clinicaIdAtual = clinicas.length > 0
    ? await getClinicaIdAtual(clinicas[0].id)
    : ""

  return (
    <AppShell
      userName={user.nome}
      userEmail={user.email}
      permissoes={modulosVisiveis}
    >
      <div className="flex flex-col h-full">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="h-8" /> {/* espaço para breadcrumb futuro */}
          {clinicas.length > 0 && (
            <ClinicSwitcher
              clinicas={clinicas}
              clinicaAtualId={clinicaIdAtual}
            />
          )}
        </header>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </AppShell>
  )
}
