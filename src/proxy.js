import { NextResponse } from "next/server";

// Auth is enforced client-side in DashboardContext (redirects to /login if no session).
// This proxy only handles the /login redirect param — no cookie-based blocking
// since @supabase/supabase-js uses localStorage, not cookies.
export function proxy(_request) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/chat/:path*"],
};
