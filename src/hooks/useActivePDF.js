// src/hooks/useActivePDF.js
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Returns { activePdf, setActivePdfId, loading }
// activePdf: { id, name } | null
export function useActivePDF(userId) {
  const [activePdf, setActivePdf] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from("profiles")
      .select("active_pdf_id")
      .eq("id", userId)
      .single()
      .then(async ({ data }) => {
        if (data?.active_pdf_id) {
          const { data: pdf } = await supabase
            .from("pdfs_metadata")
            .select("id, name")
            .eq("id", data.active_pdf_id)
            .single();
          setActivePdf(pdf || null);
        }
        setLoading(false);
      });
  }, [userId]);

  async function setActivePdfId(pdfId) {
    if (!userId) return;
    await supabase
      .from("profiles")
      .update({ active_pdf_id: pdfId })
      .eq("id", userId);
    if (pdfId) {
      const { data: pdf } = await supabase
        .from("pdfs_metadata")
        .select("id, name")
        .eq("id", pdfId)
        .single();
      setActivePdf(pdf || null);
    } else {
      setActivePdf(null);
    }
  }

  return { activePdf, setActivePdfId, loading };
}
