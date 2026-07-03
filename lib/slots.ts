import { getBrasiliaNow, getTodayDateString } from "./brasilia"
import { getServiceDuration } from "./services"

export const OPENING_HOUR = 7
export const CLOSING_HOUR = 18

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function generateTimeSlots(service?: string): string[] {
  const duration = service ? getServiceDuration(service) : 30
  const slots: string[] = []
  const openMin = OPENING_HOUR * 60
  const closeMin = CLOSING_HOUR * 60

  for (let start = openMin; start + duration <= closeMin; start += 30) {
    slots.push(minutesToTime(start))
  }
  return slots
}

export function getSlotEndTime(start: string, service: string): string {
  const [h, m] = start.split(":").map(Number)
  const duration = getServiceDuration(service)
  const total = h * 60 + m + duration
  return minutesToTime(total)
}

export function isSlotInPast(date: string, time: string, service?: string): boolean {
  const today = getTodayDateString()
  if (date < today) return true
  if (date > today) return false

  const brasilia = getBrasiliaNow()
  const [hours, minutes] = time.split(":").map(Number)
  const slotEnd = hours * 60 + minutes + (service ? getServiceDuration(service) : 30)
  const currentTime = brasilia.getHours() * 60 + brasilia.getMinutes()
  return slotEnd <= currentTime
}
