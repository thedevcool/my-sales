import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as unknown as Record<string, string> | undefined)?.role
  if (!session?.user || role !== "admin") return null
  return session
}

function slugifyUsername(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "")
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const reps = await prisma.user.findMany({
    where: { role: "rep" },
    include: { _count: { select: { sales: true } } },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(
    reps.map((r) => ({
      id: r.id,
      name: r.name,
      username: r.username,
      isActive: r.isActive,
      saleCount: r._count.sales,
    }))
  )
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const name = (body.name || "").trim()
  const password = body.password || ""
  let username = slugifyUsername(body.username || name)

  if (!name || !password) {
    return NextResponse.json({ error: "Name and password are required" }, { status: 400 })
  }
  if (!username) {
    return NextResponse.json({ error: "A valid username is required" }, { status: 400 })
  }
  if (password.length < 4) {
    return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 })
  }

  // Ensure the username is unique, appending a number if needed.
  const base = username
  let suffix = 1
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}${suffix++}`
  }

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, username, password: hashed, role: "rep" },
  })

  return NextResponse.json({ id: user.id, name: user.name, username: user.username })
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: "Missing staff id" }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)
  if (body.password) {
    if (String(body.password).length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 })
    }
    data.password = await bcrypt.hash(String(body.password), 12)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  await prisma.user.update({ where: { id }, data })
  return NextResponse.json({ success: true })
}
