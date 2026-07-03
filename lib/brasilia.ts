export function getBrasiliaNow(): Date {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc - 3 * 3600000)
}

export function getTodayDateString(): string {
  return getBrasiliaNow().toISOString().split("T")[0]
}

export function getWeekRange(): { start: Date; end: Date } {
  const now = getBrasiliaNow()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return { start: monday, end: sunday }
}
