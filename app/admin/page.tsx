"use client";

import { useEffect, useState } from "react";

import Guard from "@/components/Guard";
import Title from "@/components/Title";

function Content() {
  const [d, setD] = useState<any>({});

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setD);
  }, []);

  return (
    <>
      <Title
        title="Administração"
        sub="Visão financeira consolidada das vendas do evento."
      />

      <div className="grid-cards">
        <Card
          l="Valor líquido"
          v={Number(d.valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        />

        <Card
          l="Pedidos"
          v={d.pedidos || 0}
        />

        <Card
          l="Itens vendidos"
          v={d.vendidos || 0}
        />

        <Card
          l="Estoque restante"
          v={d.estoque || 0}
        />
      </div>

      <div
        className="card"
        style={{
          padding: 24,
          marginTop: 18,
        }}
      >
        <h2
          style={{
            marginTop: 0,
          }}
        >
          Acesso administrativo
        </h2>

        <p
          style={{
            color: "var(--muted)",
            marginBottom: 0,
          }}
        >
          Use “Produtos” para alterar preços e “Relatórios” para conferir
          sábado, domingo ou todo o período.
        </p>
      </div>
    </>
  );
}

function Card({
  l,
  v,
}: {
  l: string;
  v: any;
}) {
  return (
    <div
      className="card"
      style={{
        padding: 22,
      }}
    >
      <div
        style={{
          color: "var(--muted)",
          fontWeight: 700,
        }}
      >
        {l}
      </div>

      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          marginTop: 8,
        }}
      >
        {v}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Guard adminOnly>
      <Content />
    </Guard>
  );
}