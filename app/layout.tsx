import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "COO Schedule",
  description: "Πρόγραμμα βαρδιών COO cafe-bar",
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
    <html lang="el">
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
              fontFamily: "'DM Sans', sans-serif",
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
