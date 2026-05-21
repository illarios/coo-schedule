import type { Metadata, Viewport } from "next";
import { Archivo_Black, DM_Sans, Permanent_Marker } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const archivoBLack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  display: "swap",
});

const permanentMarker = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marker",
  display: "swap",
});

export const metadata: Metadata = {
  title: "COO Πρόγραμμα",
  description: "Πρόγραμμα βαρδιών COO cafe-bar · Πτολεμαΐδα",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "COO",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFD800",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="el"
      className={`${archivoBLack.variable} ${dmSans.variable} ${permanentMarker.variable}`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-coo-paper font-dm antialiased">
        <div className="phone-shell">
          {children}
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              border: "2px solid #0A0A0A",
              borderRadius: 0,
              boxShadow: "4px 4px 0 #0A0A0A",
              fontFamily: "var(--font-dm), sans-serif",
              fontWeight: 500,
            },
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');`,
          }}
        />
      </body>
    </html>
  );
}
