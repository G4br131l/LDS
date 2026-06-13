"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  FileText,
  Stethoscope,
  DoorOpen,
  DollarSign,
  BarChart3,
  Building2,
  UserCog,
  LogOut,
} from "lucide-react"
import type { Modulo } from "@/generated/prisma/client"

export type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  modulo: Modulo
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, modulo: "Dashboard" },
  { label: "Agenda", href: "/agenda", icon: CalendarDays, modulo: "Agenda" },
  { label: "Pacientes", href: "/pacientes", icon: Users, modulo: "Pacientes" },
  { label: "Prontuário", href: "/prontuario", icon: FileText, modulo: "Prontuario" },
  { label: "Profissionais", href: "/profissionais", icon: Stethoscope, modulo: "Profissionais" },
  { label: "Consultórios", href: "/consultorios", icon: DoorOpen, modulo: "Consultorios" },
  { label: "Financeiro", href: "/financeiro", icon: DollarSign, modulo: "Financeiro" },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3, modulo: "Relatorios" },
  { label: "Clínicas", href: "/clinicas", icon: Building2, modulo: "Clinicas" },
  { label: "Usuários", href: "/usuarios", icon: UserCog, modulo: "Usuarios" },
]

type Props = {
  userName: string
  userEmail: string
  permissoes: Modulo[]
  onLogout: () => void
}

export function Sidebar({ userName, userEmail, permissoes, onLogout }: Props) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter((item) => permissoes.includes(item.modulo))

  return (
    <aside className="flex flex-col h-full w-64 bg-slate-900 text-slate-100">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <span className="text-xl font-bold tracking-tight">Umbrella</span>
        <p className="text-xs text-slate-400 mt-0.5">Clínicas Médicas</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Rodapé do usuário */}
      <div className="border-t border-slate-700 px-4 py-4 space-y-2">
        <div className="px-1">
          <p className="text-sm font-medium truncate">{userName}</p>
          <p className="text-xs text-slate-400 truncate">{userEmail}</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
