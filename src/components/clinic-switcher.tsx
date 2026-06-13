"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2, ChevronDown } from "lucide-react"
import { setClinicalAction } from "@/app/(app)/actions"
import { cn } from "@/lib/utils"

type Clinica = { id: string; nome: string }

type Props = {
  clinicas: Clinica[]
  clinicaAtualId: string
}

export function ClinicSwitcher({ clinicas, clinicaAtualId }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [atual, setAtual] = useState(clinicaAtualId)

  const clinicaAtual = clinicas.find((c) => c.id === atual) ?? clinicas[0]

  function handleSelect(id: string) {
    setAtual(id)
    startTransition(async () => {
      await setClinicalAction(id)
      router.refresh()
    })
  }

  if (clinicas.length <= 1) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Building2 className="w-4 h-4 text-slate-400" />
        {clinicaAtual?.nome ?? "—"}
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5",
          "text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors max-w-xs"
        )}
      >
        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="truncate">{clinicaAtual?.nome}</span>
        <ChevronDown className="w-3 h-3 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {clinicas.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => handleSelect(c.id)}
            className="cursor-pointer"
          >
            {c.nome}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
