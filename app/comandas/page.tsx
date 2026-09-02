"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Guard from "@/components/Guard";
import Title from "@/components/Title";
import type { Comanda } from "@/lib/types";

function Content() {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/comandas")
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Falha ao buscar comandas.");
        }

        setComandas(data.comandas || []);
      })
      .catch((error) => {
        setErro(
          error instanceof Error
            ? error.message
            : "Falha ao buscar comandas.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const encontristas = useMemo(
    () => comandas.filter((item) => item.tipo === "ENCONTRISTA"),
    [comandas],
  );

  const equipeSala = useMemo(
    () => comandas.filter((item) => item.tipo === "SERVO_SALA"),
    [comandas],
  );

  const cores = useMemo(
    () =>
      Array.from(
        new Set(
          encontristas
            .map((item) => item.cor)
            .filter((item): item is string => Boolean(item)),
        ),
      ).sort(),
    [encontristas],
  );

  return (
    <>
      <Title
        title="Comandas"
        sub="Contas abertas de Encontristas e da equipe de sala."
      />

      {loading && <p>Carregando comandas...</p>}

      {erro && (
        <div
          className="card"
          style={{
            padding: 18,
            color: "#a33020",
          }}
        >
          {erro}
        </div>
      )}

      {!loading && !erro && comandas.length === 0 && (
        <div
          className="card"
          style={{
            padding: 22,
          }}
        >
          Nenhuma comanda aberta no momento.
        </div>
      )}

      {cores.map((cor) => {
        const comandasDaCor = encontristas.filter(
          (item) => item.cor === cor,
        );

        return (
          <section
            key={cor}
            style={{
              marginBottom: 30,
            }}
          >
            <h2>Encontristas — {cor}</h2>

            <div className="grid-cards">
              {comandasDaCor.map((comanda) => (
                <ComandaCard key={comanda.id} comanda={comanda} />
              ))}
            </div>
          </section>
        );
      })}

      {equipeSala.length > 0 && (
        <section>
          <h2>Equipe Sala</h2>

          <div className="grid-cards">
            {equipeSala.map((comanda) => (
              <ComandaCard key={comanda.id} comanda={comanda} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function ComandaCard({ comanda }: { comanda: Comanda }) {
  return (
    <Link
      href={`/comandas/${comanda.id}`}
      className="card"
      style={{
        padding: 20,
        display: "block",
      }}
    >
      <div
        style={{
          fontSize: 20,
          fontWeight: 900,
        }}
      >
        {comanda.nome}
      </div>

      <div
        style={{
          marginTop: 8,
          color: "var(--muted)",
        }}
      >
        {comanda.quantidade_pedidos || 0} compra(s)
      </div>

      <div
        style={{
          marginTop: 14,
          fontSize: 24,
          fontWeight: 900,
        }}
      >
        {Number(comanda.valor_total).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </div>

      <div
        style={{
          marginTop: 12,
          color: "var(--orange)",
          fontWeight: 800,
        }}
      >
        Ver comanda →
      </div>
    </Link>
  );
}

export default function Page() {
  return (
    <Guard>
      <Content />
    </Guard>
  );
}
