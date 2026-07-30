"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy wrapper — layout route sudah menangani shell.
 * Tetap diekspor agar import lama tidak error; hanya meneruskan children.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/** Redirect helper jika ada halaman yang masih memakai pola lama tanpa layout. */
export function useRequireAuthRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.replace("/login");
    }
  }, [router]);
}
