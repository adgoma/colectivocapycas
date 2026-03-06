import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Colectivo Ex Indeterminados CAS y CAP",
  description: "Web administrable de gestiones y comunicados del colectivo."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <div className="page-shell">
          <SiteHeader />
          <main className="site-main">
            <div className="container">{children}</div>
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

