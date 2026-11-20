import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";

const COOKIE = "tc_admin";
const MAX_AGE = 60 * 60 * 12; // 12 h

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET debe tener al menos 16 caracteres");
  return s;
}
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");

function safeEqual(a: string, b: string) {
  const A = Buffer.from(a), B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

// ---------- Cuentas del panel ----------
// ADMIN_ACCOUNTS en Vercel, máximo 2 personas, una por línea o separadas por ";":
//   pedro:una-clave-larga;maria:otra-clave-larga
// (Compatibilidad: si no existe, se usa ADMIN_PASSWORD con el usuario "admin".)
const MAX_ADMINS = 2;

export function adminAccounts(): { user: string; pass: string }[] {
  const raw = process.env.ADMIN_ACCOUNTS?.trim();
  const list = raw
    ? raw
        .split(/[;\n]+/)
        .map((e) => e.trim())
        .filter(Boolean)
        .map((e) => {
          const k = e.indexOf(":");
          return { user: e.slice(0, k).trim().toLowerCase(), pass: e.slice(k + 1).trim() };
        })
        .filter((a) => /^[a-z0-9._-]{2,30}$/.test(a.user) && a.pass.length >= 8)
    : process.env.ADMIN_PASSWORD
      ? [{ user: "admin", pass: process.env.ADMIN_PASSWORD }]
      : [];
  return list.slice(0, MAX_ADMINS);
}

/** Devuelve el usuario si la combinación es correcta. Compara siempre todas las cuentas (sin atajos de tiempo). */
export function checkLogin(user: string, pass: string): string | null {
  const u = user.trim().toLowerCase();
  let found: string | null = null;
  for (const a of adminAccounts()) {
    const okUser = safeEqual(sign("u:" + u), sign("u:" + a.user));
    const okPass = safeEqual(sign("p:" + pass), sign("p:" + a.pass));
    if (okUser && okPass) found = a.user;
  }
  return found;
}

// La firma incluye la clave de esa persona: si cambias su clave, sus sesiones abiertas caducan.
function adminSign(user: string, exp: string) {
  const acc = adminAccounts().find((a) => a.user === user);
  return acc ? sign(`admin:${user}:${exp}:${acc.pass}`) : null;
}

export async function startSession(user: string) {
  const exp = String(Date.now() + MAX_AGE * 1000);
  (await cookies()).set(COOKIE, `${user}.${exp}.${adminSign(user, exp)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/admin", maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
}

/** Usuario del panel con sesión válida, o null. */
export async function currentAdmin(): Promise<string | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return null;
  const [user, exp, sig] = v.split(".");
  if (!user || !exp || !sig || Number(exp) <= Date.now()) return null;
  const expected = adminSign(user, exp);
  return expected && safeEqual(sig, expected) ? user : null;
}

export async function isAdmin() {
  return (await currentAdmin()) !== null;
}

/** Úsalo al inicio de cada página o acción del panel. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

// ---------- Sesión del participante (cookie firmada con su id) ----------
const PCOOKIE = "tc_p";

export async function setParticipant(id: string) {
  (await cookies()).set(PCOOKIE, `${id}.${sign("p:" + id)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60,
  });
}

export async function getParticipantId() {
  const v = (await cookies()).get(PCOOKIE)?.value;
  if (!v) return null;
  const i = v.lastIndexOf(".");
  const id = v.slice(0, i), sig = v.slice(i + 1);
  return id && sig && safeEqual(sig, sign("p:" + id)) ? id : null;
}

export async function clearParticipant() {
  (await cookies()).delete(PCOOKIE);
}
