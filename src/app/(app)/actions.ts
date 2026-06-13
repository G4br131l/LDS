"use server"

import { cookies } from "next/headers"

export async function setClinicalAction(clinicaId: string) {
  const jar = await cookies()
  jar.set("clinicaId", clinicaId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  })
}

export async function getClinicaIdAtual(fallback: string): Promise<string> {
  const jar = await cookies()
  return jar.get("clinicaId")?.value ?? fallback
}
