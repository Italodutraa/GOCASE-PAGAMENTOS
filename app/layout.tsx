import type { Metadata } from "next";
import "./globals.css";
import { CostBar } from "@/components/CostBar";

export const metadata: Metadata = {
  title: "Guardião de Pagamentos",
  description: "Auditoria de lotes de remessa com agentes (GoHACKS – Desafio 2)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen pb-24 font-sans antialiased">
        {children}
        <CostBar />
      </body>
    </html>
  );
}
