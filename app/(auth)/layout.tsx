export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-coo-yellow flex flex-col">
      {children}
    </div>
  );
}
