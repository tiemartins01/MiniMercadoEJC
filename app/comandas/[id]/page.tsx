"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Guard from "@/components/Guard";
import Title from "@/components/Title";
import type { Comanda } from "@/lib/types";

type Pedido = {
  id: number;
  valor_bruto: number;
  valor_retornado: number;
  valor_liquido: number;
  criado_em: string;
};

type ItemPedido = {
  id: number;
  pedido_id: number;
  produto_id: number;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
};

function Content() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [comanda, setComanda] = useState<Comanda | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagando, setPagando] = useState(false);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  async function carregar() {
    setLoading(true);
    setErro("");

    try {
      const response = await fetch(`/api/comandas/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao buscar comanda.");
      }

      setComanda(data.comanda);
      setPedidos(data.pedidos || []);
      setItens(data.itens || []);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Falha ao buscar comanda.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) {
      carregar();
    }
  }, [params.id]);

  const itensPorPedido = useMemo(() => {
    const mapa = new Map<number, ItemPedido[]>();

    for (const item of itens) {
      const atuais = mapa.get(item.pedido_id) || [];
      atuais.push(item);
      mapa.set(item.pedido_id, atuais);
    }

    return mapa;
  }, [itens]);

  async function pagar() {
    if (!comanda || comanda.status !== "ABERTA") {
      return;
    }

    const confirmou = window.confirm(
      `Confirmar o pagamento da comanda de ${comanda.nome} no valor de ${Number(
        comanda.valor_total,
      ).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}?`,
    );

    if (!confirmou) {
      return;
    }

    setPagando(true);
    setMsg("");

    try {
      const response = await fetch(`/api/comandas/${comanda.id}/pagar`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao pagar comanda.");
      }

      setMsg("Comanda paga com sucesso.");
      await carregar();
    } catch (error) {
      setMsg(
        error instanceof Error ? error.message : "Falha ao pagar comanda.",
      );
    } finally {
      setPagando(false);
    }
  }

  if (loading) {
    return <p>Carregando comanda...</p>;
  }

  if (erro || !comanda) {
    return (
      <>
        <Title title="Comanda" sub="Não foi possível carregar a comanda." />

        <div
          className="card"
          style={{
            padding: 22,
          }}
        >
          <p>{erro || "Comanda não encontrada."}</p>

          <button
            className="btn btn-soft"
            onClick={() => router.push("/finalizar-venda")}
          >
            Voltar
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Title
        title={comanda.nome}
        sub={
          comanda.tipo === "ENCONTRISTA"
            ? `Comanda do Encontrista — ${comanda.cor || "Sem cor"}`
            : "Comanda da Equipe Sala"
        }
      />

      <div
        className="card"
        style={{
          padding: 22,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ color: "var(--muted)" }}>Status</div>
            <div
              style={{
                marginTop: 5,
                fontWeight: 900,
              }}
            >
              {comanda.status === "ABERTA" ? "Em aberto" : "Paga"}
            </div>
          </div>

          <div>
            <div style={{ color: "var(--muted)" }}>Total da comanda</div>
            <div
              style={{
                marginTop: 5,
                fontSize: 30,
                fontWeight: 900,
              }}
            >
              {Number(comanda.valor_total).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        {pedidos.map((pedido) => (
          <div
            key={pedido.id}
            className="card"
            style={{
              padding: 22,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 14,
              }}
            >
              <b>Compra #{pedido.id}</b>

              <span style={{ color: "var(--muted)" }}>
                {new Date(pedido.criado_em).toLocaleString("pt-BR")}
              </span>
            </div>

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
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <th style={{ padding: "8px 0" }}>Produto</th>
                    <th>Qtd.</th>
                    <th>Unitário</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {(itensPorPedido.get(pedido.id) || []).map((item) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <td style={{ padding: "10px 0" }}>{item.produto_nome}</td>
                      <td>{item.quantidade}</td>
                      <td>
                        {Number(item.preco_unitario).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td>
                        <b>
                          {Number(item.valor_total).toLocaleString("pt-BR", {
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
                textAlign: "right",
                marginTop: 14,
                fontWeight: 900,
              }}
            >
              Total da compra:{" "}
              {Number(pedido.valor_liquido).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
          </div>
        ))}
      </div>

      {msg && (
        <div
          style={{
            marginTop: 18,
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
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 20,
        }}
      >
        <button
          className="btn btn-soft"
          onClick={() => router.push("/finalizar-venda")}
        >
          Voltar
        </button>

        {comanda.status === "ABERTA" && (
          <button
            className="btn btn-primary"
            disabled={pagando}
            onClick={pagar}
          >
            {pagando ? "Acertando..." : "Acertar conta"}
          </button>
        )}
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
