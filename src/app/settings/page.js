// src/app/settings/page.js
"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { TrackingProvider } from "@/components/providers/TrackingProvider";
import SettingsShell from "@/components/settings/SettingsShell";
import AccountSection       from "@/components/settings/AccountSection";
import PlanSection          from "@/components/settings/PlanSection";
import NotificationsSection from "@/components/settings/NotificationsSection";
import SupportSection       from "@/components/settings/SupportSection";
import PrivacySection       from "@/components/settings/PrivacySection";
import RouteSkeleton from "@/components/shared/RouteSkeleton";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const VALID_SECTIONS = ["account", "plan", "notifications", "support", "privacy"];

function SettingsInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user }     = useDashboard();
  const [token,   setToken]   = useState(null);
  const [section, setSection] = useState(() => {
    const p = searchParams.get("section");
    return VALID_SECTIONS.includes(p) ? p : "account";
  });

  // Auth guard + token
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setToken(session.access_token);
    });
  }, [router]);

  // Sync section with URL param changes
  useEffect(() => {
    const p = searchParams.get("section");
    if (VALID_SECTIONS.includes(p)) setSection(p);
  }, [searchParams]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!token) return <RouteSkeleton sidebar />;

  return (
    <SettingsShell active={section} onNav={setSection} onSignOut={handleSignOut}>
      {section === "account"       && <AccountSection       user={user} />}
      {section === "plan"          && <PlanSection          user={user} />}
      {section === "notifications" && <NotificationsSection />}
      {section === "support"       && <SupportSection       token={token} />}
      {section === "privacy"       && <PrivacySection       token={token} onDeleted={handleSignOut} />}
    </SettingsShell>
  );
}

export default function SettingsPage() {
  return (
    <TrackingProvider surface="settings">
      <DashboardProvider>
        <Suspense fallback={<RouteSkeleton sidebar />}>
          <SettingsInner />
        </Suspense>
      </DashboardProvider>
    </TrackingProvider>
  );
}
