import { NextResponse } from "next/server";

import { currentRole } from "@/lib/auth";
import {
  connectionString,
  getDb,
  setup,
} from "@/lib/db";

export async function GET() {
  const role = await currentRole();

  if (!role) {
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
      vendidos: 0,
      totalItens: 0,
      estoque: 0,
      valor: 0,
      pedidos: 0,
    });
  }

  const sql = getDb();

  try {
    await setup(sql);

    const [x] = await sql`
      SELECT
        COALESCE(
          (
            SELECT SUM(quantidade)
            FROM venda_pedido_itens
          ),
          0
        )::int vendidos,

        COALESCE(
          (
            SELECT SUM(estoque)
            FROM venda_produtos
            WHERE ativo
          ),
          0
        )::int estoque,

        COALESCE(
          (
            SELECT SUM(estoque)
            FROM venda_produtos
            WHERE ativo
          ),
          0
        )::int
        +
        COALESCE(
          (
            SELECT SUM(quantidade)
            FROM venda_pedido_itens
          ),
          0
        )::int total_itens,

        COALESCE(
          (
            SELECT SUM(valor_liquido)
            FROM venda_pedidos
            WHERE status = 'FINALIZADO'
          ),
          0
        )::float valor,

        COALESCE(
          (
            SELECT COUNT(*)
            FROM venda_pedidos
            WHERE status = 'FINALIZADO'
          ),
          0
        )::int pedidos
    `;

    return NextResponse.json({
      ...x,
      valor: role === "ADMIN"
        ? x.valor
        : null,
    });
  } finally {
    await sql.end();
  }
}