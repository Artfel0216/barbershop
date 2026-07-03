"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("admin_token", data.token);
        router.push("/admin");
      } else {
        setError("Senha incorreta");
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 bg-neutral-950 text-zinc-100">
      <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[400px] h-[400px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-sm space-y-6 z-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-zinc-400 text-sm mt-1">Acesso restrito</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-6 rounded-2xl bg-zinc-900/40 border border-white/[0.06] backdrop-blur-xl"
        >
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-400 tracking-wider uppercase">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              required
              className="w-full rounded-xl bg-zinc-900/60 border border-white/[0.08] px-4 py-3 text-zinc-100 placeholder-zinc-600 transition-all duration-300 focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 font-bold text-black transition-all duration-300 hover:brightness-110 disabled:opacity-40"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
