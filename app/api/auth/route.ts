import { generateToken, validateToken } from "@/lib/auth"

export async function POST(request: Request) {
  const body = await request.json()
  const { password } = body

  if (!password) {
    return Response.json({ error: "Password is required" }, { status: 400 })
  }

  const token = generateToken(password)

  if (!token) {
    return Response.json({ error: "Invalid password" }, { status: 401 })
  }

  return Response.json({ token })
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization")
  if (!auth || !auth.startsWith("Bearer ")) {
    return Response.json({ valid: false }, { status: 401 })
  }

  const valid = validateToken(auth.slice(7))
  return Response.json({ valid })
}
