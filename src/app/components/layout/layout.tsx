import { Outlet } from "react-router";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";

export function Layout() {
  return (
    <div className="w-full relative font-sans bg-bg" style={{ height: "100dvh" }}>
      <Header />
      <main className="w-full h-full">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
