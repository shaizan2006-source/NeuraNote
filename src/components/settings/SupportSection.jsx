// src/components/settings/SupportSection.jsx
"use client";
import { useState } from "react";
import { SettingsCard, SettingsGroup } from "./SettingsShell";
import TicketForm from "@/components/support/TicketForm";
import TicketList from "@/components/support/TicketList";
import { FLAGS } from "@/lib/featureFlags";

export default function SupportSection({ token, user }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px", color: "var(--text-primary)" }}>Support</h1>

      {FLAGS.SUPPORT && (
        <>
          <SettingsGroup label="Contact us">
            <SettingsCard>
              <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>We&apos;re here to help</p>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-tertiary)" }}>
                Common questions are answered on the{" "}
                <a href="/support" style={{ color: "var(--accent)", textDecoration: "none" }}>support page</a>.
              </p>
              <TicketForm token={token} userId={user?.id} onSubmitted={() => setRefreshKey(k => k + 1)} />
            </SettingsCard>
          </SettingsGroup>

          <SettingsGroup label="Your requests">
            <SettingsCard>
              <TicketList token={token} refreshKey={refreshKey} />
            </SettingsCard>
          </SettingsGroup>
        </>
      )}

      <SettingsGroup label="App info">
        <SettingsCard>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-secondary)" }}>
            Version <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}</span>
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>Ask My Notes — built for focused students.</p>
        </SettingsCard>
      </SettingsGroup>
    </div>
  );
}
