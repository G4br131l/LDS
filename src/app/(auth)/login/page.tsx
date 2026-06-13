"use client"

import { useActionState } from "react"
import { loginAction } from "@/app/(auth)/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined)

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-slate-800">Umbrella</CardTitle>
        <p className="text-sm text-slate-500">Gestão de Clínicas Médicas</p>
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
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              name="senha"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {state?.erro && (
            <p className="text-sm text-red-600">{state.erro}</p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>

          <div className="text-center">
            <Link
              href="/recuperar-senha"
              className="text-sm text-slate-500 hover:text-slate-800 underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
