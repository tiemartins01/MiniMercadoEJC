import crypto from "crypto";
import { cookies } from "next/headers";

import { getDb } from "@/lib/db";
import type { Role } from "@/lib/types";

const COOKIE = "ebs_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function currentUser() {
  const cookieStore = await cookies();

  const token = cookieStore.get(COOKIE)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);

  const db = getDb();

  const rows = await db`
    SELECT
      u.id,
      u.nome,
      u.login,
      u.role
    FROM sessoes s
    INNER JOIN usuarios u
      ON u.id = s.usuario_id
    WHERE s.token_hash = ${tokenHash}
      AND s.revogado_em IS NULL
      AND s.expira_em > NOW()
      AND u.ativo = TRUE
    LIMIT 1
  `;

  const user = rows[0];

  if (!user) {
    return null;
  }

  return {
    id: Number(user.id),
    nome: String(user.nome),
    login: String(user.login),
    role: user.role as Role,
  };
}

export async function currentRole() {
  const user = await currentUser();

  return user?.role ?? null;
}

export const sessionCookieName = COOKIE;

export const sessionMaxAgeSeconds =
  SESSION_MAX_AGE_SECONDS;