// app/(auth)/layout.tsx

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071b38] via-[#0a2550] to-[#071b38]">
      {children}
    </div>
  );
}