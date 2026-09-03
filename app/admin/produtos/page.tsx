"use client";

import { useEffect, useState } from "react";

import Guard from "@/components/Guard";
import Title from "@/components/Title";
import type { Produto } from "@/lib/types";

function Content() {
  const [ps, setPs] = useState<Produto[]>([]);
  const [edit, setEdit] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState("");

  function load() {
    fetch("/api/produtos")
      .then((r) => r.json())
      .then((d) => setPs(d.produtos || []));
  }

  useEffect(load, []);

  async function save(id: number) {
    const preco = Number(edit[id]);

    const res = await fetch("/api/admin/precos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        produtoId: id,
        preco,
      }),
    });

    const d = await res.json();

    setMsg(
      res.ok
        ? "Preço atualizado e histórico registrado."
        : d.error || "Falha",
    );

    if (res.ok) {
      load();
    }
  }

  return (
    <>
      <Title
        title="Produtos e preços"
        sub="Altere o valor atual sem modificar o preço registrado em vendas antigas."
      />

      {msg && (
        <div
          style={{
            padding: 12,
            background: "#fff4eb",
            borderRadius: 10,
            marginBottom: 14,
            fontWeight: 700,
          }}
        >
          {msg}
        </div>
      )}

      <div
        className="card"
        style={{
          overflow: "hidden",
        }}
      >
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#fff4eb",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: 14 }}>Produto</th>
                <th>Estoque</th>
                <th>Preço atual</th>
                <th>Novo preço</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {ps.map((p) => (
                <tr
                  key={p.id}
                  style={{
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <td style={{ padding: 14 }}>
                    <b>{p.nome}</b>

                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      {p.descricao}
                    </div>
                  </td>

                  <td>{p.estoque}</td>

                  <td>
                    {p.preco.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>

                  <td>
                    <input
                      className="input"
                      style={{
                        width: 130,
                      }}
                      type="number"
                      min="0"
                      step="0.01"
                      value={edit[p.id] ?? p.preco}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          [p.id]: e.target.value,
                        })
                      }
                    />
                  </td>

                  <td>
                    <button
                      className="btn btn-primary"
                      onClick={() => save(p.id)}
                    >
                      Salvar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Guard adminOnly>
      <Content />
    </Guard>
  );
}