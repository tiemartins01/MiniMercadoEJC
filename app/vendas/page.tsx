"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import Guard from "@/components/Guard";
import Title from "@/components/Title";
import type { CartItem, Pessoa, Produto, TipoPessoa } from "@/lib/types";

const cores = [
  "AZUL",
  "AMARELO",
  "VERDE",
  "VERMELHO",
  "LARANJA",
  "ROSA",
];

function Content() {
  const [tipo, setTipo] = useState<TipoPessoa>("ENCONTRISTA");
  const [cor, setCor] = useState("");
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [pessoaId, setPessoaId] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoId, setProdutoId] = useState("");
  const [qtd, setQtd] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/produtos")
      .then((response) => response.json())
      .then((data) => setProdutos(data.produtos || []));

    const savedCart = localStorage.getItem("ejc-cart");

    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    // Remove o fluxo antigo de encerramento pelo localStorage.
    localStorage.removeItem("ejc-comprador");
  }, []);

  useEffect(() => {
    setPessoaId("");

    if (tipo === "SERVO_PADRAO") {
      setPessoas([]);
      setCor("");
      return;
    }

    if (tipo === "SERVO_SALA") {
      setCor("");
    }

    if (tipo === "ENCONTRISTA" && !cor) {
      setPessoas([]);
      return;
    }

    const query = new URLSearchParams({ tipo });

    if (tipo === "ENCONTRISTA") {
      query.set("cor", cor);
    }

    fetch(`/api/pessoas?${query.toString()}`)
      .then((response) => response.json())
      .then((data) => setPessoas(data.pessoas || []));
  }, [tipo, cor]);

  function persist(next: CartItem[]) {
    setCart(next);
    localStorage.setItem("ejc-cart", JSON.stringify(next));
  }

  function add() {
    setMsg("");

    const produto = produtos.find(
      (item) => String(item.id) === produtoId,
    );

    if (!produto) {
      setMsg("Selecione um produto.");
      return;
    }

    const existente = cart.find((item) => item.id === produto.id);
    const novaQuantidade = (existente?.quantidade || 0) + qtd;

    if (novaQuantidade > produto.estoque) {
      setMsg("A quantidade ultrapassa o estoque disponível.");
      return;
    }

    const next = existente
      ? cart.map((item) =>
          item.id === produto.id
            ? {
                ...item,
                quantidade: novaQuantidade,
              }
            : item,
        )
      : [
          ...cart,
          {
            ...produto,
            quantidade: qtd,
          },
        ];

    persist(next);
    setQtd(1);
    setProdutoId("");
    setMsg("Item adicionado ao carrinho.");
  }

  const total = useMemo(
    () =>
      cart.reduce(
        (soma, item) => soma + item.preco * item.quantidade,
        0,
      ),
    [cart],
  );

  async function concluirCompra() {
    const pessoa = pessoas.find(
      (item) => String(item.id) === pessoaId,
    );

    if (!cart.length) {
      setMsg("Adicione pelo menos um item ao carrinho.");
      return;
    }

    if (tipo === "ENCONTRISTA" && !cor) {
      setMsg("Selecione a cor do Encontrista.");
      return;
    }

    if (tipo !== "SERVO_PADRAO" && !pessoa) {
      setMsg("Selecione a pessoa que está realizando a compra.");
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
          tipoComprador: tipo,
          pessoaId: pessoa ? Number(pessoa.id) : null,
          compradorNome:
            tipo === "SERVO_PADRAO" ? "Servo padrão" : pessoa?.nome || null,
          cor: tipo === "ENCONTRISTA" ? cor : null,
          formaPagamento: tipo === "SERVO_PADRAO" ? "PAGO" : "COMANDA",
          itens: cart.map((item) => ({
            produtoId: item.id,
            quantidade: item.quantidade,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMsg(data.error || "Falha ao concluir a compra.");
        return;
      }

      localStorage.removeItem("ejc-cart");
      setCart([]);
      setProdutoId("");
      setQtd(1);

      const valor = Number(data.total).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

      if (tipo === "SERVO_PADRAO") {
        setMsg(`Conta fechada com sucesso — ${valor}.`);
      } else {
        setMsg(
          `Compra adicionada à comanda de ${pessoa?.nome} — ${valor}. Para receber o pagamento, use “Encerrar compra”.`,
        );
      }
    } catch {
      setMsg("Não foi possível concluir a compra.");
    } finally {
      setLoading(false);
    }
  }

  const pessoaObrigatoria = tipo !== "SERVO_PADRAO";
  const corObrigatoria = tipo === "ENCONTRISTA";

  return (
    <>
      <Title
        title="Realizar venda"
        sub="Escolha o comprador, adicione os itens e conclua a compra."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.2fr) minmax(320px,.8fr)",
          gap: 18,
        }}
      >
        <div className="card" style={{ padding: 22 }}>
          <h2 style={{ marginTop: 0 }}>Comprador</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <label>
              Tipo
              <select
                className="input"
                value={tipo}
                onChange={(event) => {
                  setTipo(event.target.value as TipoPessoa);
                  setPessoaId("");
                  setMsg("");
                }}
              >
                <option value="ENCONTRISTA">Encontrista</option>
                <option value="SERVO_SALA">Servo - Sala</option>
                <option value="SERVO_PADRAO">Servo padrão</option>
              </select>
            </label>

            {tipo === "ENCONTRISTA" && (
              <label>
                Cor
                <select
                  className="input"
                  value={cor}
                  onChange={(event) => {
                    setCor(event.target.value);
                    setMsg("");
                  }}
                >
                  <option value="">Selecione a cor...</option>

                  {cores.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {tipo !== "SERVO_PADRAO" && (
            <label style={{ display: "block", marginTop: 12 }}>
              {tipo === "ENCONTRISTA" ? "Encontrista" : "Servo - Sala"}

              <select
                className="input"
                value={pessoaId}
                onChange={(event) => {
                  setPessoaId(event.target.value);
                  setMsg("");
                }}
              >
                <option value="">Selecione...</option>

                {pessoas.map((pessoa) => (
                  <option key={pessoa.id} value={pessoa.id}>
                    {pessoa.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          {tipo === "SERVO_PADRAO" ? (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                background: "#fff5ed",
                color: "#8f3d08",
                fontWeight: 700,
              }}
            >
              Servo padrão paga na hora. Depois de adicionar todos os itens,
              clique em “Fechar conta”.
            </div>
          ) : (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                background: "#fff5ed",
                color: "#8f3d08",
                fontWeight: 700,
              }}
            >
              Esta compra será adicionada à comanda. O pagamento será feito em
              “Encerrar compra”.
            </div>
          )}

          <hr
            style={{
              border: 0,
              borderTop: "1px solid var(--line)",
              margin: "24px 0",
            }}
          />

          <h2>Adicionar item</h2>

          <label>
            Produto
            <select
              className="input"
              value={produtoId}
              onChange={(event) => setProdutoId(event.target.value)}
            >
              <option value="">Selecione...</option>

              {produtos
                .filter((produto) => produto.ativo && produto.estoque > 0)
                .map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome}—{" "}
                    {produto.preco.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </option>
                ))}
            </select>
          </label>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "end",
              marginTop: 12,
            }}
          >
            <label style={{ width: 130 }}>
              Quantidade
              <input
                className="input"
                type="number"
                min={1}
                value={qtd}
                onChange={(event) =>
                  setQtd(Math.max(1, Number(event.target.value)))
                }
              />
            </label>

            <button className="btn btn-primary" onClick={add}>
              <Plus size={17} style={{ verticalAlign: "middle" }} /> Adicionar
            </button>
          </div>

          {msg && (
            <p style={{ color: "var(--orange)", fontWeight: 700 }}>{msg}</p>
          )}
        </div>

        <div className="card" style={{ padding: 22 }}>
          <h2
            style={{
              display: "flex",
              gap: 9,
              alignItems: "center",
              marginTop: 0,
            }}
          >
            <ShoppingCart size={21} />
            Carrinho
          </h2>

          {cart.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>Nenhum item adicionado.</p>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: 10,
                  padding: "12px 0",
                  borderBottom: "1px solid var(--line)",
                  alignItems: "center",
                }}
              >
                <div>
                  <b>{item.nome}</b>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    {item.quantidade} ×{" "}
                    {item.preco.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>
                </div>

                <b>
                  {(item.quantidade * item.preco).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </b>

                <button
                  aria-label={`Remover ${item.nome}`}
                  onClick={() =>
                    persist(cart.filter((produto) => produto.id !== item.id))
                  }
                  style={{
                    border: 0,
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 22,
              fontWeight: 900,
              marginTop: 18,
            }}
          >
            <span>Total</span>
            <span>
              {total.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>

          <button
            className="btn btn-dark"
            style={{ width: "100%", marginTop: 18 }}
            disabled={
              loading ||
              !cart.length ||
              (pessoaObrigatoria && !pessoaId) ||
              (corObrigatoria && !cor)
            }
            onClick={concluirCompra}
          >
            {loading
              ? "Salvando..."
              : tipo === "SERVO_PADRAO"
                ? "Fechar conta"
                : "Adicionar à comanda"}
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
