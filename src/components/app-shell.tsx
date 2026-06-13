"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { logoutAction } from "@/app/(auth)/actions"
import type { Modulo } from "@/generated/prisma/client"

type Props = {
  children: React.ReactNode
  userName: string
  userEmail: string
  permissoes: Modulo[]
}

export function AppShell({ children, userName, userEmail, permissoes }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await logoutAction()
      router.push("/login")
    })
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userName={userName}
        userEmail={userEmail}
        permissoes={permissoes}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </main>
    </div>
  )
}
