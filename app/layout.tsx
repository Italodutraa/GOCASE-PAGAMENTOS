import type { Metadata } from "next";
import "./globals.css";
import { CostBar } from "@/components/CostBar";

export const metadata: Metadata = {
  title: "Guardião de Pagamentos · Gogroup",
  description: "Auditoria de lotes de remessa com agentes (GoHACKS — Desafio 2 · Gogroup)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-white pb-24 font-sans text-[#2659a5] antialiased">
        {children}
        <CostBar />
      </body>
    </html>
  );
}
