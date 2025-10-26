// src/app/layout.tsx (CORRIGIDO com a fonte 'Inter')
import type { Metadata } from "next";
// 1. Importe o 'Inter' (o padrão estável)
import { Inter } from "next/font/google";
import "./globals.css";

// 2. Configure o 'Inter'
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ERP Locação", // Você pode mudar isso
  description: "Sistema de Gestão de Locação de Equipamentos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      {/* 3. Use a classe do 'Inter' */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}