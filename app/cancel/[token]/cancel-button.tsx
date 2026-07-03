"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/by-token/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) setDone(true);
    } catch {}
    setLoading(false);
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="text-emerald-400 font-medium">Agendamento cancelado com sucesso!</div>
        <button onClick={() => router.push("/")}
          className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors">
          Novo agendamento
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button onClick={handleCancel} disabled={loading}
        className="w-full rounded-xl bg-red-500/20 text-red-400 px-4 py-3 font-semibold border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-40">
        {loading ? "Cancelando..." : "Sim, cancelar agendamento"}
      </button>
      <button onClick={() => router.push("/")}
        className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-700 transition-colors">
        Não, voltar
      </button>
    </div>
  );
}
