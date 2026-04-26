/**
 * persistCards — write generated cards to Supabase.
 *
 * Idempotent: deletes existing cards for the document before reinserting.
 * Safe to re-run after a failed extraction retry.
 *
 * @param {Object} opts
 * @param {Object} opts.supabase       — service-role client
 * @param {string} opts.userId
 * @param {string} opts.documentId
 * @param {Array}  opts.cards          — from generateCards (temp concept_ids)
 * @param {Map}    opts.tempToRealId   — LLM temp id → Supabase UUID (from persistGraph)
 * @returns {Promise<{ inserted: number }>}
 */
export async function persistCards({ supabase, userId, documentId, cards, tempToRealId }) {
  if (!cards?.length) return { inserted: 0 };

  // Delete stale cards so re-run doesn't accumulate duplicates
  await supabase.from("cards").delete().eq("document_id", documentId);

  const rows = cards
    .map(({ concept_id, ...rest }) => {
      const realId = tempToRealId?.get(concept_id) ?? concept_id;
      if (!realId) return null;
      return { user_id: userId, concept_id: realId, document_id: documentId, ...rest };
    })
    .filter(Boolean);

  if (!rows.length) return { inserted: 0 };

  const { data, error } = await supabase.from("cards").insert(rows).select("id");
  if (error) throw error;

  return { inserted: data?.length ?? 0 };
}
