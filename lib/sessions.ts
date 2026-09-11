import { getDb } from "@/lib/db";

import { registrarLogAuth } from "@/lib/auth-log";

export async function limparSessoesAntigas() {
  const db = getDb();

  await db`
    DELETE FROM sessoes
    WHERE expira_em < NOW()
       OR (
         revogado_em IS NOT NULL
         AND revogado_em < NOW() - INTERVAL '7 days'
       )
  `;
}

export async function revogarTodasSessoesDoUsuario(
  usuarioId: number,
) {
  const db = getDb();

  await db`
    UPDATE sessoes
    SET revogado_em = NOW()
    WHERE usuario_id = ${usuarioId}
      AND revogado_em IS NULL
  `;

  await registrarLogAuth({
    evento: "SESSOES_REVOGADAS",
    usuarioId,
  });
}