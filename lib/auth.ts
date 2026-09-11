import crypto from "crypto";
import { cookies } from "next/headers";
import type { Role } from "./types";

const COOKIE = "ebs_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 18;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;


function secret(){
    const value = process.env.SESSION_SECRET;

    if(value){
        return value;
    }

    if(process.env.NODE_ENV !== "production"){
        return "ebs-dev-only-session-secret-change-me"
    }

    throw new Error("SESSION_SECRET não configurada em produção.");
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", secret())
    .update(value)
    .digest("hex");
}


export function makeSession(role: Role) {
  const payload = `${role}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function parseSession(token?: string | null): Role | null {
  if (!token) return null;

  const [role, ts, sig] = token.split(".");
  if (!role || !ts || !sig) return null;

  const timestamp = Number(ts);
  if (!Number.isFinite(timestamp)) return null;

  const payload = `${role}.${ts}`;
  const expected = sign(payload);

  if (sig.length !== expected.length) return null;

  if (
    !crypto.timingSafeEqual(
      Buffer.from(sig, "utf8"),
      Buffer.from(expected, "utf8"),
    )
  ) {
    return null;
  }

  if (Date.now() - timestamp > SESSION_MAX_AGE_MS) {
    return null;
  }

  return role === "ADMIN" || role === "OPERADOR" ? role : null;
}

export async function currentRole() {
  const cookieStore = await cookies();
  return parseSession(cookieStore.get(COOKIE)?.value);
}

export const sessionCookieName = COOKIE;
export const sessionMaxAgeSeconds = SESSION_MAX_AGE_SECONDS;