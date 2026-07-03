"use client";

import { useState } from "react";
import Link from "next/link";
import { getServiceLabel, getServicePrice } from "@/lib/services";

interface Appointment {
  id: number; name: string; date: string; time: string; service: string; status: string;
}

export default function MyAppointments() {
  const [phone, setPhone] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const res = await fetch(`/api/appointments/search?phone=${digits}`);
      const data = await res.json();
      setAppointments(data ?? []);
    } catch { setAppointments([]); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-zinc-100 p-4">
      <div className="max-w-md mx-auto space-y-6 pt-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Meus Agendamentos</h1>
          <p className="text-zinc-400 text-sm mt-1">Consulte seus horários</p>
        </div>

        <form onSubmit={handleSearch} className="space-y-3 p-5 rounded-2xl bg-zinc-900/40 border border-white/[0.06]">
          <label className="block text-xs font-semibold text-zinc-400 tracking-wider uppercase">WhatsApp</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" required
            className="w-full rounded-xl bg-zinc-900/60 border border-white/[0.08] px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50" />
          <button type="submit" disabled={loading || !phone.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 font-bold text-black hover:brightness-110 disabled:opacity-40">
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </form>

        {searched && !loading && appointments.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-8">Nenhum agendamento encontrado</p>
        )}

        {appointments.length > 0 && (
          <div className="space-y-2">
            {appointments.map((apt) => {
              const dateStr = apt.date?.split("T")[0] ?? apt.date;
              return (
                <div key={apt.id} className="flex items-center justify-between rounded-xl px-4 py-3 bg-zinc-900/40 border border-white/[0.06]">
                  <div>
                    <p className="font-mono text-amber-400 font-bold text-sm">{apt.time}</p>
                    <p className="text-xs text-zinc-500">{dateStr} • {getServiceLabel(apt.service)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-zinc-200">R$ {getServicePrice(apt.service).toFixed(2)}</p>
                    <p className={`text-xs ${apt.status === "scheduled" ? "text-blue-400" : apt.status === "completed" ? "text-emerald-400" : "text-red-400"}`}>
                      {apt.status === "scheduled" ? "Agendado" : apt.status === "completed" ? "Realizado" : "Cancelado"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center">
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← Voltar</Link>
        </div>
      </div>
    </div>
  );
}
