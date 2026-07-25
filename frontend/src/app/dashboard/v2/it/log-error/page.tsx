"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import {
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Loader2,
    RefreshCw,
    Trash2,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { clearErrorLogs, listErrorLogs, type SystemErrorLog } from "@/lib/itApi";

function formatDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function levelStyle(level: string) {
    const l = level.toUpperCase();
    if (l === "CRITICAL") return "bg-red-100 text-red-800";
    if (l === "WARNING") return "bg-amber-100 text-amber-800";
    return "bg-orange-100 text-orange-800";
}

export default function LogErrorPage() {
    const router = useRouter();
    const { showToast } = useToast();

    const [logs, setLogs] = useState<SystemErrorLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const loadLogs = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/");
            return;
        }
        setLoading(true);
        try {
            const data = await listErrorLogs(token, 200);
            setLogs(data);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "error";
            if (msg.toLowerCase().includes("akses ditolak") || msg.includes("403")) {
                showToast("Halaman ini hanya untuk Super Admin / Admin IT.", "error");
            } else {
                showToast(`Gagal memuat log error: ${msg}`, "error");
            }
        } finally {
            setLoading(false);
        }
    }, [router, showToast]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/");
            return;
        }
        loadLogs();
    }, [router, loadLogs]);

    const handleClear = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        if (!window.confirm("Hapus semua log error? Tindakan ini tidak bisa dibatalkan.")) {
            return;
        }
        setClearing(true);
        try {
            const res = await clearErrorLogs(token);
            setLogs([]);
            showToast(`${res.deleted} log dihapus.`, "success");
        } catch (e) {
            showToast(`Gagal menghapus log: ${e instanceof Error ? e.message : "error"}`, "error");
        } finally {
            setClearing(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 p-6 lg:p-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                            IT
                        </p>
                        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
                            Log Error
                        </h1>
                        <p className="mt-2 text-sm text-secondary">
                            Pantau error yang terjadi di sistem (middleware / backend).
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => loadLogs()}
                            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                        >
                            <RefreshCw className="size-4" aria-hidden />
                            Refresh
                        </button>
                        <button
                            type="button"
                            disabled={clearing || logs.length === 0}
                            onClick={handleClear}
                            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                            {clearing ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Trash2 className="size-4" aria-hidden />
                            )}
                            Clear Logs
                        </button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-white">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 px-4 py-16 text-secondary">
                            <Loader2 className="size-4 animate-spin" />
                            Memuat log...
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-secondary">
                            <AlertTriangle className="size-8 text-secondary/60" />
                            <p className="font-medium">Belum ada log error.</p>
                            <p className="text-sm">Sistem akan mencatat error di sini saat terjadi kegagalan.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {logs.map((log) => {
                                const open = expandedId === log.id;
                                return (
                                    <li key={log.id} className="px-4 py-4">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedId(open ? null : log.id)
                                            }
                                            className="flex w-full items-start gap-3 text-left"
                                        >
                                            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-orange-500" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${levelStyle(log.level)}`}
                                                    >
                                                        {log.level}
                                                    </span>
                                                    <span className="text-xs text-secondary">
                                                        {formatDate(log.created_at)}
                                                    </span>
                                                    <span className="text-xs text-secondary">
                                                        · {log.source}
                                                    </span>
                                                    {log.method && log.path && (
                                                        <span className="truncate text-xs font-medium text-secondary">
                                                            · {log.method} {log.path}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 font-medium text-foreground">
                                                    {log.message}
                                                </p>
                                            </div>
                                            {open ? (
                                                <ChevronUp className="size-4 shrink-0 text-secondary" />
                                            ) : (
                                                <ChevronDown className="size-4 shrink-0 text-secondary" />
                                            )}
                                        </button>
                                        {open && log.traceback && (
                                            <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-muted p-3 text-xs text-foreground whitespace-pre-wrap">
                                                {log.traceback}
                                            </pre>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
