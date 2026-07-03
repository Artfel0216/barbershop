export const SERVICES = {
  haircut: { label: "Corte de Cabelo", price: 20, duration: 40, icon: "💇" },
  beard: { label: "Barba", price: 10, duration: 20, icon: "🧔" },
  eyebrows: { label: "Sobrancelha", price: 5, duration: 15, icon: "✂️" },
  haircut_beard: { label: "Corte + Barba", price: 30, duration: 60, icon: "💇🧔" },
  haircut_eyebrows: { label: "Corte + Sobrancelha", price: 25, duration: 55, icon: "💇✂️" },
  beard_eyebrows: { label: "Barba + Sobrancelha", price: 15, duration: 35, icon: "🧔✂️" },
  haircut_beard_eyebrows: { label: "Corte + Barba + Sobrancelha", price: 35, duration: 75, icon: "💇🧔✂️" },
  haircut_luzes: { label: "Corte com Luzes", price: 50, duration: 90, icon: "✨" },
  haircut_reflexo: { label: "Corte com Reflexo", price: 60, duration: 100, icon: "🌟" },
  haircut_platinado: { label: "Corte com Platinado", price: 80, duration: 120, icon: "⚪" },
} as const

export type ServiceKey = keyof typeof SERVICES

export function getServiceLabel(key: string): string {
  return SERVICES[key as ServiceKey]?.label ?? key
}

export function getServicePrice(key: string): number {
  return SERVICES[key as ServiceKey]?.price ?? 0
}

export function getServiceDuration(key: string): number {
  return SERVICES[key as ServiceKey]?.duration ?? 30
}

export function getServiceIcon(key: string): string {
  return SERVICES[key as ServiceKey]?.icon ?? ""
}
