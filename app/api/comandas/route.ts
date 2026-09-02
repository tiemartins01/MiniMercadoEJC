import { NextResponse } from "next/server";
import { currentRole } from "@/lib/auth";
import { connectionString, getDb, setup } from "@/lib/db";

export async function GET() {
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
    return NextResponse.json({
      comandas: [],
    });
  }

  const sql = getDb();

  try {
    await setup(sql);

    const comandas = await sql`
      SELECT
        c.id,
        c.pessoa_id,
        c.nome,
        c.tipo,
        c.cor,
        c.status,
        c.valor_total::float AS valor_total,
        c.criado_em,
        c.pago_em,
        COUNT(p.id)::int AS quantidade_pedidos
      FROM venda_comandas c
      LEFT JOIN venda_pedidos p
        ON p.comanda_id = c.id
        AND p.status = 'FINALIZADO'
      WHERE c.status = 'ABERTA'
      GROUP BY c.id
      ORDER BY
        CASE
          WHEN c.tipo = 'ENCONTRISTA' THEN 0
          ELSE 1
        END,
        c.cor NULLS LAST,
        c.nome
    `;

    return NextResponse.json({
      comandas,
    });
  } finally {
    await sql.end();
  }
}
