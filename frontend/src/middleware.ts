// Runs the Auth.js authorized() callback on every matched route. The matcher
// must stay in sync with the protected paths listed in lib/auth.ts.
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/project/:path*",
    "/billing",
    "/billing/:path*",
    "/profile",
    "/profile/:path*",
  ],
};
