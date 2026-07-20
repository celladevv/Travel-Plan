// Optional cloud backup (Phase B1): Supabase auth + one synced copy of the
// trip per user. The app is local-first — this module only activates when
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set; without them every
// cloud surface stays hidden and the app is exactly the no-backend PWA.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const cloudEnabled = Boolean(url && key);
const supabase = cloudEnabled ? createClient(url, key) : null;

// Passwordless: user gets an email link, no password ever exists.
export async function sendMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// cb(user | null) now and on every auth change; returns unsubscribe.
export function onAuth(cb) {
  supabase.auth.getSession().then(({ data }) => cb(data.session?.user ?? null));
  const { data } = supabase.auth.onAuthStateChange((_event, session) =>
    cb(session?.user ?? null)
  );
  return () => data.subscription.unsubscribe();
}

// One trip per user for now (owner_id is the primary key). Sharing in
// Phase B2 turns this into trips + trip_members.
export async function pushTrip(userId, trip, updatedAt) {
  const { error } = await supabase.from("trips").upsert({
    owner_id: userId,
    data: trip,
    updated_at: updatedAt || new Date().toISOString(),
  });
  if (error) throw error;
}

export async function pullTrip(userId) {
  const { data, error } = await supabase
    .from("trips")
    .select("data, updated_at")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data; // null if no cloud copy yet
}
