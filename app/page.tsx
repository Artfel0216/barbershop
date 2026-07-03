"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SERVICES, ServiceKey } from "@/lib/services";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getTodayString(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc - 3 * 3600000).toISOString().split("T")[0];
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d}/${m} (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

const serviceKeys = Object.keys(SERVICES) as ServiceKey[];
interface Barber { id: number; name: string }

const fadeInUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -15, transition: { duration: 0.2 } },
};

export default function Home() {
  const today = getTodayString();
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedService, setSelectedService] = useState<ServiceKey>("haircut");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barberId, setBarberId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [cancelToken, setCancelToken] = useState("");

  useEffect(() => {
    fetch("/api/barbers").then((r) => r.json()).then(setBarbers).catch(() => {});
  }, []);

  useEffect(() => {
    if (!date) return;
    fetch(`/api/slots?date=${date}&service=${selectedService}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .catch(() => setSlots([]));
  }, [date, selectedService]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !selectedTime) return;
    setLoading(true); setMessage("");

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone, date, time: selectedTime, service: selectedService, barberId }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setCancelToken(data.cancelToken ?? "");
        const s = SERVICES[selectedService];
        setMessage(`${s.icon} ${s.label} - R$ ${s.price.toFixed(2)}`);
        setName(""); setPhone(""); setSelectedTime("");
        setSlots((p) => p.filter((s) => s !== selectedTime));
      } else {
        setMessage(data.error ?? "Erro");
      }
    } catch { setMessage("Erro de conexão"); }
    finally { setLoading(false); }
  }

  return (
    <div className="relative flex flex-col items-center min-h-screen p-4 md:p-8 bg-neutral-950 text-zinc-100 overflow-x-hidden">
      <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="w-full max-w-md text-center py-10 z-10">
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">Barbershop</h1>
        <p className="text-zinc-400 mt-2 text-sm font-medium uppercase tracking-wide">Agende seu horário</p>
        <div className="inline-block mt-3 px-3 py-1 text-xs font-medium text-amber-400 bg-amber-500/10 rounded-full border border-amber-500/20">Seg–Sáb • 07:00–18:00</div>
      </motion.header>

      <motion.main initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-md space-y-6 p-6 rounded-2xl bg-zinc-900/40 border border-white/[0.06] backdrop-blur-xl z-10">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-zinc-400 tracking-wider uppercase">Data</label>
          <input type="date" value={date} min={today} onChange={(e) => { setDate(e.target.value); setSelectedTime(""); setMessage(""); setSuccess(false); }}
            className="w-full rounded-xl bg-zinc-900/60 border border-white/[0.08] px-4 py-3 text-zinc-100 focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10" />
          <p className="text-xs font-medium text-amber-500/80">{formatDateBR(date)}</p>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-zinc-400 tracking-wider uppercase">Serviço</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {serviceKeys.map((key) => {
              const s = SERVICES[key]; const isSel = selectedService === key;
              return (
                <motion.button key={key} type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setSelectedService(key); setSelectedTime(""); setMessage(""); setSuccess(false); }}
                  className={`relative rounded-xl py-3 px-2 text-center border transition-all duration-300 ${isSel ? "bg-gradient-to-b from-amber-500 to-amber-600 text-black border-transparent shadow-[0_0_20px_rgba(245,158,11,0.3)]" : "bg-zinc-950/40 text-zinc-300 border-white/[0.06] hover:bg-zinc-800/50"}`}>
                  <div className="text-lg">{s.icon}</div>
                  <div className="text-[11px] font-semibold mt-1 leading-tight">{s.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-80">R$ {s.price.toFixed(2)} • {s.duration}min</div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-zinc-400 tracking-wider uppercase">Horários</label>
          <AnimatePresence mode="wait">
            {slots.length > 0 ? (
              <motion.div key="slots" initial="hidden" animate="visible" exit="hidden"
                variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
                className="grid grid-cols-4 gap-2">
                {slots.map((time) => (
                  <motion.button key={time} type="button" variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedTime(time)}
                    className={`rounded-xl py-2.5 text-sm font-semibold tracking-wide border transition-all ${selectedTime === time ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black border-transparent shadow-[0_0_20px_rgba(245,158,11,0.3)]" : "bg-zinc-950/40 text-zinc-300 border-white/[0.06] hover:bg-zinc-800/50"}`}>
                    {time}
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              <motion.p key="no" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-zinc-500 text-sm text-center py-6 bg-zinc-950/20 rounded-xl border border-dashed border-white/[0.04]">Nenhum horário disponível</motion.p>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {selectedTime && (
            <motion.form initial={{ opacity: 0, height: 0, y: 10 }} animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: 10 }} transition={{ type: "spring", damping: 25, stiffness: 170 }}
              onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-white/[0.06] overflow-hidden">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-400 tracking-wider uppercase">Nome</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required
                  className="w-full rounded-xl bg-zinc-900/60 border border-white/[0.08] px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10" />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-400 tracking-wider uppercase">WhatsApp <span className="text-zinc-600 font-normal">(opcional)</span></label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999"
                  className="w-full rounded-xl bg-zinc-900/60 border border-white/[0.08] px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10" />
              </div>
              {barbers.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-400 tracking-wider uppercase">Barbeiro <span className="text-zinc-600 font-normal">(opcional)</span></label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setBarberId(null)}
                      className={`rounded-xl px-4 py-2 text-xs font-medium border transition-all ${barberId === null ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-zinc-900/60 text-zinc-400 border-white/[0.06]"}`}>Qualquer</button>
                    {barbers.map((b) => (
                      <button key={b.id} type="button" onClick={() => setBarberId(b.id)}
                        className={`rounded-xl px-4 py-2 text-xs font-medium border transition-all ${barberId === b.id ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-zinc-900/60 text-zinc-400 border-white/[0.06]"}`}>{b.name}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-zinc-400">{SERVICES[selectedService].icon} {SERVICES[selectedService].label}</span>
                <span className="text-lg font-bold text-amber-400">R$ {SERVICES[selectedService].price.toFixed(2)}</span>
              </div>
              <motion.button type="submit" disabled={loading || !name.trim()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3.5 font-bold text-black shadow-[0_4px_20px_rgba(245,158,11,0.2)] hover:brightness-110 disabled:opacity-40">
                {loading ? "Agendando..." : "Confirmar"}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {message && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`rounded-xl p-4 text-sm font-medium backdrop-blur-md border ${success ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-rose-500/10 text-rose-300 border-rose-500/20"}`}>
              <p>{message}</p>
              {success && cancelToken && (
                <div className="mt-3 space-y-2">
                  {phone && (
                    <a href={`https://wa.me/55${phone.replace(/\D/g, "")}?text=Agendamento%20confirmado%20para%20${selectedTime}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors">
                      💬 Confirmar via WhatsApp
                    </a>
                  )}
                  <Link href={`/cancel/${cancelToken}`}
                    className="block text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                    Precisa cancelar? Clique aqui
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>

      <footer className="mt-auto py-8 flex gap-4 text-xs tracking-widest text-zinc-600 z-10">
        <Link href="/admin" className="hover:text-amber-500/80 font-medium transition-colors uppercase">Admin</Link>
        <Link href="/me" className="hover:text-amber-500/80 font-medium transition-colors uppercase">Meus Agendamentos</Link>
      </footer>
    </div>
  );
}
