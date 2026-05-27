import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Project Manager",
  description: "Advanced Gantt and Project Management App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={outfit.variable}>
      <body>
        <div className="app-container">
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Header />
            <main style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px 0' }}>
              <div className="glass-panel" style={{ height: '100%', padding: '24px', overflowY: 'auto' }}>
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
