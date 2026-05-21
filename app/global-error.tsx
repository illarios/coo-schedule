"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="el">
      <body className="bg-coo-paper font-dm flex items-center justify-center min-h-screen p-6">
        <div
          className="bg-white border-2 border-coo-black p-8 text-center max-w-sm w-full"
          style={{ boxShadow: "6px 6px 0 #E63946" }}
        >
          <p className="text-4xl mb-4">💥</p>
          <p style={{ fontWeight: 900, fontSize: 18 }} className="text-coo-black mb-2">
            Κρίσιμο σφάλμα
          </p>
          <p className="text-sm text-coo-black/60 mb-6">
            Η εφαρμογή αντιμετώπισε σοβαρό σφάλμα. Επικοινώνησε με τον διαχειριστή.
          </p>
          <button
            onClick={reset}
            className="bg-coo-black text-coo-yellow text-sm px-6 py-3 border-2 border-coo-black"
            style={{ fontWeight: 700 }}
          >
            Επανεκκίνηση
          </button>
        </div>
      </body>
    </html>
  );
}
