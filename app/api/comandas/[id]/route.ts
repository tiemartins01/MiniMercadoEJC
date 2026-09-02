import { NextResponse } from "next/server";
import { currentRole } from "@/lib/auth";
import { connectionString, getDb, setup } from "@/lib/db";

export async function GET(
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

    const [comanda] = await sql`
      SELECT
        id,
        pessoa_id,
        nome,
        tipo,
        cor,
        status,
        valor_total::float AS valor_total,
        criado_em,
        pago_em
      FROM venda_comandas
      WHERE id = ${comandaId}
    `;

    if (!comanda) {
      return NextResponse.json(
        {
          error: "Comanda não encontrada",
        },
        {
          status: 404,
        },
      );
    }

    const pedidos = await sql`
      SELECT
        id,
        valor_bruto::float AS valor_bruto,
        valor_retornado::float AS valor_retornado,
        valor_liquido::float AS valor_liquido,
        criado_em
      FROM venda_pedidos
      WHERE comanda_id = ${comandaId}
        AND status = 'FINALIZADO'
      ORDER BY criado_em
    `;

    const itens = await sql`
      SELECT
        i.id,
        i.pedido_id,
        i.produto_id,
        i.produto_nome,
        i.quantidade,
        i.preco_unitario::float AS preco_unitario,
        i.valor_total::float AS valor_total
      FROM venda_pedido_itens i
      INNER JOIN venda_pedidos p
        ON p.id = i.pedido_id
      WHERE p.comanda_id = ${comandaId}
        AND p.status = 'FINALIZADO'
      ORDER BY
        p.criado_em,
        i.id
    `;

    return NextResponse.json({
      comanda,
      pedidos,
      itens,
    });
  } finally {
    await sql.end();
  }
}
