import type { Route } from "./+types/home";
import { redirect } from "react-router";
import { supabase } from "../lib/supabase";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "FestFlow | University Event Management" },
    { name: "description", content: "University Event Management System" },
  ];
}

export async function clientLoader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return redirect("/tournaments");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (profile?.role === 'admin') {
    return redirect("/admin/dashboard");
  }
  if (profile?.role === 'event_manager') {
    return redirect("/event-manager");
  }
  return redirect("/dashboard");
}

export default function Home() {
  return null;
}
