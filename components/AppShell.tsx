"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  PackageOpen,
  ReceiptText,
  ShoppingCart,
  Tags,
} from "lucide-react";

type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export default function AppShell({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const items: MenuItem[] = [
    {
      href: "/painel",
      label: "Painel",
      icon: LayoutDashboard,
    },
    {
      href: "/vendas",
      label: "Realizar venda",
      icon: ShoppingCart,
    },
    {
      href: "/finalizar-venda",
      label: "Encerrar compra",
      icon: ReceiptText,
    },
    {
      href: "/estoque",
      label: "Estoque",
      icon: PackageOpen,
    },
  ];

  if (admin) {
    items.push(
      {
        href: "/admin",
        label: "Admin",
        icon: BarChart3,
      },
      {
        href: "/admin/produtos",
        label: "Produtos",
        icon: Tags,
      },
      {
        href: "/admin/relatorios",
        label: "Relatórios",
        icon: Boxes,
      }
    );
  }

  async function sair() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.push("/login");
    router.refresh();
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
      }}
    >
      <aside
        style={{
          width: 245,
          background: "#1b1714",
          color: "white",
          padding: 22,
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <img
            src="/ejc-logo.png"
            alt="EJC"
            style={{
              width: 48,
              height: 48,
              objectFit: "contain",
            }}
          />

          <div>
            <b style={{ fontSize: 18 }}>EJC</b>

            <div
              style={{
                fontSize: 12,
                color: "#d8c8bd",
              }}
            >
              Vendas & Estoque
            </div>
          </div>
        </div>

        <nav
          style={{
            display: "grid",
            gap: 7,
          }}
        >
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: "11px 12px",
                  borderRadius: 11,
                  background:
                    pathname === item.href ? "#f47a20" : "transparent",
                  color:
                    pathname === item.href ? "white" : "#eadfd7",
                }}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={sair}
          style={{
            position: "absolute",
            bottom: 22,
            left: 22,
            right: 22,
            display: "flex",
            gap: 9,
            alignItems: "center",
            padding: 11,
            border: 0,
            borderRadius: 10,
            background: "#302721",
            color: "white",
            cursor: "pointer",
          }}
        >
          <LogOut size={17} />
          Sair
        </button>
      </aside>

      <main
        style={{
          flex: 1,
          padding: "34px clamp(20px,4vw,54px)",
          minWidth: 0,
        }}
      >
        {children}
      </main>
    </div>
  );
}