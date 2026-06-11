import { Outlet } from "react-router";

export function Layout() {
  return (
    <div className="w-full min-h-dvh" style={{ background: "#0A1A3A" }}>
      <Outlet />
    </div>
  );
}
