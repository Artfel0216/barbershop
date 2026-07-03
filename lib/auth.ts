const SECRET = "barbershop-admin-secret-2026"

export function generateToken(password: string): string | null {
  if (!process.env.ADMIN_PASSWORD) return null
  if (password !== process.env.ADMIN_PASSWORD) return null

  const payload = {
    p: password,
    t: Date.now(),
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64")
  const hash = Buffer.from(
    password + SECRET + Math.floor(Date.now() / 86400000)
  ).toString("base64")

  return `${encoded}.${hash}`
}

export function validateToken(token: string): boolean {
  try {
    if (!process.env.ADMIN_PASSWORD) return false
    const parts = token.split(".")
    if (parts.length !== 2) return false

    const payload = JSON.parse(Buffer.from(parts[0], "base64").toString())
    const expectedHash = Buffer.from(
      payload.p + SECRET + Math.floor(Date.now() / 86400000)
    ).toString("base64")

    return payload.p === process.env.ADMIN_PASSWORD && parts[1] === expectedHash
  } catch {
    return false
  }
}

export function extractToken(request: Request): string | null {
  const auth = request.headers.get("authorization")
  if (!auth || !auth.startsWith("Bearer ")) return null
  return auth.slice(7)
}
