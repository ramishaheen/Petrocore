import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge middleware uses the edge-safe config; the `authorized` callback gates routes.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};
