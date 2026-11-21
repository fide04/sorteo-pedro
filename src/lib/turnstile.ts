import "server-only";

/** Verifica el token de Cloudflare Turnstile. Si no hay clave configurada, no bloquea (queda apagado). */
export async function verifyTurnstile(token: FormDataEntryValue | null, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!r.ok) return true; // si Cloudflare falla, no dejamos a la gente sin registrarse (los otros límites siguen activos)
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return true;
  }
}
