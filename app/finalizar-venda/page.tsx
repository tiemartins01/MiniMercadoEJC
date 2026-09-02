"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ReceiptText, Users } from "lucide-react";
import Guard from "@/components/Guard";
import Title from "@/components/Title";
import type { Comanda } from "@/lib/types";

const cores = [
  "AZUL",
  "AMARELO",
  "VERDE",
  "VERMELHO",
  "LARANJA",
  "ROSA",
] as const;

function moeda(valor: number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function Content() {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  async function carregar() {
    setLoading(true);
    setErro("");

    try {
      const response = await fetch("/api/comandas", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao carregar as contas abertas.");
      }

      setComandas(data.comandas || []);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Falha ao carregar as contas abertas.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const encontristasPorCor = useMemo(() => {
    const mapa = new Map<string, Comanda[]>();

    for (const cor of cores) {
      mapa.set(cor, []);
    }

    for (const comanda of comandas) {
      if (comanda.tipo !== "ENCONTRISTA") {
        continue;
      }

      const cor = comanda.cor || "SEM_COR";
      const atuais = mapa.get(cor) || [];
      atuais.push(comanda);
      mapa.set(cor, atuais);
    }

    return mapa;
  }, [comandas]);

  const servosSala = useMemo(
    () => comandas.filter((comanda) => comanda.tipo === "SERVO_SALA"),
    [comandas],
  );

  function toggle(chave: string) {
    setAberto((atual) => (atual === chave ? null : chave));
  }

  function CardGrupo({
    titulo,
    chave,
    itens,
    subtitulo,
  }: {
    titulo: string;
    chave: string;
    itens: Comanda[];
    subtitulo: string;
  }) {
    const expandido = aberto === chave;
    const total = itens.reduce(
      (soma, comanda) => soma + Number(comanda.valor_total),
      0,
    );

    return (
      <div className="card" style={{ overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => toggle(chave)}
          style={{
            width: "100%",
            border: 0,
            background: "transparent",
            padding: 20,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{titulo}</div>
              <div
                style={{
                  marginTop: 4,
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                {subtitulo} · {itens.length} conta(s) aberta(s)
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <b>{moeda(total)}</b>
              {expandido ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
        </button>

        {expandido && (
          <div
            style={{
              borderTop: "1px solid var(--line)",
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            {itens.length === 0 ? (
              <div
                style={{
                  padding: 14,
                  color: "var(--muted)",
                  textAlign: "center",
                }}
              >
                Nenhuma conta aberta neste grupo.
              </div>
            ) : (
              itens.map((comanda) => (
                <Link
                  key={comanda.id}
                  href={`/comandas/${comanda.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    background: "white",
                  }}
                >
                  <div>
                    <b>{comanda.nome}</b>
                    <div
                      style={{
                        marginTop: 4,
                        color: "var(--muted)",
                        fontSize: 13,
                      }}
                    >
                      {comanda.quantidade_pedidos || 0} compra(s) na comanda
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <b>{moeda(comanda.valor_total)}</b>
                    <div
                      style={{
                        marginTop: 4,
                        color: "var(--orange)",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      Abrir conta
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Title
        title="Encerrar compra"
        sub="Abra a cor, encontre a pessoa e acerte a conta da comanda."
      />

      {loading && <p>Carregando contas abertas...</p>}

      {erro && (
        <div className="card" style={{ padding: 20 }}>
          <p style={{ marginTop: 0, color: "#a22" }}>{erro}</p>
          <button className="btn btn-soft" onClick={carregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !erro && (
        <div style={{ display: "grid", gap: 24 }}>
          <section>
            <h2
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginTop: 0,
              }}
            >
              <ReceiptText size={21} />
              Encontristas
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {cores.map((cor) => (
                <CardGrupo
                  key={cor}
                  titulo={cor}
                  chave={`COR-${cor}`}
                  itens={encontristasPorCor.get(cor) || []}
                  subtitulo="Encontristas"
                />
              ))}
            </div>
          </section>

          <section>
            <h2
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginTop: 0,
              }}
            >
              <Users size={21} />
              Servos - Sala
            </h2>

            <div style={{ maxWidth: 620 }}>
              <CardGrupo
                titulo="Equipe Sala"
                chave="SERVO_SALA"
                itens={servosSala}
                subtitulo="Servos da sala"
              />
            </div>
          </section>
        </div>
      )}
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
