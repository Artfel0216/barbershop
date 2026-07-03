import { prisma } from "@/lib/prisma"

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const body = await _request.json()
  const { status } = body

  const appointment = await prisma.appointment.findFirst({
    where: { cancelToken: token },
  })

  if (!appointment) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  if (appointment.status !== "scheduled") {
    return Response.json({ error: "Already cancelled" }, { status: 400 })
  }

  if (status !== undefined && status !== "cancelled") {
    return Response.json({ error: "Invalid status" }, { status: 400 })
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "cancelled" },
  })

  return Response.json(updated)
}
