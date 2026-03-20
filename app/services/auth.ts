import { supabase } from '../lib/supabase';

/** Returns the current Supabase session, or null. */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Fetches the full user profile from the `users` table. */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return { data, error };
}

/** Fetches a lightweight admin/referee profile (role, full_name, email). */
export async function getRoleProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("role, full_name, email")
    .eq("id", userId)
    .single();
  return { data, error };
}

/** Signs in with email + password. */
export async function login(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

/** Signs up with email + password + metadata (full_name, department). */
export async function signup(
  email: string,
  password: string,
  meta: { full_name: string; department: string }
) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: meta },
  });
  return { error };
}

/** Signs the current user out. */
export async function logout() {
  await supabase.auth.signOut();
}
