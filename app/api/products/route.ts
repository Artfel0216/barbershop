import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateToken, extractToken } from "@/lib/auth"

export async function GET() {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } })
  return Response.json(products)
}

export async function POST(request: NextRequest) {
  const token = extractToken(request)
  if (!token || !validateToken(token)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { name, price, cost, stock } = body
  if (!name || !price) return Response.json({ error: "name and price required" }, { status: 400 })

  const product = await prisma.product.create({ data: { name, price, cost: cost ?? 0, stock: stock ?? 0 } })
  return Response.json(product, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const token = extractToken(request)
  if (!token || !validateToken(token)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { id, name, price, cost, stock } = body
  if (!id) return Response.json({ error: "id required" }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (price !== undefined) data.price = price
  if (cost !== undefined) data.cost = cost
  if (stock !== undefined) data.stock = stock

  const product = await prisma.product.update({ where: { id }, data })
  return Response.json(product)
}
