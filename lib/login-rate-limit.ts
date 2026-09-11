import crypto from "crypto";

import { getDb } from "@/lib/db";

const LIMITE_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;

function criarChave(
  ip: string,
  login: string,
) {
  return crypto
    .createHash("sha256")
    .update(`${ip}:${login.toLowerCase()}`)
    .digest("hex");
}

export async function verificarBloqueio(
  ip: string,
  login: string,
) {
  const db = getDb();

  const chave = criarChave(
    ip,
    login,
  );

  const rows = await db`
    SELECT
      bloqueado_ate
    FROM tentativas_login
    WHERE chave = ${chave}
    LIMIT 1
  `;

  const tentativa = rows[0];

  if (!tentativa?.bloqueado_ate) {
    return {
      bloqueado: false,
    };
  }

  const bloqueadoAte =
    new Date(tentativa.bloqueado_ate);

  return {
    bloqueado:
      bloqueadoAte.getTime() >
      Date.now(),
  };
}

export async function registrarFalhaLogin(
  ip: string,
  login: string,
) {
  const db = getDb();

  const chave = criarChave(
    ip,
    login,
  );

  await db`
    INSERT INTO tentativas_login (
      chave,
      quantidade,
      janela_inicio,
      bloqueado_ate,
      atualizado_em
    )
    VALUES (
      ${chave},
      1,
      NOW(),
      NULL,
      NOW()
    )

    ON CONFLICT (chave)

    DO UPDATE SET

      quantidade =
        CASE
          WHEN
            tentativas_login.janela_inicio
              < NOW() - INTERVAL '15 minutes'
          THEN 1

          ELSE
            tentativas_login.quantidade + 1
        END,

      janela_inicio =
        CASE
          WHEN
            tentativas_login.janela_inicio
              < NOW() - INTERVAL '15 minutes'
          THEN NOW()

          ELSE
            tentativas_login.janela_inicio
        END,

      bloqueado_ate =
        CASE
          WHEN
            tentativas_login.janela_inicio
              < NOW() - INTERVAL '15 minutes'
          THEN NULL

          WHEN
            tentativas_login.quantidade + 1
              >= ${LIMITE_TENTATIVAS}
          THEN
            NOW()
              + (${BLOQUEIO_MINUTOS} * INTERVAL '1 minute')

          ELSE
            tentativas_login.bloqueado_ate
        END,

      atualizado_em = NOW()
  `;
}

export async function limparTentativasLogin(
  ip: string,
  login: string,
) {
  const db = getDb();

  const chave = criarChave(
    ip,
    login,
  );

  await db`
    DELETE FROM tentativas_login
    WHERE chave = ${chave}
  `;
}