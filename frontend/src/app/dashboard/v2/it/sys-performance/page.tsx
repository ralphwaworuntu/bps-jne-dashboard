"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import PerformanceGauge from "@/components/dashboard/v2/PerformanceGauge";
import {
    Activity,
    Database,
    HardDrive,
    Loader2,
    RefreshCw,
    Server,
    Wifi,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { getSysPerformance, type SysPerformance } from "@/lib/itApi";

function formatBytes(n: number) {
    if (!n || n <= 0) return "—";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let v = n;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i += 1;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatUptime(sec: number | null | undefined) {
    if (sec == null || sec < 0) return "—";
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d} hari ${h}j ${m}m`;
    if (h > 0) return `${h}j ${m}m`;
    return `${m}m`;
}

function serviceTone(status: string) {
    const s = status.toLowerCase();
    if (s === "ok") return "bg-emerald-100 text-emerald-800";
    if (s === "disabled") return "bg-slate-100 text-slate-700";
    if (s === "degraded") return "bg-amber-100 text-amber-800";
    return "bg-red-100 text-red-800";
}

function frontendScoreFromClient(apiMs: number | null, heapPct: number | null): number {
    let score = 75;
    if (apiMs != null) {
        if (apiMs < 200) score = 95;
        else if (apiMs < 500) score = 85;
        else if (apiMs < 1200) score = 65;
        else score = 40;
    }
    if (heapPct != null && heapPct > 85) score = Math.min(score, 45);
    else if (heapPct != null && heapPct > 70) score = Math.min(score, 70);
    return score;
}

export default function SysPerformancePage() {
    const router = useRouter();
    const { showToast } = useToast();

    const [data, setData] = useState<SysPerformance | null>(null);
    const [loading, setLoading] = useState(true);
    const [apiLatencyMs, setApiLatencyMs] = useState<number | null>(null);
    const [heapPct, setHeapPct] = useState<number | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const sampleClientMetrics = useCallback(() => {
        const perf = performance as Performance & {
            memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
        };
        if (perf.memory?.jsHeapSizeLimit) {
            setHeapPct(
                Math.round(
                    (100 * perf.memory.usedJSHeapSize) / perf.memory.jsHeapSizeLimit
                )
            );
        }
    }, []);

    const load = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/");
            return;
        }
        setLoading(true);
        const t0 = performance.now();
        try {
            const res = await getSysPerformance(token);
            setApiLatencyMs(Math.round(performance.now() - t0));
            sampleClientMetrics();
            setData(res);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "error";
            if (msg.toLowerCase().includes("akses ditolak") || msg.includes("403")) {
                showToast("Halaman ini hanya untuk Super Admin / Admin IT.", "error");
            } else {
                showToast(`Gagal memuat Sys Performance: ${msg}`, "error");
            }
        } finally {
            setLoading(false);
        }
    }, [router, showToast, sampleClientMetrics]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/");
            return;
        }
        load();
    }, [router, load]);

    useEffect(() => {
        if (!autoRefresh) return;
        const id = window.setInterval(() => {
            load();
        }, 10000);
        return () => window.clearInterval(id);
    }, [autoRefresh, load]);

    const g = data?.gauges;
    const feScore = frontendScoreFromClient(apiLatencyMs, heapPct);
    const primaryDisk = data?.disk?.[0];

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 p-6 lg:p-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                            IT
                        </p>
                        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
                            Sys Performance
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-secondary">
                            Monitor kinerja backend, pengolahan data, frontend, traffic,
                            hardware, dan stabilitas sistem secara real-time.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-button)] border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground">
                            <input
                                type="checkbox"
                                className="size-4 accent-primary"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                            />
                            Auto 10s
                        </label>
                        <button
                            type="button"
                            onClick={() => load()}
                            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                        >
                            <RefreshCw className="size-4" aria-hidden />
                            Refresh
                        </button>
                    </div>
                </div>

                {loading && !data ? (
                    <div className="flex items-center justify-center gap-2 py-24 text-secondary">
                        <Loader2 className="size-5 animate-spin" />
                        Memuat metrik sistem…
                    </div>
                ) : null}

                {data && g ? (
                    <>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <MetaCard
                                icon={<Server className="size-5 text-primary" />}
                                label="Host"
                                value={data.host.hostname}
                                hint={data.host.platform}
                            />
                            <MetaCard
                                icon={<Activity className="size-5 text-primary" />}
                                label="Uptime"
                                value={formatUptime(data.host.uptime_seconds)}
                                hint={
                                    data.collected_at
                                        ? `Update ${new Date(data.collected_at).toLocaleTimeString("id-ID")}`
                                        : undefined
                                }
                            />
                            <MetaCard
                                icon={<Wifi className="size-5 text-primary" />}
                                label="API latency (FE)"
                                value={apiLatencyMs != null ? `${apiLatencyMs} ms` : "—"}
                                hint={
                                    heapPct != null
                                        ? `JS heap ~${heapPct}%`
                                        : "Heap tidak tersedia di browser ini"
                                }
                            />
                            <MetaCard
                                icon={<HardDrive className="size-5 text-primary" />}
                                label="Disk utama"
                                value={
                                    primaryDisk
                                        ? `${primaryDisk.percent}% · ${primaryDisk.mount}`
                                        : "—"
                                }
                                hint={
                                    primaryDisk
                                        ? `${formatBytes(primaryDisk.used_bytes)} / ${formatBytes(primaryDisk.total_bytes)}`
                                        : undefined
                                }
                            />
                        </div>

                        <section>
                            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secondary">
                                Skor kesehatan
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                                <PerformanceGauge
                                    title="Overall"
                                    value={g.overall}
                                    subtitle="Gabungan seluruh metrik"
                                />
                                <PerformanceGauge
                                    title="Backend"
                                    value={g.backend}
                                    subtitle="API · DB · Redis · Celery"
                                />
                                <PerformanceGauge
                                    title="Processing"
                                    value={g.processing}
                                    subtitle="Job CTC / UN RUNSHEET"
                                />
                                <PerformanceGauge
                                    title="Frontend"
                                    value={feScore}
                                    subtitle="Latency fetch + heap browser"
                                />
                                <PerformanceGauge
                                    title="Traffic"
                                    value={g.traffic}
                                    subtitle="Aktivitas upload & respons"
                                />
                                <PerformanceGauge
                                    title="Stability"
                                    value={g.stability}
                                    subtitle="Error log 24 jam"
                                />
                            </div>
                        </section>

                        <section>
                            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secondary">
                                Hardware monitor
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <PerformanceGauge
                                    title="Hardware"
                                    value={g.hardware}
                                    subtitle="Skor beban CPU/RAM/Disk"
                                />
                                <PerformanceGauge
                                    title="CPU"
                                    value={g.cpu}
                                    tone="usage"
                                    subtitle={`${data.cpu.count} core`}
                                />
                                <PerformanceGauge
                                    title="Memory"
                                    value={g.memory}
                                    tone="usage"
                                    subtitle={`${formatBytes(data.memory.used_bytes)} / ${formatBytes(data.memory.total_bytes)}`}
                                />
                                <PerformanceGauge
                                    title="Disk"
                                    value={g.disk}
                                    tone="usage"
                                    subtitle={primaryDisk?.mount || "—"}
                                />
                            </div>
                        </section>

                        <section className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-[var(--radius-card)] border border-border bg-white p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <Database className="size-5 text-primary" />
                                    <h3 className="font-semibold text-foreground">Services</h3>
                                </div>
                                <ul className="flex flex-col gap-3">
                                    {(
                                        [
                                            ["API", data.services.api],
                                            ["Database", data.services.database],
                                            ["Redis", data.services.redis],
                                            ["Celery", data.services.celery],
                                        ] as const
                                    ).map(([name, svc]) => (
                                        <li
                                            key={name}
                                            className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                                        >
                                            <div>
                                                <p className="font-medium text-foreground">{name}</p>
                                                <p className="text-xs text-secondary">
                                                    {svc.backend
                                                        ? `engine: ${svc.backend}`
                                                        : svc.detail || "—"}
                                                    {svc.latency_ms != null
                                                        ? ` · ${svc.latency_ms} ms`
                                                        : ""}
                                                    {typeof svc.workers === "number"
                                                        ? ` · workers ${svc.workers}`
                                                        : ""}
                                                    {typeof svc.active_tasks === "number"
                                                        ? ` · active ${svc.active_tasks}`
                                                        : ""}
                                                </p>
                                            </div>
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${serviceTone(svc.status)}`}
                                            >
                                                {svc.status}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="rounded-[var(--radius-card)] border border-border bg-white p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <Activity className="size-5 text-primary" />
                                    <h3 className="font-semibold text-foreground">
                                        Data processing & traffic
                                    </h3>
                                </div>
                                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <StatPill label="Queued" value={data.jobs.queued} />
                                    <StatPill label="Running" value={data.jobs.running} />
                                    <StatPill
                                        label="OK 24h"
                                        value={data.jobs.completed_last_24h}
                                    />
                                    <StatPill
                                        label="Fail 24h"
                                        value={data.jobs.failed_last_24h}
                                    />
                                </div>
                                <p className="mb-3 text-xs text-secondary">
                                    Success rate 24h:{" "}
                                    <span className="font-semibold text-foreground">
                                        {data.jobs.success_rate_24h}%
                                    </span>
                                    {" · "}
                                    Upload files:{" "}
                                    <span className="font-semibold text-foreground">
                                        {data.uploads.tracked_files}
                                    </span>
                                    {data.uploads.newest_age_hours != null
                                        ? ` · last activity ${data.uploads.newest_age_hours}h ago`
                                        : ""}
                                    {" · "}
                                    Errors 24h:{" "}
                                    <span className="font-semibold text-foreground">
                                        {data.errors.last_24h}
                                    </span>{" "}
                                    (critical {data.errors.critical_last_24h})
                                </p>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[420px] text-left text-sm">
                                        <thead className="bg-muted/60 text-xs uppercase text-secondary">
                                            <tr>
                                                <th className="px-3 py-2 font-semibold">Job</th>
                                                <th className="px-3 py-2 font-semibold">Status</th>
                                                <th className="px-3 py-2 font-semibold">%</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.jobs.recent.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={3}
                                                        className="px-3 py-6 text-center text-secondary"
                                                    >
                                                        Belum ada job terbaru
                                                    </td>
                                                </tr>
                                            ) : (
                                                data.jobs.recent.map((j) => (
                                                    <tr
                                                        key={String(j.id)}
                                                        className="border-t border-border/70"
                                                    >
                                                        <td className="px-3 py-2">
                                                            <p className="font-medium text-foreground">
                                                                {j.kind}
                                                            </p>
                                                            <p className="text-xs text-secondary">
                                                                {j.message || String(j.id).slice(0, 8)}
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-2 capitalize text-secondary">
                                                            {j.status}
                                                        </td>
                                                        <td className="px-3 py-2 font-semibold text-foreground">
                                                            {j.percent}%
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    </>
                ) : null}
            </div>
        </DashboardLayout>
    );
}

function MetaCard({
    icon,
    label,
    value,
    hint,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    hint?: string;
}) {
    return (
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-secondary">
                {icon}
                <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="truncate text-lg font-bold text-foreground" title={value}>
                {value}
            </p>
            {hint ? (
                <p className="mt-1 line-clamp-2 text-xs text-secondary" title={hint}>
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

function StatPill({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl bg-muted/70 px-3 py-2 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                {label}
            </p>
            <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
    );
}
