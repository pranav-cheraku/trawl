import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { SignJWT, jwtVerify } from "jose";
import type { JWT } from "@auth/core/jwt";

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production"
);
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const secretString =
  process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: secretString,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  jwt: {
    // Produce plain HS256 JWS so the FastAPI backend (python-jose) can validate it.
    // Auth.js v5 defaults to JWE (A256CBC-HS512) which python-jose cannot verify.
    async encode({ token }) {
      const payload = token ?? {};
      return new SignJWT({ ...payload } as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secret);
    },
    async decode({ token }): Promise<JWT | null> {
      if (!token) return null;
      try {
        const { payload } = await jwtVerify(token, secret, {
          algorithms: ["HS256"],
        });
        return payload as JWT;
      } catch {
        return null;
      }
    },
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // On initial sign-in: sync the user to the backend DB and capture the DB UUID.
      if (account && user) {
        try {
          const res = await fetch(`${API_BASE}/api/auth/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Auth-Secret":
                process.env.NEXTAUTH_SECRET ||
                "dev-secret-change-in-production",
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              avatarUrl: user.image,
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as { id: string };
            token.sub = data.id; // DB UUID replaces the Google-provided sub
          }
        } catch {
          // Backend unreachable — keep the Google-provided sub; sync on next sign-in
        }
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.email) session.user.email = token.email as string;
      if (token.name) session.user.name = token.name as string;
      if (token.picture) session.user.image = token.picture as string;
      return session;
    },
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const isProtected =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/project");
      if (isProtected && !isLoggedIn) {
        return Response.redirect(new URL("/", nextUrl));
      }
      return true;
    },
  },
  pages: {
    signIn: "/", // Redirect unauthenticated users to the landing page
  },
});
