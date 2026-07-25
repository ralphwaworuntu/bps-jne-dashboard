"use client";

import { useCallback, useEffect, useRef, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import {
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    Download,
    Loader2,
    RefreshCw,
    Upload,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { API_URL } from "@/config";

type MetricPair = { awb: number; pct: number };

type TrRccMetrics = {
    h0: MetricPair;
    h1_lt_12: MetricPair;
    wrong_date: MetricPair;
    total_awb: number;
    total_pct: number;
};

type RccOmMetrics = {
    h0: MetricPair;
    h1_lt_12: MetricPair;
    h1_gt_12: MetricPair;
    wrong_date: MetricPair;
    h2: MetricPair;
    total_awb: number;
    total_pct: number;
};

type DateGroupTr = {
    date: string;
    cities: { name: string; metrics: TrRccMetrics }[];
    metrics: TrRccMetrics;
};

type DateGroupOm = {
    date: string;
    cities: { name: string; metrics: RccOmMetrics }[];
    metrics: RccOmMetrics;
};

type ReportPayload = {
    services: string[];
    lt_tr_rcc: DateGroupTr[];
    lt_rcc_om: DateGroupOm[];
    grand_total: {
        lt_tr_rcc: TrRccMetrics;
        lt_rcc_om: RccOmMetrics;
    };
};

function formatPct(n: number) {
    return `${(n ?? 0).toFixed(2).replace(".", ",")}%`;
}

function formatAwb(n: number) {
    return String(n ?? 0);
}

async function fetchReport(token: string, selectedService: string): Promise<ReportPayload> {
    const params = new URLSearchParams();
    if (selectedService && selectedService !== "(All)") {
        params.set("service", selectedService);
    }
    const qs = params.toString();
    const url = `${API_URL}/api/firstmile-report${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Gagal memuat report" }));
        throw new Error(err.detail || "Gagal memuat report");
    }
    return res.json();
}

export default function ReportFirstmilePage() {
    const router = useRouter();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [services, setServices] = useState<string[]>([]);
    const [serviceTr, setServiceTr] = useState("(All)");
    const [serviceOm, setServiceOm] = useState("(All)");

    const [rowsTr, setRowsTr] = useState<DateGroupTr[]>([]);
    const [grandTr, setGrandTr] = useState<TrRccMetrics | null>(null);
    const [rowsOm, setRowsOm] = useState<DateGroupOm[]>([]);
    const [grandOm, setGrandOm] = useState<RccOmMetrics | null>(null);

    const [loadingTr, setLoadingTr] = useState(true);
    const [loadingOm, setLoadingOm] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [fileMeta, setFileMeta] = useState<{ lastUpdate: string; filename: string }>({
        lastUpdate: "-",
        filename: "-",
    });
    const [hasFile, setHasFile] = useState(false);

    const [expandedTr, setExpandedTr] = useState<Record<string, boolean>>({});
    const [expandedOm, setExpandedOm] = useState<Record<string, boolean>>({});

    const fetchFileMeta = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/system-info`);
            if (!res.ok) return;
            const info = await res.json();
            if (info.master_report_last_update) {
                const d = new Date(info.master_report_last_update);
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
                    filename: info.master_report_filename || "-",
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

    const loadTr = useCallback(
        async (selectedService: string) => {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/");
                return;
            }
            setLoadingTr(true);
            try {
                const data = await fetchReport(token, selectedService);
                setServices(data.services || []);
                setRowsTr(data.lt_tr_rcc || []);
                setGrandTr(data.grand_total?.lt_tr_rcc ?? null);
                const open: Record<string, boolean> = {};
                (data.lt_tr_rcc || []).forEach((g) => {
                    open[g.date] = true;
                });
                setExpandedTr(open);
            } catch (e) {
                showToast(
                    `Gagal memuat LT TR-RCC: ${e instanceof Error ? e.message : "error"}`,
                    "error"
                );
            } finally {
                setLoadingTr(false);
            }
        },
        [router, showToast]
    );

    const loadOm = useCallback(
        async (selectedService: string) => {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/");
                return;
            }
            setLoadingOm(true);
            try {
                const data = await fetchReport(token, selectedService);
                setServices(data.services || []);
                setRowsOm(data.lt_rcc_om || []);
                setGrandOm(data.grand_total?.lt_rcc_om ?? null);
                const open: Record<string, boolean> = {};
                (data.lt_rcc_om || []).forEach((g) => {
                    open[g.date] = true;
                });
                setExpandedOm(open);
            } catch (e) {
                showToast(
                    `Gagal memuat LT RCC-OM: ${e instanceof Error ? e.message : "error"}`,
                    "error"
                );
            } finally {
                setLoadingOm(false);
            }
        },
        [router, showToast]
    );

    const refreshAll = useCallback(async () => {
        await fetchFileMeta();
        await Promise.all([loadTr(serviceTr), loadOm(serviceOm)]);
    }, [fetchFileMeta, loadTr, loadOm, serviceTr, serviceOm]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/");
            return;
        }
        fetchFileMeta();
        loadTr("(All)");
        loadOm("(All)");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const handleUpload = async (file: File) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch(`${API_URL}/upload-master-report-firstmile`, {
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
            const res = await fetch(`${API_URL}/download/master-report-firstmile`, {
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
            a.download = "master_report_firstmile.csv";
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

    const th =
        "border border-black/20 bg-[#b8cce4] px-2 py-2 text-center text-xs font-semibold text-foreground whitespace-nowrap";
    const thTop =
        "border border-black/20 bg-[#b8cce4] px-2 py-2 text-center text-xs font-bold text-foreground whitespace-nowrap";
    const td = "border border-black/15 px-2 py-1.5 text-sm text-foreground whitespace-nowrap";
    const tdNum = `${td} text-right tabular-nums`;
    const sectionBar =
        "flex flex-wrap items-center justify-between gap-3 bg-[#ffff99] border border-black/20 px-3 py-2 text-sm font-bold text-foreground";

    const serviceSelect = (
        id: string,
        value: string,
        onChange: (v: string) => void
    ) => (
        <div className="flex items-center gap-2 font-normal">
            <label htmlFor={id} className="text-xs font-semibold text-foreground">
                Service
            </label>
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="min-w-[140px] rounded border border-black/20 bg-white px-2 py-1 text-xs font-medium"
            >
                <option value="(All)">(All)</option>
                {services.map((s) => (
                    <option key={s} value={s}>
                        {s}
                    </option>
                ))}
            </select>
        </div>
    );

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <Link
                            href="/dashboard/v2/firstmile"
                            className="group mb-4 inline-flex items-center text-muted-foreground transition-colors hover:text-primary"
                        >
                            <ArrowLeft className="mr-2 size-4 transition-transform group-hover:-translate-x-1" />
                            Back to Firstmile Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Report Firstmile
                        </h1>
                        <p className="mt-2 text-sm text-secondary">
                            Upload master data, lalu filter Service per tabel pivot LT.
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

                {/* Upload Master Data Report */}
                <div className="rounded-2xl border border-border bg-white p-5 space-y-3">
                    <div>
                        <p className="text-sm font-semibold text-foreground">
                            Upload Master Data Report
                        </p>
                        <p className="mt-1 text-xs text-secondary">
                            Format .xlsx / .xls / .csv — kolom Service, Tanggal, Kota dideteksi otomatis.
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
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
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

                {/* TABLE A: LT TR - RCC */}
                <div className="overflow-hidden rounded-xl border border-border bg-white">
                    <div className={sectionBar}>
                        <div className="flex items-center gap-2">
                            <span className="rounded border border-black/20 bg-white px-2 py-0.5 text-xs font-semibold">
                                LT
                            </span>
                            <span>LT TR - RCC</span>
                            {loadingTr && (
                                <Loader2 className="size-3.5 animate-spin text-secondary" />
                            )}
                        </div>
                        {serviceSelect("service-tr-rcc", serviceTr, (v) => {
                            setServiceTr(v);
                            loadTr(v);
                        })}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr>
                                    <th rowSpan={2} className={thTop} />
                                    <th colSpan={2} className={thTop}>
                                        H+0
                                    </th>
                                    <th colSpan={2} className={thTop}>
                                        H+1 &lt;12:00
                                    </th>
                                    <th colSpan={2} className={thTop}>
                                        WRONG DATE
                                    </th>
                                    <th rowSpan={2} className={thTop}>
                                        Total AWB
                                    </th>
                                    <th rowSpan={2} className={thTop}>
                                        Total %
                                    </th>
                                </tr>
                                <tr>
                                    <th className={th}>AWB</th>
                                    <th className={th}>%</th>
                                    <th className={th}>AWB</th>
                                    <th className={th}>%</th>
                                    <th className={th}>AWB</th>
                                    <th className={th}>%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!loadingTr && rowsTr.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-10 text-center text-secondary">
                                            Belum ada data. Upload Master Data Report di atas.
                                        </td>
                                    </tr>
                                )}
                                {rowsTr.map((group) => {
                                    const open = expandedTr[group.date];
                                    const m = group.metrics;
                                    return (
                                        <Fragment key={`tr-date-${group.date}`}>
                                            <tr className="bg-white">
                                                <td className={td}>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setExpandedTr((p) => ({
                                                                ...p,
                                                                [group.date]: !p[group.date],
                                                            }))
                                                        }
                                                        className="inline-flex items-center gap-1 font-semibold"
                                                    >
                                                        {open ? (
                                                            <ChevronDown className="size-4" />
                                                        ) : (
                                                            <ChevronRight className="size-4" />
                                                        )}
                                                        {group.date}
                                                    </button>
                                                </td>
                                                <td className={tdNum}>{formatAwb(m.h0.awb)}</td>
                                                <td className={tdNum}>{formatPct(m.h0.pct)}</td>
                                                <td className={tdNum}>{formatAwb(m.h1_lt_12.awb)}</td>
                                                <td className={tdNum}>{formatPct(m.h1_lt_12.pct)}</td>
                                                <td className={tdNum}>{formatAwb(m.wrong_date.awb)}</td>
                                                <td className={tdNum}>{formatPct(m.wrong_date.pct)}</td>
                                                <td className={`${tdNum} font-semibold`}>
                                                    {formatAwb(m.total_awb)}
                                                </td>
                                                <td className={`${tdNum} font-semibold`}>
                                                    {formatPct(m.total_pct)}
                                                </td>
                                            </tr>
                                            {open &&
                                                group.cities.map((city) => {
                                                    const cm = city.metrics;
                                                    return (
                                                        <tr key={`tr-${group.date}-${city.name}`}>
                                                            <td className={`${td} pl-8 text-secondary`}>
                                                                {city.name}
                                                            </td>
                                                            <td className={tdNum}>{formatAwb(cm.h0.awb)}</td>
                                                            <td className={tdNum}>{formatPct(cm.h0.pct)}</td>
                                                            <td className={tdNum}>
                                                                {formatAwb(cm.h1_lt_12.awb)}
                                                            </td>
                                                            <td className={tdNum}>
                                                                {formatPct(cm.h1_lt_12.pct)}
                                                            </td>
                                                            <td className={tdNum}>
                                                                {formatAwb(cm.wrong_date.awb)}
                                                            </td>
                                                            <td className={tdNum}>
                                                                {formatPct(cm.wrong_date.pct)}
                                                            </td>
                                                            <td className={tdNum}>{formatAwb(cm.total_awb)}</td>
                                                            <td className={tdNum}>{formatPct(cm.total_pct)}</td>
                                                        </tr>
                                                    );
                                                })}
                                        </Fragment>
                                    );
                                })}
                                {grandTr && (
                                    <tr className="bg-[#dce6f1] font-bold">
                                        <td className={td}>Grand Total</td>
                                        <td className={tdNum}>{formatAwb(grandTr.h0.awb)}</td>
                                        <td className={tdNum}>{formatPct(grandTr.h0.pct)}</td>
                                        <td className={tdNum}>{formatAwb(grandTr.h1_lt_12.awb)}</td>
                                        <td className={tdNum}>{formatPct(grandTr.h1_lt_12.pct)}</td>
                                        <td className={tdNum}>{formatAwb(grandTr.wrong_date.awb)}</td>
                                        <td className={tdNum}>{formatPct(grandTr.wrong_date.pct)}</td>
                                        <td className={tdNum}>{formatAwb(grandTr.total_awb)}</td>
                                        <td className={tdNum}>{formatPct(grandTr.total_pct)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* TABLE B: LT RCC - OM */}
                <div className="overflow-hidden rounded-xl border border-border bg-white">
                    <div className={sectionBar}>
                        <div className="flex items-center gap-2">
                            <span className="rounded border border-black/20 bg-white px-2 py-0.5 text-xs font-semibold">
                                LT
                            </span>
                            <span>LT RCC - OM</span>
                            {loadingOm && (
                                <Loader2 className="size-3.5 animate-spin text-secondary" />
                            )}
                        </div>
                        {serviceSelect("service-rcc-om", serviceOm, (v) => {
                            setServiceOm(v);
                            loadOm(v);
                        })}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr>
                                    <th rowSpan={2} className={thTop} />
                                    <th colSpan={2} className={thTop}>
                                        H+0
                                    </th>
                                    <th colSpan={2} className={thTop}>
                                        H+1 &lt;12:00
                                    </th>
                                    <th colSpan={2} className={thTop}>
                                        H+1 &gt;12:00
                                    </th>
                                    <th colSpan={2} className={thTop}>
                                        WRONG DATE
                                    </th>
                                    <th colSpan={2} className={thTop}>
                                        H+2
                                    </th>
                                    <th rowSpan={2} className={thTop}>
                                        Total AWB
                                    </th>
                                    <th rowSpan={2} className={thTop}>
                                        Total %
                                    </th>
                                </tr>
                                <tr>
                                    <th className={th}>AWB</th>
                                    <th className={th}>%</th>
                                    <th className={th}>AWB</th>
                                    <th className={th}>%</th>
                                    <th className={th}>AWB</th>
                                    <th className={th}>%</th>
                                    <th className={th}>AWB</th>
                                    <th className={th}>%</th>
                                    <th className={th}>AWB</th>
                                    <th className={th}>%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!loadingOm && rowsOm.length === 0 && (
                                    <tr>
                                        <td colSpan={13} className="px-4 py-10 text-center text-secondary">
                                            Belum ada data. Upload Master Data Report di atas.
                                        </td>
                                    </tr>
                                )}
                                {rowsOm.map((group) => {
                                    const open = expandedOm[group.date];
                                    const m = group.metrics;
                                    return (
                                        <Fragment key={`om-date-${group.date}`}>
                                            <tr>
                                                <td className={td}>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setExpandedOm((p) => ({
                                                                ...p,
                                                                [group.date]: !p[group.date],
                                                            }))
                                                        }
                                                        className="inline-flex items-center gap-1 font-semibold"
                                                    >
                                                        {open ? (
                                                            <ChevronDown className="size-4" />
                                                        ) : (
                                                            <ChevronRight className="size-4" />
                                                        )}
                                                        {group.date}
                                                    </button>
                                                </td>
                                                <td className={tdNum}>{formatAwb(m.h0.awb)}</td>
                                                <td className={tdNum}>{formatPct(m.h0.pct)}</td>
                                                <td className={tdNum}>{formatAwb(m.h1_lt_12.awb)}</td>
                                                <td className={tdNum}>{formatPct(m.h1_lt_12.pct)}</td>
                                                <td className={tdNum}>{formatAwb(m.h1_gt_12.awb)}</td>
                                                <td className={tdNum}>{formatPct(m.h1_gt_12.pct)}</td>
                                                <td className={tdNum}>{formatAwb(m.wrong_date.awb)}</td>
                                                <td className={tdNum}>{formatPct(m.wrong_date.pct)}</td>
                                                <td className={tdNum}>{formatAwb(m.h2.awb)}</td>
                                                <td className={tdNum}>{formatPct(m.h2.pct)}</td>
                                                <td className={`${tdNum} font-semibold`}>
                                                    {formatAwb(m.total_awb)}
                                                </td>
                                                <td className={`${tdNum} font-semibold`}>
                                                    {formatPct(m.total_pct)}
                                                </td>
                                            </tr>
                                            {open &&
                                                group.cities.map((city) => {
                                                    const cm = city.metrics;
                                                    return (
                                                        <tr key={`om-${group.date}-${city.name}`}>
                                                            <td className={`${td} pl-8 text-secondary`}>
                                                                {city.name}
                                                            </td>
                                                            <td className={tdNum}>{formatAwb(cm.h0.awb)}</td>
                                                            <td className={tdNum}>{formatPct(cm.h0.pct)}</td>
                                                            <td className={tdNum}>
                                                                {formatAwb(cm.h1_lt_12.awb)}
                                                            </td>
                                                            <td className={tdNum}>
                                                                {formatPct(cm.h1_lt_12.pct)}
                                                            </td>
                                                            <td className={tdNum}>
                                                                {formatAwb(cm.h1_gt_12.awb)}
                                                            </td>
                                                            <td className={tdNum}>
                                                                {formatPct(cm.h1_gt_12.pct)}
                                                            </td>
                                                            <td className={tdNum}>
                                                                {formatAwb(cm.wrong_date.awb)}
                                                            </td>
                                                            <td className={tdNum}>
                                                                {formatPct(cm.wrong_date.pct)}
                                                            </td>
                                                            <td className={tdNum}>{formatAwb(cm.h2.awb)}</td>
                                                            <td className={tdNum}>{formatPct(cm.h2.pct)}</td>
                                                            <td className={tdNum}>{formatAwb(cm.total_awb)}</td>
                                                            <td className={tdNum}>{formatPct(cm.total_pct)}</td>
                                                        </tr>
                                                    );
                                                })}
                                        </Fragment>
                                    );
                                })}
                                {grandOm && (
                                    <tr className="bg-[#dce6f1] font-bold">
                                        <td className={td}>Grand Total</td>
                                        <td className={tdNum}>{formatAwb(grandOm.h0.awb)}</td>
                                        <td className={tdNum}>{formatPct(grandOm.h0.pct)}</td>
                                        <td className={tdNum}>{formatAwb(grandOm.h1_lt_12.awb)}</td>
                                        <td className={tdNum}>{formatPct(grandOm.h1_lt_12.pct)}</td>
                                        <td className={tdNum}>{formatAwb(grandOm.h1_gt_12.awb)}</td>
                                        <td className={tdNum}>{formatPct(grandOm.h1_gt_12.pct)}</td>
                                        <td className={tdNum}>{formatAwb(grandOm.wrong_date.awb)}</td>
                                        <td className={tdNum}>{formatPct(grandOm.wrong_date.pct)}</td>
                                        <td className={tdNum}>{formatAwb(grandOm.h2.awb)}</td>
                                        <td className={tdNum}>{formatPct(grandOm.h2.pct)}</td>
                                        <td className={tdNum}>{formatAwb(grandOm.total_awb)}</td>
                                        <td className={tdNum}>{formatPct(grandOm.total_pct)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
