import Link from "next/link";

export default function NotFound() {
  return (
    <div className="phone-shell flex flex-col items-center justify-center min-h-screen px-6 bg-coo-paper">
      <div className="font-marker text-8xl text-coo-black leading-none select-none mb-2">
        COO
      </div>
      <div className="mt-2 w-16 h-1 bg-coo-black mb-10" />

      <div
        className="w-full max-w-sm bg-white border-2 border-coo-black p-8 text-center"
        style={{ boxShadow: "6px 6px 0 #FFD800" }}
      >
        <p className="font-archivo text-7xl text-coo-black mb-2">404</p>
        <p className="font-archivo text-lg text-coo-black mb-2">Η σελίδα δεν βρέθηκε</p>
        <p className="font-dm text-sm text-coo-black/55 mb-6">
          Αυτή η σελίδα δεν υπάρχει ή μετακινήθηκε.
        </p>
        <Link
          href="/schedule"
          className="inline-block bg-coo-black text-coo-yellow font-archivo text-sm
                     px-6 py-3 border-2 border-coo-black"
          style={{ boxShadow: "4px 4px 0 #FFD800" }}
        >
          Πίσω στο Πρόγραμμα →
        </Link>
      </div>

      <p className="mt-8 font-dm text-xs text-coo-black/40">
        Πτολεμαΐδα · Περδίκα 4
      </p>
    </div>
  );
}
