"use client";

import { DashboardProvider } from "@/context/DashboardContext";
import DashboardShell from "@/components/dashboard/v2/DashboardShell";

export default function DashboardV2Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
