import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateToken, extractToken } from "@/lib/auth"
import { generateTimeSlots } from "@/lib/slots"
import { SERVICES, ServiceKey, getServiceDuration } from "@/lib/services"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(request)
  const isAdmin = token && validateToken(token)
  const { id } = await params

  const appointmentId = Number(id)
  if (!Number.isFinite(appointmentId)) return Response.json({ error: "Invalid id" }, { status: 400 })

  const body = await request.json()
  const { time, status, barberId, service, name, phone } = body

  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } })
  if (!appointment) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // Client self-cancel via cancelToken
  if (status === "cancelled" && body.cancelToken) {
    if (appointment.cancelToken !== body.cancelToken) {
      return Response.json({ error: "Invalid token" }, { status: 401 })
    }
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "cancelled" },
    })
    return Response.json(updated)
  }

  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const updateData: Record<string, unknown> = {}

  if (time !== undefined) {
    if (!/^\d{2}:\d{2}$/.test(time)) return Response.json({ error: "Invalid time" }, { status: 400 })
    const serviceForSlots = service ?? appointment.service
    const allSlots = generateTimeSlots(serviceForSlots)
    if (!allSlots.includes(time)) return Response.json({ error: "Invalid slot" }, { status: 400 })
    updateData.time = time
  }
  if (status !== undefined) {
    if (!["scheduled", "completed", "cancelled", "no_show"].includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 })
    }
    updateData.status = status
  }
  if (barberId !== undefined) updateData.barberId = barberId ?? null
  if (service !== undefined) {
    if (!(service in SERVICES)) return Response.json({ error: "Invalid service" }, { status: 400 })
    updateData.service = service as ServiceKey
  }
  if (name !== undefined) updateData.name = name
  if (phone !== undefined) updateData.phone = phone

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: updateData,
  })
  return Response.json(updated)
}
