"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getServiceLabel, getServicePrice } from "@/lib/services";
import { formatDateBR } from "@/lib/helpers";

interface Appointment {
  id: number; name: string; phone: string; date: string; time: string; service: string; status: string; barberId: number | null; createdAt: string;
  barber?: { id: number; name: string } | null;
}
interface Barber { id: number; name: string; commission: number; active: boolean }
interface Product { id: number; name: string; price: number; cost: number; stock: number }
interface EarningsData {
  period: string; start: string; end: string;
  services: { total: number; revenue: number };
  products: { revenue: number; cost: number; profit: number };
  expenses: { total: number; byCategory: Record<string, number> };
  netProfit: number;
  byService: Record<string, { count: number; total: number }>;
  byDay: Record<string, { count: number; total: number }>;
  byStatus: Record<string, { count: number; total: number }>;
  byBarber: Record<string, { count: number; total: number; commission: number }>;
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: string }> = {
  scheduled: { label: "Agendado", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: "🕐" },
  completed: { label: "Compareceu", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: "✅" },
  cancelled: { label: "Cancelado", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: "❌" },
  no_show: { label: "Faltou", color: "text-orange-400 bg-orange-500/10 border-orange-500/20", icon: "⚠️" },
};

function getToday() { const d = new Date(); return new Date(d.getTime() + d.getTimezoneOffset() * -60000 - 10800000).toISOString().split("T")[0]; }
function getBrasilia() { const d = new Date(); return new Date(d.getTime() + d.getTimezoneOffset() * -60000 - 10800000); }
function isOverdue40(date: string, time: string) {
  if (date !== getToday()) return false;
  const now = getBrasilia();
  const [h, m] = time.split(":").map(Number);
  return (now.getHours() * 60 + now.getMinutes()) - (h * 60 + m) >= 40;
}
function playSound() {
  try { const c = new AudioContext(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 800; g.gain.value = 0.1; o.start(); o.stop(c.currentTime + 0.15); } catch {}
}
function exportCSV(appointments: Appointment[]) {
  const rows = [["Horário", "Cliente", "Telefone", "Serviço", "Status", "Valor"]];
  for (const a of appointments) {
    rows.push([a.time, a.name, a.phone, getServiceLabel(a.service), STATUS_CFG[a.status]?.label ?? a.status, `R$ ${getServicePrice(a.service).toFixed(2)}`]);
  }
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "agendamentos.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const router = useRouter();
  const today = getToday();
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState("agenda");
  const [date, setDate] = useState(today);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [period, setPeriod] = useState("week");
  const [lastMaxId, setLastMaxId] = useState(0);
  const [notif, setNotif] = useState<{ id: number; name: string; time: string } | null>(null);
  const [tomorrowAppts, setTomorrowAppts] = useState<Appointment[]>([]);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);

  // Admin data
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [showAddBarber, setShowAddBarber] = useState(false);
  const [newBarberName, setNewBarberName] = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: 0, cost: 0, stock: 0 });
  const [showBlock, setShowBlock] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newTime, setNewTime] = useState("");
  const [editSlots, setEditSlots] = useState<string[]>([]);
  const [showExpense, setShowExpense] = useState(false);
  const [expenseData, setExpenseData] = useState({ description: "", amount: 0, category: "geral" });
  const [showSale, setShowSale] = useState(false);
  const [saleData, setSaleData] = useState({ productId: 0, quantity: 1 });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Auth
  useEffect(() => {
    const stored = localStorage.getItem("admin_token");
    if (!stored) { router.replace("/admin/login"); return; }
    fetch("/api/auth", { headers: { Authorization: `Bearer ${stored}` } })
      .then((r) => { if (!r.ok) { localStorage.removeItem("admin_token"); router.replace("/admin/login"); return; } setToken(stored); setChecking(false); })
      .catch(() => { localStorage.removeItem("admin_token"); router.replace("/admin/login"); });
  }, [router]);

  // Fetch appointments
  useEffect(() => {
    if (!token) return;
    const fetch_ = () => {
      fetch(`/api/appointments?date=${date}`).then((r) => r.json()).then((d: Appointment[]) => {
        setAppointments(d); setLoading(false);
        const mx = Math.max(...d.map((a) => a.id), 0);
        if (lastMaxId > 0 && mx > lastMaxId) {
          d.filter((a) => a.id > lastMaxId).forEach((a) => {
            setNotif({ id: a.id, name: a.name, time: a.time }); playSound();
            if ("Notification" in window && Notification.permission === "granted")
              new Notification("Novo!", { body: `${a.name} às ${a.time}` });
          });
        }
        setLastMaxId(mx);
      }).catch(() => setLoading(false));
    };
    fetch_(); const iv = setInterval(fetch_, 10000);
    return () => clearInterval(iv);
  }, [date, token, lastMaxId]);

  // Fetch earnings
  useEffect(() => {
    if (!token) return;
    fetch(`/api/earnings?period=${period}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => { if (d.services) setEarnings(d); }).catch(() => {});
  }, [token, period, appointments]);

  // Fetch admin data
  useEffect(() => {
    if (!token) return;
    fetch("/api/barbers").then((r) => r.json()).then(setBarbers).catch(() => {});
    fetch("/api/products").then((r) => r.json()).then(setProducts).catch(() => {});
    fetch("/api/blocked-days").then((r) => r.json()).then((d) => setBlockedDates(d.map((b: { date: string }) => b.date.split("T")[0]))).catch(() => {});
  }, [token]);

  useEffect(() => { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); }, []);

  // Check tomorrow's appointments
  useEffect(() => {
    if (!token) return;
    const tomorrow = new Date(getBrasilia().getTime() + 86400000).toISOString().split("T")[0];
    fetch(`/api/appointments?date=${tomorrow}`).then((r) => r.json()).then((d: Appointment[]) => {
      if (d.length > 0) setTomorrowAppts(d);
    }).catch(() => {});
  }, [token]);

  // PWA install prompt
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      if (!window.matchMedia("(display-mode: standalone)").matches) {
        const hidden = sessionStorage.getItem("pwa_prompt_hidden");
        if (!hidden) setShowPwaPrompt(true);
      }
    };
    const id = requestAnimationFrame(check);
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => { if (notif) { const t = setTimeout(() => setNotif(null), 5000); return () => clearTimeout(t); } }, [notif]);

  const updateStatus = useCallback(async (id: number, status: string) => {
    const r = await fetch(`/api/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
    if (r.ok) setAppointments((p) => p.map((a) => a.id === id ? { ...a, status } : a));
  }, [token]);

  const startEdit = useCallback((apt: Appointment) => {
    setEditingId(apt.id); setNewTime(apt.time);
    const d = typeof apt.date === "string" ? apt.date.split("T")[0] : apt.date;
    fetch(`/api/slots?date=${d}&service=${apt.service}`).then((r) => r.json()).then((data) => setEditSlots(data.slots ?? [])).catch(() => setEditSlots([]));
  }, []);

  const confirmEdit = useCallback(async (id: number) => {
    if (!newTime) return;
    const r = await fetch(`/api/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ time: newTime }) });
    if (r.ok) { setAppointments((p) => p.map((a) => a.id === id ? { ...a, time: newTime } : a)); setEditingId(null); }
  }, [token, newTime]);

  const handleLogout = () => { localStorage.removeItem("admin_token"); router.replace("/admin/login"); };

  const addBarber = async () => {
    if (!newBarberName) return;
    const r = await fetch("/api/barbers", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: newBarberName }) });
    if (r.ok) { const data = await r.json(); setBarbers((p) => [...p, data]); setNewBarberName(""); setShowAddBarber(false); }
  };

  const addProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    const r = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(newProduct) });
    if (r.ok) { const data = await r.json(); setProducts((p) => [...p, data]); setNewProduct({ name: "", price: 0, cost: 0, stock: 0 }); setShowAddProduct(false); }
  };

  const toggleBlock = async (d: string) => {
    if (blockedDates.includes(d)) {
      await fetch(`/api/blocked-days?date=${d}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setBlockedDates((p) => p.filter((x) => x !== d));
    } else {
      const r = await fetch("/api/blocked-days", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ date: d, reason: blockReason }) });
      if (r.ok) setBlockedDates((p) => [...p, d]);
    }
  };

  const addExpense = async () => {
    if (!expenseData.description || !expenseData.amount) return;
    await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...expenseData, date: today }) });
    setShowExpense(false); setExpenseData({ description: "", amount: 0, category: "geral" });
    fetch(`/api/earnings?period=${period}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).then((d) => { if (d.services) setEarnings(d); });
  };

  const addSale = async () => {
    if (!saleData.productId) return;
    const product = products.find((p) => p.id === saleData.productId);
    if (!product) return;
    await fetch("/api/sales", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ productId: saleData.productId, quantity: saleData.quantity, total: product.price * saleData.quantity, date: today }) });
    setShowSale(false); setSaleData({ productId: 0, quantity: 1 });
    fetch("/api/products").then((r) => r.json()).then(setProducts);
    fetch(`/api/earnings?period=${period}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).then((d) => { if (d.services) setEarnings(d); });
  };

  const handleReset = async () => {
    if (!token) return;
    setResetting(true);
    try {
      const r = await fetch("/api/reset", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        setAppointments([]); setEarnings(null); setBarbers([]); setProducts([]); setBlockedDates([]);
        setShowResetConfirm(false);
      }
    } catch {}
    setResetting(false);
  };

  if (checking) return <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-zinc-400">Carregando...</div>;

  const overdue = appointments.filter((a) => a.status === "scheduled" && isOverdue40(typeof a.date === "string" ? a.date.split("T")[0] : a.date, a.time));
  const weekDays: string[] = [];
  const bd = getBrasilia(); const dw = bd.getDay(); const diff = dw === 0 ? -6 : 1 - dw;
  for (let i = 0; i < 7; i++) { const d = new Date(bd); d.setDate(bd.getDate() + diff + i); weekDays.push(d.toISOString().split("T")[0]); }

  const tabs = [
    { key: "agenda", label: "📋 Agenda" },
    { key: "financeiro", label: "💰 Financeiro" },
    { key: "clientes", label: "👥 Clientes" },
    { key: "config", label: "⚙️ Config" },
  ];

  const maxDay = earnings?.byDay ? Math.max(...Object.values(earnings.byDay).map((d) => d.total), 1) : 1;

  return (
    <div className="min-h-screen bg-neutral-950 text-zinc-100 p-3 md:p-6">
      {notif && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div className="bg-emerald-500 text-black rounded-xl px-5 py-4 shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-400/50">
            <p className="text-xs font-semibold uppercase">Novo agendamento!</p>
            <p className="text-lg font-bold mt-1">{notif.name}</p>
            <p className="text-sm">{notif.time}</p>
          </div>
        </div>
      )}
      {overdue.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-orange-500 text-black rounded-xl px-5 py-4 shadow shadow-orange-400/30 max-w-xs">
            <p className="text-xs font-semibold uppercase">Atraso 40min+</p>
            {overdue.slice(0, 3).map((a) => <p key={a.id} className="text-sm mt-1 font-medium">{a.time} - {a.name}</p>)}
            {overdue.length > 3 && <p className="text-xs mt-1">+{overdue.length - 3}</p>}
          </div>
        </div>
      )}

      {showPwaPrompt && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-5 py-3 text-xs text-zinc-300 shadow-lg flex items-center gap-3">
            <span>📱 Instale o app na tela inicial para acesso rápido</span>
            <button onClick={() => { setShowPwaPrompt(false); sessionStorage.setItem("pwa_prompt_hidden", "1"); }} className="text-zinc-500 hover:text-zinc-300">✕</button>
          </div>
        </div>
      )}

      <header className="max-w-6xl mx-auto flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Barbershop</h1>
          <p className="text-zinc-500 text-xs">Painel Administrativo</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">Site</Link>
          <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300">Sair</button>
        </div>
      </header>

      {tomorrowAppts.length > 0 && (
        <div className="max-w-6xl mx-auto mb-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">📋 Agendamentos de amanhã</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {tomorrowAppts.map((a) => (
                <span key={a.id} className="text-xs bg-zinc-800 px-2.5 py-1 rounded-lg text-zinc-300 border border-zinc-700/50">{a.time} - {a.name}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-6xl mx-auto flex gap-1 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${tab === t.key ? "bg-amber-500/20 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}>{t.label}</button>
        ))}
      </div>

      <main className="max-w-6xl mx-auto space-y-6">
        {/* TAB: AGENDA */}
        {tab === "agenda" && (
          <>
            {earnings && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-zinc-900/60 border border-emerald-500/10 p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Ganhos hoje</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-400">R$ {(earnings.byDay?.[today]?.total ?? 0).toFixed(2)}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{appointments.filter((a) => a.status === "completed").length} concluído(s)</p>
                </div>
                <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
                  <p className="text-xs text-zinc-500 uppercase">Semana</p>
                  <p className="text-2xl font-bold mt-1 text-amber-400">R$ {earnings.services.revenue.toFixed(2)}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{earnings.services.total} serviços</p>
                </div>
                <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
                  <p className="text-xs text-zinc-500 uppercase">Cancelados</p>
                  <p className="text-2xl font-bold mt-1 text-red-400">{earnings.byStatus?.cancelled?.count ?? 0}</p>
                </div>
                <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
                  <p className="text-xs text-zinc-500 uppercase">Faltaram</p>
                  <p className="text-2xl font-bold mt-1 text-orange-400">{earnings.byStatus?.no_show?.count ?? 0}</p>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-300">Agenda • {formatDateBR(date)}</h2>
                <div className="flex items-center gap-2">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  <button onClick={() => exportCSV(appointments)} className="text-xs bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-lg hover:bg-zinc-700">CSV</button>
                </div>
              </div>
              {loading ? <p className="text-zinc-500 text-sm text-center py-8">Carregando...</p> :
               appointments.length === 0 ? <p className="text-zinc-500 text-sm text-center py-8">Nenhum agendamento</p> :
               <div className="space-y-1.5">
                {appointments.map((apt) => {
                  const sc = STATUS_CFG[apt.status]; const overdue_ = apt.status === "scheduled" && isOverdue40(typeof apt.date === "string" ? apt.date.split("T")[0] : apt.date, apt.time);
                  return (
                    <div key={apt.id} className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-colors ${overdue_ ? "border-orange-500/30 bg-orange-500/5" : "border-white/[0.06] hover:bg-zinc-800/50"}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="font-mono text-amber-400 font-bold text-sm w-12 shrink-0">{apt.time}</span>
                        <span className="text-zinc-200 font-medium text-sm truncate">{apt.name}</span>
                        {apt.phone && <span className="text-xs text-zinc-600 hidden md:inline">{apt.phone}</span>}
                        <span className="text-xs text-zinc-500 hidden sm:flex items-center gap-1">{getServiceLabel(apt.service)}</span>
                        {apt.barber && <span className="text-xs text-zinc-600 hidden lg:inline">com {apt.barber.name}</span>}
                        {overdue_ && <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20 animate-pulse">40min</span>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${sc?.color} hidden sm:inline`}>{sc?.icon} {sc?.label}</span>
                        {date === today && apt.status === "scheduled" && (
                          <><button onClick={() => updateStatus(apt.id, "completed")} className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg hover:bg-emerald-500/20" title="Compareceu">✅</button>
                            <button onClick={() => updateStatus(apt.id, "no_show")} className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded-lg hover:bg-orange-500/20" title="Faltou">⚠️</button>
                            <button onClick={() => updateStatus(apt.id, "cancelled")} className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/20" title="Cancelar">❌</button></>
                        )}
                        {apt.status === "scheduled" && (
                          editingId === apt.id ? (
                            <div className="flex items-center gap-1">
                              <select value={newTime} onChange={(e) => setNewTime(e.target.value)} className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300 w-20">{editSlots.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                              <button onClick={() => confirmEdit(apt.id)} className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg">OK</button>
                              <button onClick={() => setEditingId(null)} className="text-xs text-zinc-500 px-1">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => startEdit(apt)} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg hover:bg-zinc-700" title="Editar">🕐</button>
                          )
                        )}
                        <a href={`/api/appointments/${apt.id}/calendar`} target="_blank" className="text-xs text-zinc-500 hover:text-zinc-300" title="Calendário">📅</a>
                      </div>
                    </div>
                  );
                })}
              </div>}
            </div>

            {/* Weekly Calendar */}
            <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] overflow-hidden">
              <div className="p-4 pb-2"><h2 className="text-sm font-semibold text-zinc-300">Semana</h2></div>
              <div className="divide-y divide-white/[0.04]">
                {(() => {
                  const grouped = appointments.filter((a) => weekDays.includes(typeof a.date === "string" ? a.date.split("T")[0] : a.date)).reduce((groups: Record<string, Appointment[]>, a) => {
                    const d = typeof a.date === "string" ? a.date.split("T")[0] : a.date;
                    if (!groups[d]) groups[d] = []; groups[d].push(a); return groups;
                  }, {} as Record<string, Appointment[]>);
                  const entries = Object.entries(grouped);
                  return entries.length > 0 ? entries.map(([day, appts]) => (
                    <div key={day} className={`flex items-center gap-3 px-4 py-2.5 ${day === today ? "bg-amber-500/5" : ""}`}>
                      <span className="text-xs text-zinc-400 w-16 shrink-0">{formatDateBR(day)}</span>
                      <div className="flex-1 flex flex-wrap gap-1">{appts.map((a) => (
                        <span key={a.id} className={`text-xs px-2 py-0.5 rounded-full border ${a.status === "completed" ? "bg-emerald-900/30 border-emerald-700/30 text-emerald-300" : a.status === "scheduled" ? "bg-zinc-800/80 border-zinc-700/50 text-zinc-300" : "bg-zinc-800/40 border-zinc-700/30 text-zinc-500"}`}>{a.time} {a.name}</span>
                      ))}</div>
                      <span className="text-xs text-emerald-400 font-medium w-14 text-right">R$ {appts.filter((a) => a.status === "completed").reduce((s, a) => s + getServicePrice(a.service), 0).toFixed(2)}</span>
                    </div>
                  )) : null;
                })()}
              </div>
            </div>
          </>
        )}

        {/* TAB: FINANCEIRO */}
        {tab === "financeiro" && (
          <>
            <div className="flex gap-2">
              {["week", "month", "year"].map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${period === p ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"}`}>
                  {p === "week" ? "Semana" : p === "month" ? "Mês" : "Ano"}
                </button>
              ))}
            </div>

            {earnings && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
                    <p className="text-xs text-zinc-500">Receita Serviços</p>
                    <p className="text-2xl font-bold text-emerald-400">R$ {earnings.services.revenue.toFixed(2)}</p>
                    <p className="text-xs text-zinc-600">{earnings.services.total} atendimentos</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
                    <p className="text-xs text-zinc-500">Produtos</p>
                    <p className="text-2xl font-bold text-blue-400">R$ {earnings.products.revenue.toFixed(2)}</p>
                    <p className="text-xs text-zinc-600">Custo: R$ {earnings.products.cost.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
                    <p className="text-xs text-zinc-500">Despesas</p>
                    <p className="text-2xl font-bold text-red-400">R$ {earnings.expenses.total.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900/60 border border-amber-500/10 p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Lucro Líquido</p>
                    <p className={`text-2xl font-bold ${earnings.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      R$ {earnings.netProfit.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Daily bar chart */}
                {Object.keys(earnings.byDay).length > 0 && (
                  <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
                    <h2 className="text-sm font-semibold text-zinc-300 mb-4">Faturamento Diário</h2>
                    <div className="flex items-end gap-2 h-32">
                      {Object.entries(earnings.byDay).map(([day, data]) => (
                        <div key={day} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-emerald-400 font-medium">R${data.total}</span>
                          <div className="w-full bg-zinc-800 rounded-t-lg relative" style={{ height: `${Math.max((data.total / maxDay) * 100, 4)}%` }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-lg opacity-80" />
                          </div>
                          <span className="text-[10px] text-zinc-500">{day.slice(5)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Service breakdown */}
                {Object.keys(earnings.byService).length > 0 && (
                  <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
                    <h2 className="text-sm font-semibold text-zinc-300 mb-3">Por Serviço</h2>
                    <div className="space-y-2">
                      {Object.entries(earnings.byService).map(([key, d]) => (
                        <div key={key} className="flex items-center justify-between px-3 py-2 bg-zinc-950/40 rounded-lg">
                          <span className="text-sm text-zinc-300">{getServiceLabel(key)}</span>
                          <span className="text-sm font-medium text-zinc-200">{d.count}x • R$ {d.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expenses */}
                <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-zinc-300">Despesas</h2>
                    <button onClick={() => setShowExpense(!showExpense)} className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/20">+ Nova</button>
                  </div>
                  {showExpense && (
                    <div className="flex gap-2 mb-3">
                      <input type="text" placeholder="Descrição" value={expenseData.description} onChange={(e) => setExpenseData((p) => ({ ...p, description: e.target.value }))}
                        className="flex-1 text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300" />
                      <input type="number" placeholder="Valor" value={expenseData.amount || ""} onChange={(e) => setExpenseData((p) => ({ ...p, amount: Number(e.target.value) }))}
                        className="w-24 text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300" />
                      <button onClick={addExpense} className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg hover:bg-emerald-500/20">OK</button>
                    </div>
                  )}
                  {Object.keys(earnings.expenses.byCategory).length > 0 && (
                    <div className="space-y-1">
                      {Object.entries(earnings.expenses.byCategory).map(([cat, val]) => (
                        <div key={cat} className="flex items-center justify-between px-3 py-1.5 text-sm">
                          <span className="text-zinc-400">{cat}</span>
                          <span className="text-red-400 font-medium">R$ {val.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Barber commissions */}
                {Object.keys(earnings.byBarber).length > 0 && (
                  <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
                    <h2 className="text-sm font-semibold text-zinc-300 mb-3">Comissão por Barbeiro</h2>
                    <div className="space-y-2">
                      {Object.entries(earnings.byBarber).map(([name, d]) => (
                        <div key={name} className="flex items-center justify-between px-3 py-2 bg-zinc-950/40 rounded-lg">
                          <span className="text-sm text-zinc-300">{name}</span>
                          <div className="text-right">
                            <p className="text-sm font-medium text-zinc-200">{d.count}x • R$ {d.total.toFixed(2)}</p>
                            <p className="text-xs text-zinc-500">Comissão: R$ {(d.total * d.commission / 100).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resumo */}
                <div className="rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-amber-500/10 p-6">
                  <h2 className="text-sm font-bold text-zinc-200 mb-4">📊 Resumo {period === "week" ? "da Semana" : period === "month" ? "do Mês" : "do Ano"}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div><p className="text-xl font-bold text-emerald-400">R$ {earnings.services.revenue.toFixed(2)}</p><p className="text-xs text-zinc-500">Serviços</p></div>
                    <div><p className="text-xl font-bold text-blue-400">R$ {earnings.products.profit.toFixed(2)}</p><p className="text-xs text-zinc-500">Lucro Produtos</p></div>
                    <div><p className="text-xl font-bold text-red-400">R$ {earnings.expenses.total.toFixed(2)}</p><p className="text-xs text-zinc-500">Despesas</p></div>
                    <div><p className={`text-xl font-bold ${earnings.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>R$ {earnings.netProfit.toFixed(2)}</p><p className="text-xs text-zinc-500">Lucro Líquido</p></div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* TAB: CLIENTES */}
        {tab === "clientes" && (
          <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Histórico de Clientes</h2>
            {appointments.length > 0 ? (
              <div className="space-y-2">
                {Object.entries(appointments.reduce((acc: Record<string, Appointment[]>, apt) => {
                  const key = apt.name;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(apt);
                  return acc;
                }, {})).map(([name, appts]) => {
                  const total = appts.reduce((s, a) => s + (a.status === "completed" ? getServicePrice(a.service) : 0), 0);
                  return (
                    <div key={name} className="flex items-center justify-between px-4 py-3 bg-zinc-950/40 rounded-xl border border-white/[0.04]">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{name}</p>
                        <p className="text-xs text-zinc-500">{appts.length} agendamento(s) • {appts[0]?.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-emerald-400">R$ {total.toFixed(2)}</p>
                        <p className="text-xs text-zinc-500">{appts.filter((a) => a.status === "completed").length} concluído(s)</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm text-center py-8">Nenhum cliente na data selecionada</p>
            )}
          </div>
        )}

        {/* TAB: CONFIG */}
        {tab === "config" && (
          <div className="space-y-6">
            {/* Barbers */}
            <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-300">✂️ Barbeiros</h2>
                <button onClick={() => setShowAddBarber(!showAddBarber)} className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/20">+ Novo</button>
              </div>
              {showAddBarber && (
                <div className="flex gap-2 mb-3">
                  <input type="text" placeholder="Nome" value={newBarberName} onChange={(e) => setNewBarberName(e.target.value)}
                    className="flex-1 text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300" />
                  <button onClick={addBarber} className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg">OK</button>
                </div>
              )}
              {barbers.length === 0 ? <p className="text-zinc-500 text-sm">Nenhum barbeiro cadastrado</p> : (
                <div className="space-y-1.5">
                  {barbers.map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-3 py-2 bg-zinc-950/40 rounded-lg">
                      <span className="text-sm text-zinc-300">{b.name}</span>
                      <span className="text-xs text-zinc-500">{b.commission}% comissão</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Products */}
            <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-300">🧴 Produtos</h2>
                <button onClick={() => setShowAddProduct(!showAddProduct)} className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/20">+ Novo</button>
              </div>
              {showAddProduct && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  <input type="text" placeholder="Nome" value={newProduct.name} onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                    className="flex-1 text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 min-w-[120px]" />
                  <input type="number" placeholder="Preço" value={newProduct.price || ""} onChange={(e) => setNewProduct((p) => ({ ...p, price: Number(e.target.value) }))}
                    className="w-20 text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300" />
                  <input type="number" placeholder="Custo" value={newProduct.cost || ""} onChange={(e) => setNewProduct((p) => ({ ...p, cost: Number(e.target.value) }))}
                    className="w-20 text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300" />
                  <input type="number" placeholder="Estoque" value={newProduct.stock || ""} onChange={(e) => setNewProduct((p) => ({ ...p, stock: Number(e.target.value) }))}
                    className="w-20 text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300" />
                  <button onClick={addProduct} className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg">OK</button>
                </div>
              )}
              {products.length === 0 ? <p className="text-zinc-500 text-sm">Nenhum produto</p> : (
                <div className="space-y-1.5">
                  {products.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-zinc-950/40 rounded-lg">
                      <div>
                        <span className="text-sm text-zinc-300">{p.name}</span>
                        <span className="text-xs text-zinc-600 ml-2">Estoque: {p.stock}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-zinc-200">R$ {p.price.toFixed(2)}</p>
                        <p className="text-xs text-zinc-500">Custo: R$ {p.cost.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Quick sale */}
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <button onClick={() => setShowSale(!showSale)} className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-500/20">+ Registrar Venda</button>
                {showSale && (
                  <div className="flex gap-2 mt-2">
                    <select value={saleData.productId} onChange={(e) => setSaleData((p) => ({ ...p, productId: Number(e.target.value) }))}
                      className="flex-1 text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300">
                      <option value={0}>Selecione</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name} - R${p.price}</option>)}
                    </select>
                    <input type="number" placeholder="Qtd" value={saleData.quantity} onChange={(e) => setSaleData((p) => ({ ...p, quantity: Number(e.target.value) }))}
                      className="w-16 text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300" />
                    <button onClick={addSale} disabled={!saleData.productId} className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg disabled:opacity-40">OK</button>
                  </div>
                )}
              </div>
            </div>

            {/* Blocked Days */}
            <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-300">🚫 Dias Bloqueados</h2>
                <button onClick={() => { setShowBlock(!showBlock); setBlockDate(""); }} className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/20">+ Bloquear</button>
              </div>
              {showBlock && (
                <div className="flex gap-2 mb-3">
                  <input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)}
                    className="flex-1 text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300" />
                  <input type="text" placeholder="Motivo" value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
                    className="flex-1 text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300" />
                  <button onClick={() => { if (blockDate) { toggleBlock(blockDate); setShowBlock(false); } }} className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg">OK</button>
                </div>
              )}
              {blockedDates.length === 0 ? <p className="text-zinc-500 text-sm">Nenhum dia bloqueado</p> : (
                <div className="flex flex-wrap gap-2">
                  {blockedDates.map((d) => (
                    <button key={d} onClick={() => toggleBlock(d)}
                      className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-full border border-red-500/20 hover:bg-red-500/20">
                      {formatDateBR(d)} ✕
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reset */}
            <div className="rounded-xl bg-zinc-900/60 border border-red-500/10 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-300">⚠️ Danger Zone</h2>
                <button onClick={() => setShowResetConfirm(true)}
                  className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20">Zerar Tudo</button>
              </div>
              {showResetConfirm && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-sm text-red-300 font-medium mb-3">Tem certeza? Isso vai apagar TODOS os dados (agendamentos, vendas, despesas, barbeiros, produtos e dias bloqueados).</p>
                  <div className="flex gap-2">
                    <button onClick={handleReset} disabled={resetting}
                      className="text-xs bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-40">{resetting ? "Zerando..." : "Sim, zerar tudo"}</button>
                    <button onClick={() => setShowResetConfirm(false)}
                      className="text-xs bg-zinc-800 text-zinc-400 px-4 py-2 rounded-lg hover:bg-zinc-700">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
