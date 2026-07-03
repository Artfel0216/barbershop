import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateToken, extractToken } from "@/lib/auth"

export async function GET() {
  const barbers = await prisma.barber.findMany({ orderBy: { name: "asc" } })
  return Response.json(barbers)
}

export async function POST(request: NextRequest) {
  const token = extractToken(request)
  if (!token || !validateToken(token)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { name, commission } = body
  if (!name) return Response.json({ error: "Name required" }, { status: 400 })

  const barber = await prisma.barber.create({ data: { name, commission: commission ?? 100 } })
  return Response.json(barber, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const token = extractToken(request)
  if (!token || !validateToken(token)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { id, name, commission, active } = body
  if (!id) return Response.json({ error: "id required" }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (commission !== undefined) data.commission = commission
  if (active !== undefined) data.active = active

  const barber = await prisma.barber.update({ where: { id }, data })
  return Response.json(barber)
}
