import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ ADD MEMORY
export async function addMemory(userId, key, value) {
  if (!userId || !key || !value) {
    console.warn("addMemory skipped: missing fields");
    return null;
  }

  const { data, error } = await supabase
    .from("user_memory")
    .upsert(
      {
        user_id: userId,
        key,
        value,
        weight: 1,
        last_updated: new Date().toISOString(),
      },
      {
        onConflict: "user_id,key,value",
      }
    )
    .select();

  if (error) {
    console.error("Memory insert error:", error);
    return null;
  }

  return data;
}

// ✅ GET MEMORY
export async function getMemory(userId) {
  if (!userId) {
    console.warn("getMemory skipped: no userId");
    return [];
  }

  const { data, error } = await supabase
    .from("user_memory")
    .select("*")
    .eq("user_id", userId)
    .order("weight", { ascending: false });

  if (error) {
    console.error("Memory fetch error:", error);
    return [];
  }

  return data || [];
}

// ✅ BOOST MEMORY
export async function boostMemory(userId, key, value) {
  if (!userId || !key || !value) {
    console.warn("boostMemory skipped: missing fields");
    return null;
  }

  const { error } = await supabase.rpc("increment_memory_weight", {
    uid: userId,
    k: key,
    v: value,
  });

  if (error) {
    console.error("Memory boost error:", error);
    return null;
  }

  return true;
}