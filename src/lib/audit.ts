import "server-only";
import { db } from "./supabase";
import { currentAdmin } from "./session";

/** Registra en la bitácora quién hizo qué en el panel. Nunca rompe la acción si falla. */
export async function logAdmin(action: string, detail?: string, who?: string) {
  try {
    const admin = who ?? (await currentAdmin()) ?? "desconocido";
    await db().from("admin_log").insert({ admin, action, detail: detail?.slice(0, 300) ?? null });
  } catch {}
}
