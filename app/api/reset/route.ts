import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateToken, extractToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const token = extractToken(request)
  if (!token || !validateToken(token)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.$transaction([
      prisma.sale.deleteMany(),
      prisma.appointment.deleteMany(),
      prisma.expense.deleteMany(),
      prisma.barber.deleteMany(),
      prisma.product.deleteMany(),
      prisma.blockedDay.deleteMany(),
    ])

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "Erro ao zerar dados" }, { status: 500 })
  }
}
