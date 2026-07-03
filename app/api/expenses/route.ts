import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateToken, extractToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const token = extractToken(request)
  if (!token || !validateToken(token)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const date = request.nextUrl.searchParams.get("date")
  const where = date ? { date: new Date(date) } : {}
  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })
  return Response.json(expenses)
}

export async function POST(request: NextRequest) {
  const token = extractToken(request)
  if (!token || !validateToken(token)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { description, amount, category, date } = body
  if (!description || !amount) return Response.json({ error: "description and amount required" }, { status: 400 })

  const expense = await prisma.expense.create({
    data: { description, amount, category: category ?? "geral", date: date ? new Date(date) : new Date() },
  })
  return Response.json(expense, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const token = extractToken(request)
  if (!token || !validateToken(token)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = request.nextUrl
  const id = searchParams.get("id")
  if (!id) return Response.json({ error: "id required" }, { status: 400 })

  await prisma.expense.delete({ where: { id: Number(id) } })
  return Response.json({ ok: true })
}
