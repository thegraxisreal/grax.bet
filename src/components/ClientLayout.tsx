"use client";

import { useState, useCallback } from "react";
import { BalanceProvider } from "@/context/BalanceContext";
import { UserProvider } from "@/context/UserContext";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import BrokeModal from "@/components/BrokeModal";
import UsernameModal from "@/components/UsernameModal";
import ActivityFeed from "@/components/ActivityFeed";
import WinShareButton from "@/components/WinShareButton";
import SlotsAnnouncementModal from "@/components/SlotsAnnouncementModal";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <UserProvider>
    <BalanceProvider>
      <div style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
      }}>
        {/* Mobile backdrop overlay */}
        <div
          className={`sidebar-overlay${sidebarOpen ? " visible" : ""}`}
          onClick={closeSidebar}
          aria-hidden="true"
        />

        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}>
          <Header onMenuToggle={openSidebar} />
          <main style={{
            flex: 1,
            overflow: "auto",
            background: "var(--bg-primary)",
          }}>
            {children}
          </main>
        </div>
      </div>
      <BrokeModal />
      <UsernameModal />
      <ActivityFeed />
      <WinShareButton />
      <SlotsAnnouncementModal />
    </BalanceProvider>
    </UserProvider>
  );
}
