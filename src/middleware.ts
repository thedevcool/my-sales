import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

function getRole(user: unknown): string {
  return (user as Record<string, string>).role
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // First-run setup is public — the owner has no account yet.
  if (pathname === "/setup") {
    return NextResponse.next()
  }

  if (pathname === "/login") {
    if (session?.user) {
      const role = getRole(session.user)
      return NextResponse.redirect(
        new URL(role === "admin" ? "/admin/dashboard" : "/rep/pos", req.url)
      )
    }
    return NextResponse.next()
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const role = getRole(session.user)

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/rep/pos", req.url))
  }

  if (pathname.startsWith("/rep") && role !== "rep") {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
