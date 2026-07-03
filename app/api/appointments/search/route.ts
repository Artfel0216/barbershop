import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone") ?? ""
  const name = request.nextUrl.searchParams.get("name") ?? ""

  const where: Record<string, unknown> = {}
  if (phone) where.phone = { contains: phone }
  if (name) where.name = { contains: name, mode: "insensitive" }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { date: "desc" },
    take: 50,
  })

  return Response.json(appointments)
}
