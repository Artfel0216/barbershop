import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateToken, extractToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const token = extractToken(request)
  if (!token || !validateToken(token)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const date = request.nextUrl.searchParams.get("date")
  const where = date ? { date: new Date(date) } : {}
  const sales = await prisma.sale.findMany({
    where,
    include: { product: true },
    orderBy: { createdAt: "desc" },
  })
  return Response.json(sales)
}

export async function POST(request: NextRequest) {
  const token = extractToken(request)
  if (!token || !validateToken(token)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { productId, quantity, total, date } = body
  if (!productId || !total) return Response.json({ error: "productId and total required" }, { status: 400 })
  const qty = typeof quantity === "number" && quantity > 0 ? Math.floor(quantity) : 1

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return Response.json({ error: "Product not found" }, { status: 404 })
  if (product.stock < qty) return Response.json({ error: "Insufficient stock" }, { status: 400 })

  const sale = await prisma.sale.create({
    data: { productId, quantity: qty, total, date: date ? new Date(date) : new Date() },
    include: { product: true },
  })

  // Update stock
  await prisma.product.update({
    where: { id: productId },
    data: { stock: { decrement: qty } },
  })

  return Response.json(sale, { status: 201 })
}
