import { NextResponse } from "next/server";
import { currentRole } from "@/lib/auth";
import { connectionString, getDb, setup } from "@/lib/db";

export async function POST(
  _req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  if (!(await currentRole())) {
    return NextResponse.json(
      {
        error: "Não autorizado",
      },
      {
        status: 401,
      },
    );
  }

  if (!connectionString()) {
    return NextResponse.json(
      {
        error: "Banco não configurado",
      },
      {
        status: 503,
      },
    );
  }

  const { id } = await context.params;
  const comandaId = Number(id);

  if (!Number.isInteger(comandaId) || comandaId <= 0) {
    return NextResponse.json(
      {
        error: "Comanda inválida",
      },
      {
        status: 400,
      },
    );
  }

  const sql = getDb();

  try {
    await setup(sql);

    const result = await sql.begin(async (tx) => {
      const [comanda] = await tx`
        SELECT
          id,
          status,
          valor_total::float AS valor_total
        FROM venda_comandas
        WHERE id = ${comandaId}
        FOR UPDATE
      `;

      if (!comanda) {
        throw new Error("Comanda não encontrada.");
      }

      if (comanda.status === "PAGA") {
        throw new Error("Essa comanda já foi paga.");
      }

      await tx`
        UPDATE venda_comandas
        SET
          status = 'PAGA',
          pago_em = NOW()
        WHERE id = ${comandaId}
      `;

      await tx`
        UPDATE venda_pedidos
        SET pago_em = NOW()
        WHERE comanda_id = ${comandaId}
          AND pago_em IS NULL
      `;

      return {
        comandaId,
        total: Number(comanda.valor_total),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao pagar comanda",
      },
      {
        status: 400,
      },
    );
  } finally {
    await sql.end();
  }
}
