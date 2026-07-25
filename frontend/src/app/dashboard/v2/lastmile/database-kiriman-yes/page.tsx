"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import {
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    Download,
    Loader2,
    PackageCheck,
    RefreshCw,
    Upload,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { API_URL } from "@/config";

const DB_COLS = [
    "CLOSE - CANCEL",
    "CLOSE - RETURN",
    "CLOSE - SUCCESS",
    "UNDEL",
    "UN IM",
    "UN RCC",
    "UN OM",
] as const;

const OTS_COLS = ["UNDEL", "UN IM", "UN RCC", "UN OM"] as const;

type DbRow = {
    Cabang: string;
    "Grand Total": number;
} & Record<(typeof DB_COLS)[number], number>;

type OtsCity = {
    Cabang: string;
    "Grand Total": number;
} & Record<(typeof OTS_COLS)[number], number>;

type OtsGroup = {
    lt: string;
    cities: OtsCity[];
    metrics: OtsCity;
};

type DbPivot = {
    rows: DbRow[];
    grand_total: DbRow;
    status_options: string[];
};

type OtsPivot = {
    groups: OtsGroup[];
    grand_total: OtsCity;
    status_options: string[];
};

function isCloseCol(col: string) {
    return col.startsWith("CLOSE");
}

function headerClass(col: string) {
    if (col === "Cabang") return "bg-black text-white";
    if (isCloseCol(col)) return "bg-emerald-700 text-white";
    return "bg-red-700 text-white";
}

async function fetchPivot(
    token: string,
    table: "database" | "ots",
    statusPod: string
) {
    const params = new URLSearchParams({ table });
    if (statusPod && statusPod !== "(All)") params.set("status_pod", statusPod);
    const res = await fetch(`${API_URL}/api/kiriman-yes/pivot?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Gagal memuat pivot" }));
        throw new Error(err.detail || "Gagal memuat pivot");
    }
    return res.json();
}

export default function DatabaseKirimanYesPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [statusOptions, setStatusOptions] = useState<string[]>([]);
    const [statusPodDb, setStatusPodDb] = useState("(All)");
    const [statusPodOts, setStatusPodOts] = useState("(All)");

    const [dbPivot, setDbPivot] = useState<DbPivot | null>(null);
    const [otsPivot, setOtsPivot] = useState<OtsPivot | null>(null);
    const [loadingDb, setLoadingDb] = useState(true);
    const [loadingOts, setLoadingOts] = useState(true);

    const [uploading, setUploading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [hasFile, setHasFile] = useState(false);
    const [fileMeta, setFileMeta] = useState({ lastUpdate: "-", filename: "-" });
    const [expandedLt, setExpandedLt] = useState<Record<string, boolean>>({});

    const fetchMeta = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/system-info`);
            if (!res.ok) return;
            const info = await res.json();
            if (info.kiriman_yes_last_update) {
                const d = new Date(info.kiriman_yes_last_update);
                setFileMeta({
                    lastUpdate:
                        d.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                        }) +
                        " \u2022 " +
                        d.toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                        }),
                    filename: info.kiriman_yes_filename || "-",
                });
                setHasFile(true);
            } else {
                setFileMeta({ lastUpdate: "-", filename: "-" });
                setHasFile(false);
            }
        } catch {
            /* ignore */
        }
    }, []);

    const loadDb = useCallback(
        async (status: string) => {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/");
                return;
            }
            setLoadingDb(true);
            try {
                const data = (await fetchPivot(token, "database", status)) as DbPivot;
                setDbPivot(data);
                if (data.status_options?.length) setStatusOptions(data.status_options);
            } catch (e) {
                showToast(
                    `Gagal memuat DATABASE: ${e instanceof Error ? e.message : "error"}`,
                    "error"
                );
            } finally {
                setLoadingDb(false);
            }
        },
        [router, showToast]
    );

    const loadOts = useCallback(
        async (status: string) => {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/");
                return;
            }
            setLoadingOts(true);
            try {
                const data = (await fetchPivot(token, "ots", status)) as OtsPivot;
                setOtsPivot(data);
                if (data.status_options?.length) setStatusOptions(data.status_options);
                const open: Record<string, boolean> = {};
                (data.groups || []).forEach((g) => {
                    open[g.lt] = true;
                });
                setExpandedLt(open);
            } catch (e) {
                showToast(
                    `Gagal memuat OTS: ${e instanceof Error ? e.message : "error"}`,
                    "error"
                );
            } finally {
                setLoadingOts(false);
            }
        },
        [router, showToast]
    );

    const refreshAll = useCallback(async () => {
        await fetchMeta();
        await Promise.all([loadDb(statusPodDb), loadOts(statusPodOts)]);
    }, [fetchMeta, loadDb, loadOts, statusPodDb, statusPodOts]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/");
            return;
        }
        fetchMeta();
        loadDb("(All)");
        loadOts("(All)");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const handleUpload = async (file: File) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch(`${API_URL}/upload-kiriman-yes`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: form,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Upload gagal" }));
                throw new Error(err.detail || "Upload gagal");
            }
            const body = await res.json();
            showToast(`Upload berhasil — ${body.rows} baris.`, "success");
            await refreshAll();
        } catch (e) {
            showToast(`Upload gagal: ${e instanceof Error ? e.message : "error"}`, "error");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDownload = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setDownloading(true);
        try {
            const res = await fetch(`${API_URL}/download/kiriman-yes`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Download gagal" }));
                throw new Error(err.detail || "Download gagal");
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "database_kiriman_yes.csv";
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            showToast(`Download gagal: ${e instanceof Error ? e.message : "error"}`, "error");
        } finally {
            setDownloading(false);
        }
    };

    const th = "border border-black/40 px-2 py-2 text-center text-xs font-semibold whitespace-nowrap";
    const td = "border border-black/20 px-2 py-1.5 text-sm whitespace-nowrap bg-[#f5f0e6]";
    const tdNum = `${td} text-right tabular-nums`;
    const foot = "border border-black/40 bg-black px-2 py-2 text-xs font-bold text-white whitespace-nowrap";

    const statusSelect = (
        id: string,
        value: string,
        onChange: (v: string) => void
    ) => (
        <div className="flex items-center gap-2">
            <label htmlFor={id} className="text-xs font-semibold text-foreground">
                STATUS POD
            </label>
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="min-w-[160px] rounded border border-border bg-white px-2 py-1 text-xs"
            >
                <option value="(All)">(All)</option>
                {statusOptions.map((s) => (
                    <option key={s} value={s}>
                        {s}
                    </option>
                ))}
            </select>
        </div>
    );

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-[1400px] space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <Link
                            href="/dashboard/v2/lastmile"
                            className="group mb-4 inline-flex items-center text-muted-foreground transition-colors hover:text-primary"
                        >
                            <ArrowLeft className="mr-2 size-4 transition-transform group-hover:-translate-x-1" />
                            Back to Lastmile Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Database Kiriman Yes
                        </h1>
                        <p className="mt-2 text-sm text-secondary">
                            Upload master data, lalu lihat pivot DATABASE &amp; OTS dengan filter STATUS POD.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => refreshAll()}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                    >
                        <RefreshCw className="size-4" />
                        Refresh
                    </button>
                </div>

                {/* Upload */}
                <div className="rounded-2xl border border-border bg-white p-5 space-y-3">
                    <div>
                        <p className="text-sm font-semibold text-foreground">
                            Upload Master Data Kiriman Yes
                        </p>
                        <p className="mt-1 text-xs text-secondary">
                            Format .xlsx / .xls / .csv — kolom Cabang, STATUS POD, LT (untuk OTS) dideteksi otomatis.
                        </p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload(f);
                        }}
                    />
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {uploading ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Upload className="size-4" />
                            )}
                            {uploading ? "Uploading..." : "Upload"}
                        </button>
                        <button
                            type="button"
                            disabled={downloading || !hasFile}
                            onClick={handleDownload}
                            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
                        >
                            {downloading ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Download className="size-4" />
                            )}
                            Download
                        </button>
                        <div className="text-xs text-secondary">
                            <span className="font-medium text-foreground">{fileMeta.filename}</span>
                            {" · "}
                            {fileMeta.lastUpdate}
                        </div>
                    </div>
                </div>

                {/* Pivots */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {/* DATABASE */}
                    <div className="overflow-hidden border border-border bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-[#f5f0e6] px-3 py-2">
                            <div className="flex items-center gap-2">
                                <PackageCheck className="size-4 text-emerald-700" />
                                <span className="text-sm font-bold uppercase tracking-wide">
                                    DATABASE
                                </span>
                                {loadingDb && <Loader2 className="size-3.5 animate-spin" />}
                            </div>
                            {statusSelect("status-pod-db", statusPodDb, (v) => {
                                setStatusPodDb(v);
                                loadDb(v);
                            })}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className={`${th} ${headerClass("Cabang")} text-left`}>
                                            Cabang
                                        </th>
                                        {DB_COLS.map((c) => (
                                            <th key={c} className={`${th} ${headerClass(c)}`}>
                                                {c}
                                            </th>
                                        ))}
                                        <th className={`${th} bg-black text-white`}>Grand Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!loadingDb && (!dbPivot || dbPivot.rows.length === 0) && (
                                        <tr>
                                            <td
                                                colSpan={DB_COLS.length + 2}
                                                className="px-4 py-10 text-center text-secondary"
                                            >
                                                Belum ada data. Upload master terlebih dahulu.
                                            </td>
                                        </tr>
                                    )}
                                    {dbPivot?.rows.map((row) => (
                                        <tr key={row.Cabang}>
                                            <td className={`${td} font-medium`}>{row.Cabang}</td>
                                            {DB_COLS.map((c) => (
                                                <td key={c} className={tdNum}>
                                                    {row[c] || 0}
                                                </td>
                                            ))}
                                            <td className={`${tdNum} font-semibold`}>
                                                {row["Grand Total"] || 0}
                                            </td>
                                        </tr>
                                    ))}
                                    {dbPivot && (
                                        <tr>
                                            <td className={`${foot} text-left`}>Grand Total</td>
                                            {DB_COLS.map((c) => (
                                                <td key={c} className={`${foot} text-right`}>
                                                    {dbPivot.grand_total[c] || 0}
                                                </td>
                                            ))}
                                            <td className={`${foot} text-right`}>
                                                {dbPivot.grand_total["Grand Total"] || 0}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* OTS */}
                    <div className="overflow-hidden border border-border bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-[#f5f0e6] px-3 py-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold uppercase tracking-wide">OTS</span>
                                {loadingOts && <Loader2 className="size-3.5 animate-spin" />}
                            </div>
                            {statusSelect("status-pod-ots", statusPodOts, (v) => {
                                setStatusPodOts(v);
                                loadOts(v);
                            })}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className={`${th} bg-black text-white text-left`}>
                                            Cabang
                                        </th>
                                        {OTS_COLS.map((c) => (
                                            <th key={c} className={`${th} ${headerClass(c)}`}>
                                                {c}
                                            </th>
                                        ))}
                                        <th className={`${th} bg-black text-white`}>Grand Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!loadingOts &&
                                        (!otsPivot || otsPivot.groups.length === 0) && (
                                            <tr>
                                                <td
                                                    colSpan={OTS_COLS.length + 2}
                                                    className="px-4 py-10 text-center text-secondary"
                                                >
                                                    Belum ada data OTS. Pastikan kolom LT &amp; STATUS POD ada.
                                                </td>
                                            </tr>
                                        )}
                                    {otsPivot?.groups.map((group) => {
                                        const open = expandedLt[group.lt];
                                        const m = group.metrics;
                                        return (
                                            <Fragment key={group.lt}>
                                                <tr>
                                                    <td className={`${td} font-semibold text-blue-700`}>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setExpandedLt((p) => ({
                                                                    ...p,
                                                                    [group.lt]: !p[group.lt],
                                                                }))
                                                            }
                                                            className="inline-flex items-center gap-1"
                                                        >
                                                            {open ? (
                                                                <ChevronDown className="size-4" />
                                                            ) : (
                                                                <ChevronRight className="size-4" />
                                                            )}
                                                            {group.lt}
                                                        </button>
                                                    </td>
                                                    {OTS_COLS.map((c) => (
                                                        <td key={c} className={`${tdNum} font-semibold`}>
                                                            {m[c] || 0}
                                                        </td>
                                                    ))}
                                                    <td className={`${tdNum} font-semibold`}>
                                                        {m["Grand Total"] || 0}
                                                    </td>
                                                </tr>
                                                {open &&
                                                    group.cities.map((city) => (
                                                        <tr key={`${group.lt}-${city.Cabang}`}>
                                                            <td className={`${td} pl-8 text-secondary`}>
                                                                {city.Cabang}
                                                            </td>
                                                            {OTS_COLS.map((c) => (
                                                                <td key={c} className={tdNum}>
                                                                    {city[c] || 0}
                                                                </td>
                                                            ))}
                                                            <td className={tdNum}>
                                                                {city["Grand Total"] || 0}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </Fragment>
                                        );
                                    })}
                                    {otsPivot && (
                                        <tr>
                                            <td className={`${foot} text-left`}>Grand Total</td>
                                            {OTS_COLS.map((c) => (
                                                <td key={c} className={`${foot} text-right`}>
                                                    {otsPivot.grand_total[c] || 0}
                                                </td>
                                            ))}
                                            <td className={`${foot} text-right`}>
                                                {otsPivot.grand_total["Grand Total"] || 0}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
