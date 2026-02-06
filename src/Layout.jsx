import React from "react";
import MobileNav from "@/components/common/MobileNav";

export default function Layout({ children, currentPageName }) {
  const showNav = currentPageName !== "Admin";
  
  return (
    <div className="min-h-screen bg-gray-950">
      <style>{`
        :root {
          --background: 222.2 84% 4.9%;
          --foreground: 210 40% 98%;
        }
        body { background: #030712; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>
      {children}
      {showNav && <MobileNav />}
    </div>
  );
}