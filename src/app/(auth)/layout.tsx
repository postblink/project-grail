export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(196,163,82,0.18) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 flex w-full justify-center">
        {children}
      </div>
    </div>
  );
}
