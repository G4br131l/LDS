"use client"

import { useActionState } from "react"
import { solicitarResetAction } from "@/app/(auth)/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function RecuperarSenhaPage() {
  const [state, action, pending] = useActionState(solicitarResetAction, undefined)

  if (state?.mensagem) {
    return (
      <Card className="w-full max-w-sm shadow-lg">
        <CardContent className="pt-6 text-center space-y-4">
          <p className="text-sm text-slate-700">{state.mensagem}</p>
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-800 underline">
            Voltar para o login
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-800">Recuperar senha</CardTitle>
        <p className="text-sm text-slate-500">
          Informe seu email para receber as instruções de redefinição.
        </p>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
            />
          </div>

          {state?.erro && (
            <p className="text-sm text-red-600">{state.erro}</p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Enviando..." : "Enviar instruções"}
          </Button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-slate-500 hover:text-slate-800 underline"
            >
              Voltar para o login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
