import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateTimeSlots, isSlotInPast } from "@/lib/slots"
import { getTodayDateString } from "@/lib/brasilia"
import { ServiceKey, SERVICES } from "@/lib/services"
import { generateCancelToken } from "@/lib/helpers"

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? getTodayDateString()

  const appointments = await prisma.appointment.findMany({
    where: { date: new Date(date) },
    orderBy: { time: "asc" },
    include: { barber: { select: { id: true, name: true } } },
  })

  return Response.json(appointments)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, phone, date, time, service, barberId } = body

  if (!name || !date || !time || !service) {
    return Response.json({ error: "name, date, time, and service are required" }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date" }, { status: 400 })
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return Response.json({ error: "Invalid time" }, { status: 400 })
  }
  if (!(service in SERVICES)) {
    return Response.json({ error: `Invalid service` }, { status: 400 })
  }

  const allSlots = generateTimeSlots(service)
  if (!allSlots.includes(time)) {
    return Response.json({ error: "Invalid slot" }, { status: 400 })
  }
  if (isSlotInPast(date, time, service)) {
    return Response.json({ error: "Past slot" }, { status: 400 })
  }

  // Check time overlap accounting for durations
  const [h, m] = time.split(":").map(Number)
  const newStart = h * 60 + m
  const newEnd = newStart + (SERVICES[service as ServiceKey]?.duration ?? 30)

  const existing = await prisma.appointment.findMany({
    where: { date: new Date(date), status: "scheduled" },
    select: { time: true, service: true },
  })

  for (const apt of existing) {
    const [ah, am] = apt.time.split(":").map(Number)
    const aStart = ah * 60 + am
    const aEnd = aStart + (SERVICES[apt.service as ServiceKey]?.duration ?? 30)
    if (newStart < aEnd && newEnd > aStart) {
      return Response.json({ error: "Time conflict" }, { status: 409 })
    }
  }

  const cancelToken = generateCancelToken()
  const appointment = await prisma.appointment.create({
    data: {
      name,
      phone: phone ?? "",
      date: new Date(date),
      time,
      service: service as ServiceKey,
      barberId: barberId || null,
      cancelToken,
    },
  })

  return Response.json(appointment, { status: 201 })
}
