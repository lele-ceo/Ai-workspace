import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/github/session";

export const runtime = "nodejs";

/**
 * GET /api/auth/signout
 * Clears the session cookie and redirects to the home page.
 */
export function GET() {
  const response = NextResponse.redirect(
    new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  );
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
