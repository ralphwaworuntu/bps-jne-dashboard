"use client";

import { useRouter } from "next/navigation";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center px-4">
      <h2 className="text-xl font-bold text-foreground">Terjadi kesalahan</h2>
      <p className="text-sm text-secondary max-w-md">
        {error.message || "Halaman gagal dimuat. Coba muat ulang."}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Coba lagi
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/v2")}
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground"
        >
          Ke dashboard
        </button>
      </div>
    </div>
  );
}
