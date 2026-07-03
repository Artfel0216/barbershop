import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateToken, extractToken } from "@/lib/auth"
import { getWeekRange, getMonthRange, getYearRange } from "@/lib/helpers"
import { getServicePrice } from "@/lib/services"

export async function GET(request: NextRequest) {
  const token = extractToken(request)
  if (!token || !validateToken(token)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const period = request.nextUrl.searchParams.get("period") ?? "week"
  let start: Date, end: Date

  if (period === "year") {
    const r = getYearRange(); start = r.start; end = r.end
  } else if (period === "month") {
    const monthsAgo = Number(request.nextUrl.searchParams.get("monthsAgo") ?? "0")
    const r = getMonthRange(monthsAgo); start = r.start; end = r.end
  } else {
    const r = getWeekRange(); start = r.start; end = r.end
  }

  const appointments = await prisma.appointment.findMany({
    where: { date: { gte: start, lte: end } },
    include: { barber: { select: { id: true, name: true, commission: true } } },
    orderBy: { date: "asc" },
  })

  const sales = await prisma.sale.findMany({
    where: { date: { gte: start, lte: end } },
    include: { product: true },
  })

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lte: end } },
  })

  // Service breakdown (completed only)
  const byService: Record<string, { count: number; total: number }> = {}
  const byDay: Record<string, { count: number; total: number }> = {}
  const byStatus: Record<string, { count: number; total: number }> = {}
  const byBarber: Record<string, { count: number; total: number; commission: number }> = {}
  let totalRevenue = 0
  let totalServices = 0

  for (const apt of appointments) {
    const price = getServicePrice(apt.service)
    const day = apt.date.toISOString().split("T")[0]

    if (!byStatus[apt.status]) byStatus[apt.status] = { count: 0, total: 0 }
    byStatus[apt.status].count++
    byStatus[apt.status].total += price

    if (apt.status === "completed") {
      totalRevenue += price
      totalServices++

      if (!byService[apt.service]) byService[apt.service] = { count: 0, total: 0 }
      byService[apt.service].count++
      byService[apt.service].total += price

      if (!byDay[day]) byDay[day] = { count: 0, total: 0 }
      byDay[day].count++
      byDay[day].total += price

      if (apt.barber) {
        if (!byBarber[apt.barber.name]) {
          byBarber[apt.barber.name] = { count: 0, total: 0, commission: apt.barber.commission }
        }
        byBarber[apt.barber.name].count++
        byBarber[apt.barber.name].total += price
      }
    }
  }

  // Product sales
  let productRevenue = 0
  let productCost = 0
  for (const sale of sales) {
    productRevenue += sale.total
    productCost += (sale.product?.cost ?? 0) * sale.quantity
  }

  // Expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const byCategory: Record<string, number> = {}
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount
  }

  const netProfit = totalRevenue + productRevenue - totalExpenses - productCost

  return Response.json({
    period,
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
    services: { total: totalServices, revenue: totalRevenue },
    products: { revenue: productRevenue, cost: productCost, profit: productRevenue - productCost },
    expenses: { total: totalExpenses, byCategory },
    netProfit,
    byService,
    byDay,
    byStatus,
    byBarber,
  })
}
