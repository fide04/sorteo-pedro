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

export function checkPassword(pw: string) {
  const real = process.env.ADMIN_PASSWORD;
  return !!real && safeEqual(sign(pw), sign(real));
}

export async function startSession() {
  const exp = String(Date.now() + MAX_AGE * 1000);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const [exp, sig] = v.split(".");
  return !!exp && !!sig && safeEqual(sig, sign(exp)) && Number(exp) > Date.now();
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
