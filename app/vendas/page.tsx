"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import Guard from "@/components/Guard";
import Title from "@/components/Title";
import type {
  CartItem,
  Pessoa,
  Produto,
  TipoPagamento,
  TipoPessoa,
} from "@/lib/types";

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
  const [pagamento, setPagamento] = useState<TipoPagamento>("PAGO");

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoId, setProdutoId] = useState("");
  const [qtd, setQtd] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/produtos")
      .then((response) => response.json())
      .then((data) => setProdutos(data.produtos || []));

    const savedCart = localStorage.getItem("ejc-cart");

    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    setPessoaId("");

    if (tipo === "SERVO_PADRAO") {
      setPessoas([]);
      setCor("");
      setPagamento("PAGO");
      return;
    }

    if (tipo === "SERVO_SALA") {
      setCor("");
    }

    const query = new URLSearchParams({ tipo });

    if (tipo === "ENCONTRISTA" && cor) {
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

  function salvarComprador() {
    const pessoa = pessoas.find(
      (item) => String(item.id) === pessoaId,
    );

    if (tipo !== "SERVO_PADRAO" && !pessoa) {
      setMsg("Selecione uma pessoa antes de continuar.");
      return;
    }

    if (tipo === "ENCONTRISTA" && !cor) {
      setMsg("Selecione a cor do Encontrista.");
      return;
    }

    const formaPagamento: TipoPagamento =
      tipo === "SERVO_PADRAO" ? "PAGO" : pagamento;

    localStorage.setItem(
      "ejc-comprador",
      JSON.stringify({
        tipoComprador: tipo,
        cor: tipo === "ENCONTRISTA" ? cor : null,
        pessoaId:
          tipo !== "SERVO_PADRAO" && pessoa
            ? Number(pessoa.id)
            : null,
        compradorNome:
          tipo === "SERVO_PADRAO"
            ? "Servo padrão"
            : pessoa?.nome || null,
        formaPagamento,
      }),
    );

    setMsg(
      formaPagamento === "COMANDA"
        ? "Compra preparada para ser adicionada à comanda."
        : "Comprador e carrinho preparados para finalizar a venda.",
    );
  }

  const pessoaObrigatoria = tipo !== "SERVO_PADRAO";
  const corObrigatoria = tipo === "ENCONTRISTA";

  return (
    <>
      <Title
        title="Realizar venda"
        sub="Escolha o comprador, os itens e monte o carrinho."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.2fr) minmax(320px,.8fr)",
          gap: 18,
        }}
      >
        <div
          className="card"
          style={{
            padding: 22,
          }}
        >
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
                  onChange={(event) => setCor(event.target.value)}
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
            <label
              style={{
                display: "block",
                marginTop: 12,
              }}
            >
              {tipo === "ENCONTRISTA" ? "Encontrista" : "Servo - Sala"}

              <select
                className="input"
                value={pessoaId}
                onChange={(event) => setPessoaId(event.target.value)}
              >
                <option value="">Selecione...</option>

                {pessoas.map((pessoa) => (
                  <option key={pessoa.id} value={pessoa.id}>
                    {pessoa.nome}
                    {pessoa.cor ? ` — ${pessoa.cor}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          {tipo !== "SERVO_PADRAO" && (
            <label
              style={{
                display: "block",
                marginTop: 12,
              }}
            >
              Pagamento

              <select
                className="input"
                value={pagamento}
                onChange={(event) =>
                  setPagamento(event.target.value as TipoPagamento)
                }
              >
                <option value="PAGO">Pagar agora</option>
                <option value="COMANDA">
                  Pagar depois / adicionar à comanda
                </option>
              </select>
            </label>
          )}

          {tipo === "SERVO_PADRAO" && (
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
              Servo padrão não utiliza comanda. O pagamento deve ser feito no
              momento da venda.
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
                    {produto.nome} — {produto.estoque} un. —{" "}
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
              <Plus
                size={17}
                style={{
                  verticalAlign: "middle",
                }}
              />{" "}
              Adicionar
            </button>
          </div>

          {msg && (
            <p
              style={{
                color: "var(--orange)",
                fontWeight: 700,
              }}
            >
              {msg}
            </p>
          )}
        </div>

        <div
          className="card"
          style={{
            padding: 22,
          }}
        >
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
            <p style={{ color: "var(--muted)" }}>
              Nenhum item adicionado.
            </p>
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
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--muted)",
                    }}
                  >
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
            style={{
              width: "100%",
              marginTop: 18,
            }}
            disabled={
              !cart.length ||
              (pessoaObrigatoria && !pessoaId) ||
              (corObrigatoria && !cor)
            }
            onClick={salvarComprador}
          >
            Preparar encerramento
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
