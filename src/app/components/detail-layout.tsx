import { Outlet } from "react-router";
import { Header } from "./header";

interface DetailLayoutProps {
  title: string;
}

export function DetailLayout({ title }: DetailLayoutProps) {
  return (
    <div className="w-full h-full relative font-sans">
      <Header showBack title={title} />
      <main className="w-full h-full pt-16">
        <Outlet />
      </main>
      {/* No BottomNav for detail pages */}
    </div>
  );
}