"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Guard from "@/components/Guard";
import Title from "@/components/Title";
import type { CartItem, CompradorVenda } from "@/lib/types";

function Content() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [comprador, setComprador] = useState<CompradorVenda | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem("ejc-cart") || "[]"));
    setComprador(
      JSON.parse(localStorage.getItem("ejc-comprador") || "null"),
    );
  }, []);

  const total = useMemo(
    () =>
      cart.reduce(
        (soma, item) => soma + item.preco * item.quantidade,
        0,
      ),
    [cart],
  );

  async function finalizar() {
    if (!comprador || !cart.length) {
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const response = await fetch("/api/vendas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...comprador,
          itens: cart.map((item) => ({
            produtoId: item.id,
            quantidade: item.quantidade,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMsg(data.error || "Falha ao finalizar a venda.");
        return;
      }

      localStorage.removeItem("ejc-cart");
      localStorage.removeItem("ejc-comprador");
      setCart([]);

      const valor = Number(data.total).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

      if (data.comandaId) {
        setMsg(
          `Pedido #${data.pedidoId} adicionado à comanda com sucesso — ${valor}`,
        );
      } else {
        setMsg(`Pedido #${data.pedidoId} finalizado com sucesso — ${valor}`);
      }
    } catch {
      setMsg("Não foi possível finalizar a venda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Title
        title="Encerrar compra"
        sub="Confira todos os itens antes de gerar o pedido no banco de dados."
      />

      <div
        className="card"
        style={{
          padding: 24,
          maxWidth: 900,
        }}
      >
        {comprador ? (
          <div
            style={{
              background: "#fff5ed",
              padding: 14,
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <div>
              <b>Comprador:</b> {comprador.compradorNome || "Não informado"}
            </div>

            <div style={{ marginTop: 6 }}>
              <span className="badge">{comprador.tipoComprador}</span>

              {comprador.cor && (
                <>
                  {" "}Cor: <b>{comprador.cor}</b>
                </>
              )}
            </div>

            <div style={{ marginTop: 6 }}>
              <b>Pagamento:</b>{" "}
              {comprador.formaPagamento === "COMANDA"
                ? "Pagar depois / Comanda"
                : "Pagar agora"}
            </div>
          </div>
        ) : (
          <p>Nenhum comprador preparado. Volte para “Realizar venda”.</p>
        )}

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  borderBottom: "2px solid var(--line)",
                }}
              >
                <th style={{ padding: 10 }}>Item</th>
                <th>Unitário</th>
                <th>Qtd.</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {cart.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <td style={{ padding: 12 }}>{item.nome}</td>
                  <td>
                    {item.preco.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td>{item.quantidade}</td>
                  <td>
                    <b>
                      {(item.preco * item.quantidade).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 26,
            fontWeight: 900,
            marginTop: 22,
          }}
        >
          <span>TOTAL</span>
          <span>
            {total.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>

        {msg && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 10,
              background: "#eef9ef",
              fontWeight: 700,
            }}
          >
            {msg}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 20,
          }}
        >
          <button
            className="btn btn-soft"
            onClick={() => router.push("/vendas")}
          >
            Voltar
          </button>

          <button
            className="btn btn-primary"
            disabled={!cart.length || !comprador || loading}
            onClick={finalizar}
          >
            {loading
              ? "Finalizando..."
              : comprador?.formaPagamento === "COMANDA"
                ? "Adicionar à comanda"
                : "Finalizar venda"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Guard>
      <Content />
    </Guard>
  );
}
