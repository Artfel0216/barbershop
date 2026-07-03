import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateToken, extractToken } from "@/lib/auth"

export async function GET() {
  const days = await prisma.blockedDay.findMany({ orderBy: { date: "asc" } })
  return Response.json(days)
}

export async function POST(request: NextRequest) {
  const token = extractToken(request)
  if (!token || !validateToken(token)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { date, reason } = body
  if (!date) return Response.json({ error: "Date required" }, { status: 400 })

  const blocked = await prisma.blockedDay.upsert({
    where: { date: new Date(date) },
    create: { date: new Date(date), reason: reason ?? "" },
    update: { reason: reason ?? "" },
  })
  return Response.json(blocked, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const token = extractToken(request)
  if (!token || !validateToken(token)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = request.nextUrl
  const date = searchParams.get("date")
  if (!date) return Response.json({ error: "Date required" }, { status: 400 })

  await prisma.blockedDay.delete({ where: { date: new Date(date) } })
  return Response.json({ ok: true })
}
