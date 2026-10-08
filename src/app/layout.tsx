import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Card Statement Insights | Radiografía y Motor de Tendencias 1-a-3+ Meses",
  description:
    "Analizador progresivo de estados de cuenta de tarjeta de crédito: funciona desde 1 estado de cuenta y desbloquea el Motor de Tendencias Trimestrales al cargar 3 o más cortes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-900">
        {children}
      </body>
    </html>
  );
}
