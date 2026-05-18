// Extends the NextAuth Session type to include the DB user id field
// injected by the jwt callback in lib/auth.ts.
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
    };
  }
}
