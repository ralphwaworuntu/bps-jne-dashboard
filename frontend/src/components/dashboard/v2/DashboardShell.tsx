"use client";

import Sidebar from "@/components/dashboard/v2/Sidebar";
import Header from "@/components/dashboard/v2/Header";
import { useDashboard } from "@/context/DashboardContext";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const {
    user,
    loading,
    notifications,
    markAllRead,
    logout,
    sidebarOpen,
    isCollapsed,
    toggleSidebar,
  } = useDashboard();

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted text-secondary text-sm">
        Memuat dashboard…
      </div>
    );
  }

  return (
    <div className="flex h-screen max-h-screen flex-1 bg-muted overflow-hidden font-sans text-foreground">
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={isCollapsed}
        toggleSidebar={toggleSidebar}
      />

      <main
        className={`flex-1 flex flex-col bg-white min-h-screen transition-all duration-300 ${
          isCollapsed ? "lg:ml-[80px]" : "lg:ml-[280px]"
        } overflow-hidden`}
      >
        <Header
          toggleSidebar={toggleSidebar}
          user={user}
          notifications={notifications}
          onLogout={logout}
          markAllRead={markAllRead}
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-8">{children}</div>
      </main>
    </div>
  );
}
