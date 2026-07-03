import { prisma } from "@/lib/prisma"
import { getServiceLabel } from "@/lib/services"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const appointment = await prisma.appointment.findUnique({
    where: { id: Number(id) },
  })

  if (!appointment) {
    return Response.json({ error: "Appointment not found" }, { status: 404 })
  }

  const [y, m, d] = appointment.date.toISOString().split("T")[0].split("-")
  const [hh, mm] = appointment.time.split(":")
  const start = `${y}${m}${d}T${hh}${mm}00`
  const endHour = String(Number(hh)).padStart(2, "0")
  const endMin = String(Number(mm) + 30).padStart(2, "0")
  const end = `${y}${m}${d}T${endHour}${endMin}00`

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Barbershop//Agendamento//PT-BR",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${getServiceLabel(appointment.service)} - ${appointment.name}`,
    `DESCRIPTION:Cliente: ${appointment.name}\\nServiço: ${getServiceLabel(appointment.service)}\\nHorário: ${appointment.time}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="agendamento-${appointment.id}.ics"`,
    },
  })
}
