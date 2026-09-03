import { NextResponse } from "next/server";

import { currentRole } from "@/lib/auth";
import {
  connectionString,
  getDb,
  setup,
} from "@/lib/db";

export async function POST(req: Request) {
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

  const b = await req.json();
  const sql = getDb();

  try {
    await setup(sql);

    if (b.tipo === "NOVO_ITEM") {
      const [p] = await sql`
        INSERT INTO venda_produtos (
          nome,
          descricao,
          preco,
          estoque,
          ativo
        )
        VALUES (
          ${b.nome},
          ${b.descricao || ""},
          ${Number(b.preco)},
          ${Number(b.quantidade)},
          TRUE
        )
        RETURNING id
      `;

      await sql`
        INSERT INTO venda_movimentacoes (
          produto_id,
          tipo,
          quantidade,
          observacao
        )
        VALUES (
          ${p.id},
          'NOVO_ITEM',
          ${Number(b.quantidade)},
          'Cadastro de novo item'
        )
      `;

      return NextResponse.json({
        ok: true,
        id: p.id,
      });
    }

    if (b.tipo === "REPOSICAO") {
      const qtd = Number(b.quantidade);

      if (qtd <= 0) {
        throw new Error("Quantidade inválida");
      }

      await sql`
        UPDATE venda_produtos
        SET
          estoque = estoque + ${qtd},
          ativo = TRUE,
          atualizado_em = NOW()
        WHERE id = ${Number(b.produtoId)}
      `;

      await sql`
        INSERT INTO venda_movimentacoes (
          produto_id,
          tipo,
          quantidade,
          observacao
        )
        VALUES (
          ${Number(b.produtoId)},
          'REPOSICAO',
          ${qtd},
          ${b.observacao || null}
        )
      `;

      return NextResponse.json({
        ok: true,
      });
    }

    if (b.tipo === "RETORNO") {
      const qtd = Number(b.quantidade);
      const pedidoId = Number(b.pedidoId);
      const produtoId = Number(b.produtoId);

      if (qtd <= 0) {
        throw new Error("Quantidade inválida");
      }

      await sql.begin(async (tx) => {
        const [item] = await tx`
          SELECT
            COALESCE(SUM(quantidade), 0)::int vendida,
            MAX(preco_unitario)::float preco
          FROM venda_pedido_itens
          WHERE
            pedido_id = ${pedidoId}
            AND produto_id = ${produtoId}
        `;

        const [ret] = await tx`
          SELECT
            COALESCE(SUM(quantidade), 0)::int retornada
          FROM venda_movimentacoes
          WHERE
            pedido_id = ${pedidoId}
            AND produto_id = ${produtoId}
            AND tipo = 'RETORNO'
        `;

        if (
          !item?.vendida ||
          item.vendida - ret.retornada < qtd
        ) {
          throw new Error(
            "Retorno maior que a quantidade vendida",
          );
        }

        const valor = item.preco * qtd;

        await tx`
          UPDATE venda_produtos
          SET
            estoque = estoque + ${qtd},
            ativo = TRUE,
            atualizado_em = NOW()
          WHERE id = ${produtoId}
        `;

        await tx`
          INSERT INTO venda_movimentacoes (
            produto_id,
            pedido_id,
            tipo,
            quantidade,
            valor,
            observacao
          )
          VALUES (
            ${produtoId},
            ${pedidoId},
            'RETORNO',
            ${qtd},
            ${-valor},
            ${b.observacao || null}
          )
        `;

        await tx`
          UPDATE venda_pedidos
          SET
            valor_retornado = valor_retornado + ${valor},
            valor_liquido = valor_liquido - ${valor}
          WHERE id = ${pedidoId}
        `;
      });

      return NextResponse.json({
        ok: true,
      });
    }

    return NextResponse.json(
      {
        error: "Operação inválida",
      },
      {
        status: 400,
      },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Falha na operação",
      },
      {
        status: 400,
      },
    );
  } finally {
    await sql.end();
  }
}