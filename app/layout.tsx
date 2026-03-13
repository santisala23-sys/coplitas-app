import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar"; // Importamos la barra de navegación

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Coplitas para Crecer",
  description: "Gestión de rondas, eventos y recursos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es"> {/* Cambiado a español */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <div className="flex min-h-screen">
          <Navbar />
          
          {/* El contenido principal (<main>):
            - En celular: Ocupa todo el ancho y deja un margen abajo (pb-20) para que la barra inferior no tape nada.
            - En compu/tablet (md): Se empuja a la derecha (ml-64) para dejarle lugar a la barra lateral fija.
          */}
          <main className="flex-1 md:ml-64 pb-20 md:pb-0 w-full min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}