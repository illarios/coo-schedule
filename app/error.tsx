"use client";

import { useEffect } from "react";

export default function Error({
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
    <div className="phone-shell flex flex-col items-center justify-center min-h-screen px-6 bg-coo-paper">
      <div className="font-marker text-6xl text-coo-black select-none mb-8">COO</div>
      <div
        className="w-full max-w-sm bg-white border-2 border-coo-black p-8 text-center"
        style={{ boxShadow: "6px 6px 0 #E63946" }}
      >
        <p className="text-4xl mb-4">⚠️</p>
        <p className="font-archivo text-lg text-coo-black mb-2">Κάτι πήγε στραβά</p>
        <p className="font-dm text-sm text-coo-black/55 mb-6">
          Προέκυψε ένα σφάλμα. Δοκίμασε ξανά ή επικοινώνησε με τον διαχειριστή.
        </p>
        <button
          onClick={reset}
          className="bg-coo-black text-coo-yellow font-archivo text-sm px-6 py-3
                     border-2 border-coo-black"
          style={{ boxShadow: "4px 4px 0 #FFD800" }}
        >
          Δοκίμασε ξανά
        </button>
      </div>
    </div>
  );
}
