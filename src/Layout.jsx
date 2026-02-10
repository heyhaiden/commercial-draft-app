import React from "react";
import MobileNav from "@/components/common/MobileNav";
import GlobalRatingModal from "@/components/game/GlobalRatingModal";

export default function Layout({ children, currentPageName }) {
  // No nav on these pages
  const noNavPages = ["Home", "JoinGame", "CreateRoom", "ProfileSetup", "Lobby", "Admin", "RoomDraft"];
  const showNav = !noNavPages.includes(currentPageName);
  
  return (
    <div className="min-h-screen bg-[#3d3d2e]">
      <style>{`
        :root {
          --background: 61 16% 20%;
          --foreground: 210 40% 98%;
        }
        body { background: #3d3d2e; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(244,197,66,0.3); border-radius: 3px; }
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>
      <GlobalRatingModal />
      {children}
      {showNav && <MobileNav />}
    </div>
  );
}