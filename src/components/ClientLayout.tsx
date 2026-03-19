"use client";

import { BalanceProvider } from "@/context/BalanceContext";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import BrokeModal from "@/components/BrokeModal";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <BalanceProvider>
      <div style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
      }}>
        <Sidebar />
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}>
          <Header />
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
    </BalanceProvider>
  );
}
