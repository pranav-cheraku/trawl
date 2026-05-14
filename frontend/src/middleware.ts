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
