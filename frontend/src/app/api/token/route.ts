import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// The session cookie value IS a plain HS256 JWS (see the custom jwt.encode in
// lib/auth.ts) which the FastAPI backend verifies directly. We read the cookie
// by name rather than calling getToken(): behind Vercel's proxy, getToken()'s
// secure-cookie auto-detection looks for the bare cookie name and never finds
// the __Secure- prefixed production cookie, so it returns null. Production
// (HTTPS) uses __Secure-authjs.session-token; local dev (HTTP) uses the bare
// authjs.session-token.
export async function GET(): Promise<NextResponse> {
  const cookieStore = cookies();
  const token =
    cookieStore.get("__Secure-authjs.session-token")?.value ??
    cookieStore.get("authjs.session-token")?.value ??
    null;

  if (!token) {
    return NextResponse.json({ token: null }, { status: 401 });
  }
  return NextResponse.json({ token });
}
