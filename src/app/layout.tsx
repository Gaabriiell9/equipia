import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { brand } from "@/lib/config";
import "./globals.css";

const instrument = localFont({
  src: "../fonts/InstrumentSans.woff2",
  variable: "--font-instrument",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: {
    default: `${brand.name} : gestion des congés et absences pour les entreprises`,
    template: `%s | ${brand.name}`,
  },
  description:
    "Demandes de congés, validation en un clic, soldes calculés automatiquement selon le droit français et calendrier d'équipe. Pour toutes les entreprises de 5 à 150 salariés, quel que soit le secteur.",
  applicationName: brand.name,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: brand.name,
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#14213d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${instrument.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper font-sans text-ink">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "!rounded-[10px] !border-line !font-sans !text-ink",
            },
          }}
        />
      </body>
    </html>
  );
}
