"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const STATUS_LABELS = {
  uploading: "Uploadingâ€¦",
  parsing: "Reading PDFâ€¦",
  embedding: "Building embeddingsâ€¦",
  extracting_concepts: "Extracting conceptsâ€¦",
  ready: "Ready",
  failed: "Failed",
};

export function useDocumentProgress(documentId) {
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!documentId) return;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const channel = supabase
      .channel(`doc-progress:${documentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "documents",
          filter: `id=eq.${documentId}`,
        },
        (payload) => {
          const { processing_status, processing_progress, processing_error } = payload.new;
          setStatus(processing_status);
          setProgress(processing_progress ?? 0);
          if (processing_error) setError(processing_error);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId]);

  return {
    status,
    progress,
    error,
    label: STATUS_LABELS[status] ?? status,
    isReady: status === "ready",
    isFailed: status === "failed",
  };
}
