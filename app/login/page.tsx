"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, User } from "lucide-react";

export default function Login() {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const r = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        login,
        senha,
      }),
    });

    const d = await res.json();

    setLoading(false);

    if (!res.ok) {
      return setErro(d.error || "Falha ao entrar");
    }

    r.push(d.role === "ADMIN" ? "/admin" : "/painel");
    r.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background:
          "radial-gradient(circle at top left, #fff0e4, #fffaf6 48%)",
      }}
    >
      <div
        className="card"
        style={{
          width: "min(430px, 100%)",
          padding: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <img
            src="/ejc-logo.png"
            alt="EJC"
            style={{
              width: 90,
              height: 90,
              objectFit: "contain",
            }}
          />
        </div>

        <h1
          style={{
            textAlign: "center",
            margin: "12px 0 6px",
          }}
        >
          EJC Vendas
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "var(--muted)",
            marginBottom: 24,
          }}
        >
          Acesso ao mini mercado, estoque e administração.
        </p>

        <form
          onSubmit={submit}
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          <label>
            <b>Usuário</b>

            <div
              style={{
                position: "relative",
                marginTop: 7,
              }}
            >
              <User
                size={18}
                style={{
                  position: "absolute",
                  left: 12,
                  top: 12,
                  color: "#8a7668",
                }}
              />

              <input
                className="input"
                style={{
                  paddingLeft: 40,
                }}
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
              />
            </div>
          </label>

          <label>
            <b>Senha</b>

            <div
              style={{
                position: "relative",
                marginTop: 7,
              }}
            >
              <LockKeyhole
                size={18}
                style={{
                  position: "absolute",
                  left: 12,
                  top: 12,
                  color: "#8a7668",
                }}
              />

              <input
                type="password"
                className="input"
                style={{
                  paddingLeft: 40,
                }}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
          </label>

          {erro && (
            <div
              style={{
                background: "#fff0ef",
                color: "#a52a20",
                padding: 10,
                borderRadius: 10,
              }}
            >
              {erro}
            </div>
          )}

          <button
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div
          style={{
            marginTop: 18,
            fontSize: 12,
            color: "#8a7668",
            lineHeight: 1.6,
          }}
        >
          Primeiro acesso local: operador / ejc2026 e admin / admin2026.
          Troque pelas variáveis de ambiente antes de publicar.
        </div>
      </div>
    </main>
  );
}