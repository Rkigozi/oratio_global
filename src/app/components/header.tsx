export function Header() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex flex-col items-center justify-center py-4 pt-[max(1rem,env(safe-area-inset-top))] pointer-events-none"
      style={{
        background: "linear-gradient(to bottom, rgba(10, 26, 58, 0.95) 20%, rgba(10, 26, 58, 0))",
      }}
    >
      <h1
        className="font-heading tracking-[0.25em] text-[#c5cbe2]"
        style={{
          fontSize: "0.95rem",
          fontWeight: 300,
          textShadow: "0 0 30px rgba(124, 143, 255, 0.2)",
        }}
      >
        ORATIO
      </h1>
    </header>
  );
}