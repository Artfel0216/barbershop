import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateTimeSlots, isSlotInPast } from "@/lib/slots"
import { getTodayDateString } from "@/lib/brasilia"
import { getServiceDuration } from "@/lib/services"

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? getTodayDateString()
  const service = request.nextUrl.searchParams.get("service") ?? "haircut"

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date" }, { status: 400 })
  }

  const allSlots = generateTimeSlots(service)

  const appointments = await prisma.appointment.findMany({
    where: { date: new Date(date), status: "scheduled" },
    select: { time: true, service: true },
  })

  // Build occupied time ranges
  const occupiedRanges: Array<{ start: number; end: number }> = []
  for (const apt of appointments) {
    const [h, m] = apt.time.split(":").map(Number)
    const startMin = h * 60 + m
    const endMin = startMin + getServiceDuration(apt.service)
    occupiedRanges.push({ start: startMin, end: endMin })
  }

  const availableSlots = allSlots.filter((time) => {
    if (isSlotInPast(date, time, service)) return false
    const [h, m] = time.split(":").map(Number)
    const slotStart = h * 60 + m
    const slotEnd = slotStart + getServiceDuration(service)
    return !occupiedRanges.some((o) => slotStart < o.end && slotEnd > o.start)
  })

  return Response.json({ date, slots: availableSlots })
}

