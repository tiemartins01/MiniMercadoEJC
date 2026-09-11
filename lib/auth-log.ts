import crypto from "crypto";

import { getDb } from "@/lib/db";

// ADICIONA OS EVENTOS

export type EventoAuth =
  | "LOGIN_SUCESSO"
  | "LOGIN_FALHA"
  | "LOGIN_BLOQUEADO"
  | "LOGOUT"
  | "SESSOES_REVOGADAS";

function getLogSecret() {
  const secret = process.env.AUTH_LOG_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "ebs-dev-auth-log-secret";
  }

  throw new Error(
    "AUTH_LOG_SECRET não configurada em produção.",
  );
}

// Transforma infomração em hash.

function hashDado(valor: string) {
  return crypto
    .createHmac("sha256", getLogSecret())
    .update(valor)
    .digest("hex");
}

type RegistrarLogAuthParams = {
  evento: EventoAuth;
  usuarioId?: number | null;
  ip?: string | null;
  login?: string | null;
};

export async function registrarLogAuth({
  evento,
  usuarioId = null,
  ip = null,
  login = null,
}: RegistrarLogAuthParams) {
  const db = getDb();

  const ipHash = ip
    ? hashDado(ip)
    : null;

  const loginHash = login
    ? hashDado(login.toLowerCase())
    : null;
// Inserindo registro de sessão
  await db`
    INSERT INTO logs_autenticacao (
      usuario_id,
      evento,
      ip_hash,
      login_hash
    )
    VALUES (
      ${usuarioId},
      ${evento},
      ${ipHash},
      ${loginHash}
    )
  `;
}