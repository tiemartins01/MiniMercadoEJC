import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import type { Role } from "@/lib/types";

const COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-ebs_session"
    : "ebs_session";

const SESSION_MAX_AGE_SECONDS =
  60 * 60 * 12;

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure:
    process.env.NODE_ENV === "production",
  path: "/",
};

export function createSessionToken() {
  return crypto
    .randomBytes(32)
    .toString("base64url");
}

// Cria hash do token
export function hashSessionToken(
  token: string,
) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

// Pega informações do usuário que vai/está logado
export async function currentUser() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get(COOKIE)?.value;

  if (!token) {
    return null;
  }

  // Impede cookies grandes ou inválidos.
  if (
    token.length < 40 ||
    token.length > 100
  ) {
    return null;
  }

  const tokenHash =
    hashSessionToken(token);

  const db = getDb();

  // RETORNA USUÁRIO COM SESSÃO ABERTA SEM ESTÁ EXPIRADA, REVOGADA OU INATIVA.
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

  if (
    user.role !== "ADMIN" &&
    user.role !== "OPERADOR"
  ) {
    return null;
  }
// TODAS ESSAS INFORMAÇÕES PORQUE FICA MAIS FÁCIL DE PUXAR EM VÁRIOS LUGARES
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