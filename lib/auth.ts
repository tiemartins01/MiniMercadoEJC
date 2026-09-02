import crypto from "crypto";
import { cookies } from "next/headers";
import type { Role } from "./types";

const COOKIE = "ejc_vendas_session";
const secret = () => process.env.SESSION_SECRET || "troque-esta-chave-em-producao";
function sign(value: string) { return crypto.createHmac("sha256", secret()).update(value).digest("hex"); }
export function makeSession(role: Role) { const payload = `${role}.${Date.now()}`; return `${payload}.${sign(payload)}`; }
export function parseSession(token?: string | null): Role | null {
  if (!token) return null; const [role, ts, sig] = token.split("."); if (!role || !ts || !sig) return null;
  const payload = `${role}.${ts}`; const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Date.now() - Number(ts) > 1000 * 60 * 60 * 18) return null;
  return role === "ADMIN" || role === "OPERADOR" ? role : null;
}
export async function currentRole() { return parseSession((await cookies()).get(COOKIE)?.value); }
export const sessionCookieName = COOKIE;
