// src/app/support/page.js
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { FLAGS } from "@/lib/featureFlags";
import FaqList from "@/components/support/FaqList";
import TicketForm from "@/components/support/TicketForm";
import TicketList from "@/components/support/TicketList";
import RouteSkeleton from "@/components/shared/RouteSkeleton";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

function SectionLabel({ children }) {
  return (
    <p style={{
      margin: "0 0 12px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)",
      textTransform: "uppercase", letterSpacing: "0.08em",
    }}>
      {children}
    </p>
  );
}

export default function SupportPage() {
  const router = useRouter();
  const [token,      setToken]      = useState(null);
  const [userId,     setUserId]     = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!FLAGS.SUPPORT) { router.push("/dashboard"); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setToken(session.access_token);
      setUserId(session.user.id);
    });
  }, [router]);

  if (!FLAGS.SUPPORT) return null;
  if (!token) return <RouteSkeleton />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 20, fontFamily: "inherit" }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary)" }}>Support</h1>
        <p style={{ margin: "0 0 32px", fontSize: 14, color: "var(--text-tertiary)" }}>
          Answers to common questions — and a direct line to us when they don&apos;t cover it.
        </p>

        <section style={{ marginBottom: 36 }}>
          <SectionLabel>Frequently asked</SectionLabel>
          <FaqList />
        </section>

        <section style={{ marginBottom: 36 }}>
          <SectionLabel>Still stuck? Contact us</SectionLabel>
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)", borderRadius: 14, padding: 20 }}>
            <TicketForm token={token} userId={userId} onSubmitted={() => setRefreshKey(k => k + 1)} />
          </div>
        </section>

        <section>
          <SectionLabel>Your requests</SectionLabel>
          <TicketList token={token} refreshKey={refreshKey} />
        </section>
      </div>
    </div>
  );
}
