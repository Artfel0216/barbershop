import { prisma } from "@/lib/prisma"
import CancelButton from "./cancel-button"

export default async function CancelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const appointment = await prisma.appointment.findFirst({
    where: { cancelToken: token, status: "scheduled" },
  })

  if (!appointment) {
    return (
      <div className="min-h-screen bg-neutral-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="text-6xl">❌</div>
          <h1 className="text-2xl font-bold">Link inválido</h1>
          <p className="text-zinc-400 text-sm">Este link de cancelamento não é válido ou o agendamento já foi cancelado.</p>
        </div>
      </div>
    )
  }

  const dateStr = appointment.date.toISOString().split("T")[0]

  return (
    <div className="min-h-screen bg-neutral-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="text-center max-w-sm space-y-6 p-8 rounded-2xl bg-zinc-900/40 border border-white/[0.06]">
        <div className="text-6xl">✂️</div>
        <h1 className="text-2xl font-bold">Cancelar agendamento?</h1>
        <div className="text-zinc-400 text-sm space-y-1">
          <p>{appointment.name}</p>
          <p className="font-mono text-amber-400">{dateStr} às {appointment.time}</p>
        </div>
        <CancelButton token={token} />
      </div>
    </div>
  )
}
