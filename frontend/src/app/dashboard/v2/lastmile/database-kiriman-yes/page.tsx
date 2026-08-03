"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import ShipmentRowsTable, {
    type DetailRow,
} from "@/app/dashboard/v2/lastmile/all-shipment/inbound/ShipmentRowsTable";
import { KIRIMAN_YES_DETAIL_COLUMNS } from "./kirimanYesColumns";
import {
    ArrowLeft,
    CalendarDays,
    ChevronDown,
    ChevronRight,
    Download,
    Loader2,
    PackageCheck,
    Plus,
    RefreshCw,
    Upload,
    X,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { API_URL } from "@/config";
import {
    stageLabel,
    uploadFormWithJobProgress,
} from "@/lib/uploadJobProgress";

function todayIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatIdDate(iso: string) {
    if (!iso) return "Semua tanggal";
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function formatBytes(n: number) {
    if (!n) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i += 1;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const DB_COLS_FALLBACK = [
    "CLOSE - SUCCESS",
    "CLOSE - CANCEL",
    "UNDEL",
    "CLOSE - RETURN",
    "ON DELIVERY",
    "UN RUNSHEET",
    "UN INBOUND",
    "UN OM",
    "UN RCC",
] as const;

const OTS_COLS_FALLBACK = [
    "UNDEL",
    "ON DELIVERY",
    "UN RUNSHEET",
    "UN INBOUND",
    "UN OM",
    "UN RCC",
] as const;

type DbRow = {
    Cabang: string;
    Destinasi?: string;
    "Grand Total": number;
} & Record<string, number | string>;

type OtsCity = {
    Cabang: string;
    Destinasi?: string;
    "Grand Total": number;
} & Record<string, number | string>;

type OtsGroup = {
    lt: string;
    cities: OtsCity[];
    metrics: OtsCity;
};

type DbPivot = {
    rows: DbRow[];
    grand_total: DbRow;
    columns?: string[];
    status_options: string[];
};

type OtsPivot = {
    groups: OtsGroup[];
    grand_total: OtsCity;
    columns?: string[];
    status_options: string[];
};

function isCloseCol(col: string) {
    return col.startsWith("CLOSE");
}

function headerClass(col: string) {
    if (col === "Cabang" || col === "Destinasi" || col === "TRANSAKSI - TODAY") {
        return "bg-black text-white";
    }
    if (isCloseCol(col)) return "bg-emerald-700 text-white";
    return "bg-red-700 text-white";
}

async function fetchPivot(
    token: string,
    table: "database" | "ots",
    statusPod: string,
    opts?: {
        cabang?: string;
        origin?: string;
        date?: string;
        periodMode?: "harian" | "bulanan";
        month?: string;
        updateDay?: string;
    }
) {
    const params = new URLSearchParams({ table });
    if (statusPod && statusPod !== "(All)") params.set("status_pod", statusPod);
    if (opts?.cabang && opts.cabang !== "(All)") params.set("cabang", opts.cabang);
    if (opts?.origin && opts.origin !== "(All)") params.set("origin", opts.origin);
    params.set("period_mode", opts?.periodMode || "harian");
    if ((opts?.periodMode || "harian") === "harian") {
        if (opts?.date) params.set("date", opts.date);
    } else {
        if (opts?.month) params.set("month", opts.month);
        if (opts?.updateDay) params.set("update_day", opts.updateDay);
    }
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
    const [filterDate, setFilterDate] = useState(todayIso());
    const [periodMode, setPeriodMode] = useState<"harian" | "bulanan">("harian");
    const [cutoffDay, setCutoffDay] = useState<"2" | "8">("2");
    const [cabangOrigin, setCabangOrigin] = useState("(All)");
    const [originOptions, setOriginOptions] = useState<string[]>([]);
    const [cabang, setCabang] = useState("(All)");
    const [cabangOptions, setCabangOptions] = useState<string[]>([]);
    const [uploadDates, setUploadDates] = useState<string[]>([]);

    const [dbPivot, setDbPivot] = useState<DbPivot | null>(null);
    const [otsPivot, setOtsPivot] = useState<OtsPivot | null>(null);
    const [loadingDb, setLoadingDb] = useState(true);
    const [loadingOts, setLoadingOts] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [uploadPeriodMode, setUploadPeriodMode] = useState<"harian" | "bulanan">("harian");
    const [uploadDate, setUploadDate] = useState(todayIso());
    const [uploadCutoffDay, setUploadCutoffDay] = useState<"2" | "8">("2");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStageLabel, setUploadStageLabel] = useState("Mengunggah…");
    const [downloading, setDownloading] = useState(false);
    const [hasFile, setHasFile] = useState(false);
    const [fileMeta, setFileMeta] = useState({ lastUpdate: "-", filename: "-" });
    const [expandedLt, setExpandedLt] = useState<Record<string, boolean>>({});

    // Detail table (mirip All Inbound / UN RUNSHEET)
    const [detailItems, setDetailItems] = useState<DetailRow[]>([]);
    const [detailTotal, setDetailTotal] = useState(0);
    const [detailPages, setDetailPages] = useState(0);
    const [detailMessage, setDetailMessage] = useState<string | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(1000);
    const [pivotDrill, setPivotDrill] = useState<{
        cabang?: string;
        status_pod?: string;
        lt?: string;
        source: "database" | "ots";
    } | null>(null);
    const [dataEpoch, setDataEpoch] = useState(0);

    const filterMonthValue = filterDate.slice(0, 7);

    const dateHint = useMemo(() => {
        if (periodMode === "bulanan") {
            const [y, m] = filterDate.split("-");
            if (!y || !m) return "Filter bulanan";
            const d = new Date(Number(y), Number(m) - 1, 1);
            return `Periode bulanan: ${d.toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
            })} · Tgl Update ${cutoffDay}`;
        }
        return `Filter harian: ${formatIdDate(filterDate)}`;
    }, [cutoffDay, filterDate, periodMode]);

    const dateLabel = useMemo(() => {
        if (periodMode === "bulanan") {
            const [y, m] = filterDate.split("-");
            if (!y || !m) return filterDate;
            const d = new Date(Number(y), Number(m) - 1, 1);
            const monthLabel = d.toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
            });
            return `${monthLabel} · Tgl Update ${cutoffDay}`;
        }
        return formatIdDate(filterDate);
    }, [cutoffDay, filterDate, periodMode]);

    const periodQuery = useMemo(() => {
        if (periodMode === "bulanan") {
            return {
                periodMode,
                month: filterMonthValue,
                updateDay: cutoffDay,
            } as const;
        }
        return { periodMode, date: filterDate } as const;
    }, [cutoffDay, filterDate, filterMonthValue, periodMode]);

    // Kolom pivot dinamis: hanya PROGRESS yang ada datanya
    const dbCols = useMemo(() => {
        const cols = dbPivot?.columns;
        if (Array.isArray(cols)) return cols;
        return [...DB_COLS_FALLBACK];
    }, [dbPivot]);

    const otsCols = useMemo(() => {
        const cols = otsPivot?.columns;
        if (Array.isArray(cols)) return cols;
        return [...OTS_COLS_FALLBACK];
    }, [otsPivot]);

    const fetchMeta = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/system-info`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
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
                const data = (await fetchPivot(token, "database", status, {
                    cabang,
                    origin: cabangOrigin,
                    ...periodQuery,
                })) as DbPivot & {
                    cabang_options?: string[];
                    origin_options?: string[];
                    upload_dates?: string[];
                };
                setDbPivot(data);
                if (data.status_options?.length) setStatusOptions(data.status_options);
                if (data.cabang_options?.length) setCabangOptions(data.cabang_options);
                if (data.origin_options?.length) setOriginOptions(data.origin_options);
                if (data.upload_dates?.length) setUploadDates(data.upload_dates);
            } catch (e) {
                showToast(
                    `Gagal memuat DATABASE: ${e instanceof Error ? e.message : "error"}`,
                    "error"
                );
            } finally {
                setLoadingDb(false);
            }
        },
        [router, showToast, cabang, cabangOrigin, periodQuery]
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
                const data = (await fetchPivot(token, "ots", status, {
                    cabang,
                    origin: cabangOrigin,
                    ...periodQuery,
                })) as OtsPivot & {
                    cabang_options?: string[];
                    origin_options?: string[];
                    upload_dates?: string[];
                };
                setOtsPivot(data);
                if (data.status_options?.length) setStatusOptions(data.status_options);
                if (data.cabang_options?.length) setCabangOptions(data.cabang_options);
                if (data.origin_options?.length) setOriginOptions(data.origin_options);
                if (data.upload_dates?.length) setUploadDates(data.upload_dates);
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
        [router, showToast, cabang, cabangOrigin, periodQuery]
    );

    const loadDetail = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/");
            return;
        }
        setLoadingDetail(true);
        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                limit: String(pageSize),
                period_mode: periodMode,
            });
            const statusFilter =
                pivotDrill?.status_pod ||
                (statusPodDb !== "(All)" ? statusPodDb : "") ||
                "";
            if (statusFilter) params.set("status_pod", statusFilter);
            const cabangFilter = pivotDrill?.cabang || (cabang !== "(All)" ? cabang : "");
            if (cabangFilter) params.set("cabang", cabangFilter);
            if (cabangOrigin !== "(All)") params.set("origin", cabangOrigin);
            if (pivotDrill?.lt) params.set("lt", pivotDrill.lt);
            if (periodMode === "harian") {
                if (filterDate) params.set("date", filterDate);
            } else {
                params.set("month", filterMonthValue);
                params.set("update_day", cutoffDay);
            }
            if (searchQuery) params.set("q", searchQuery);

            const res = await fetch(
                `${API_URL}/api/kiriman-yes/rows?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Gagal memuat detail" }));
                throw new Error(err.detail || "Gagal memuat detail");
            }
            const data = await res.json();
            setDetailItems(data.items || []);
            setDetailTotal(Number(data.total || 0));
            setDetailPages(Number(data.pages || 0));
            setDetailMessage(data.message || null);
            if (Array.isArray(data.cabang_options)) setCabangOptions(data.cabang_options);
            if (Array.isArray(data.origin_options)) setOriginOptions(data.origin_options);
            if (data.upload_dates?.length) setUploadDates(data.upload_dates);
            if (data.upload_date || data.month || data.meta) {
                setHasFile(true);
                const ts = data.meta?.timestamp
                    ? new Date(data.meta.timestamp).toLocaleString("id-ID")
                    : "-";
                setFileMeta({
                    filename: data.meta?.original_filename || "-",
                    lastUpdate: data.period_label
                        ? `${data.period_label} · ${ts}`
                        : data.upload_date
                          ? `Upload ${formatIdDate(data.upload_date)} · ${ts}`
                          : ts,
                });
            } else if (data.message) {
                setHasFile(false);
            }
        } catch (e) {
            setDetailItems([]);
            setDetailTotal(0);
            setDetailPages(0);
            showToast(
                `Gagal memuat detail: ${e instanceof Error ? e.message : "error"}`,
                "error"
            );
        } finally {
            setLoadingDetail(false);
        }
    }, [
        router,
        showToast,
        currentPage,
        pageSize,
        searchQuery,
        statusPodDb,
        pivotDrill,
        cabang,
        cabangOrigin,
        filterDate,
        filterMonthValue,
        cutoffDay,
        periodMode,
        dataEpoch,
    ]);

    const refreshAll = useCallback(async () => {
        await fetchMeta();
        await Promise.all([
            loadDb(statusPodDb),
            loadOts(statusPodOts),
            loadDetail(),
        ]);
    }, [fetchMeta, loadDb, loadOts, loadDetail, statusPodDb, statusPodOts]);

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

    useEffect(() => {
        // Reload pivot saat filter periode / cabang berubah / setelah upload
        void loadDb(statusPodDb);
        void loadOts(statusPodOts);
        setCurrentPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterDate, filterMonthValue, cutoffDay, periodMode, cabang, cabangOrigin, dataEpoch]);

    useEffect(() => {
        const t = window.setTimeout(() => {
            setSearchQuery(searchInput.trim());
            setCurrentPage(1);
        }, 350);
        return () => window.clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        void loadDetail();
    }, [loadDetail]);

    const pivotExternalFilters = useMemo(() => {
        if (!pivotDrill) return {};
        const f: Record<string, string> = {};
        if (pivotDrill.cabang) {
            f.Destinasi = pivotDrill.cabang;
        }
        if (pivotDrill.status_pod) {
            f.STATUS_POD = pivotDrill.status_pod;
            f.PROGRESS = pivotDrill.status_pod;
        }
        if (pivotDrill.lt) {
            f["TRANSAKSI - TODAY"] = pivotDrill.lt;
        }
        return f;
    }, [pivotDrill]);

    const pivotExternalLabel = useMemo(() => {
        if (!pivotDrill) return null;
        const parts = [
            pivotDrill.source === "database" ? "DATABASE" : "OTS",
        ];
        if (pivotDrill.cabang) parts.push(`Cabang = ${pivotDrill.cabang}`);
        if (pivotDrill.status_pod) parts.push(`STATUS POD = ${pivotDrill.status_pod}`);
        if (pivotDrill.lt) parts.push(`LT = ${pivotDrill.lt}`);
        return parts.join(" · ");
    }, [pivotDrill]);

    const applyDbDrill = (cabang?: string, statusCol?: string) => {
        setPivotDrill({
            source: "database",
            cabang: cabang || undefined,
            status_pod:
                statusCol ||
                (statusPodDb !== "(All)" ? statusPodDb : undefined),
        });
        setCurrentPage(1);
    };

    const applyOtsDrill = (lt?: string, cabang?: string, statusCol?: string) => {
        setPivotDrill({
            source: "ots",
            lt: lt || undefined,
            cabang: cabang || undefined,
            status_pod:
                statusCol ||
                (statusPodOts !== "(All)" ? statusPodOts : undefined),
        });
        setCurrentPage(1);
    };

    const openTambahData = () => {
        setUploadPeriodMode(periodMode);
        setUploadDate(filterDate || todayIso());
        setUploadCutoffDay(cutoffDay);
        setSelectedFile(null);
        setIsDraggingFile(false);
        setUploadProgress(0);
        setModalOpen(true);
    };

    const closeModal = () => {
        if (uploading) return;
        setModalOpen(false);
        setSelectedFile(null);
        setUploadProgress(0);
        setIsDraggingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const acceptUploadFile = (file: File | null | undefined) => {
        if (!file) return;
        const lower = file.name.toLowerCase();
        if (
            !lower.endsWith(".csv") &&
            !lower.endsWith(".xlsx") &&
            !lower.endsWith(".xls")
        ) {
            showToast("Format file harus .csv / .xlsx / .xls", "error");
            return;
        }
        setSelectedFile(file);
    };

    const handleUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        e.target.value = "";
        acceptUploadFile(file);
    };

    const handleDropZoneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (uploading) return;
        setIsDraggingFile(true);
    };

    const handleDropZoneDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingFile(false);
    };

    const handleDropZoneDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingFile(false);
        if (uploading) return;
        acceptUploadFile(e.dataTransfer.files?.[0]);
    };

    const handleUploadSubmit = async () => {
        if (!selectedFile) {
            showToast("Pilih file Kiriman Yes terlebih dahulu", "error");
            return;
        }
        if (uploadPeriodMode === "harian" && !uploadDate) {
            showToast("Pilih tanggal data harian", "error");
            return;
        }
        if (uploadPeriodMode === "bulanan" && !uploadCutoffDay) {
            showToast("Pilih Tgl Update (Tgl 2 atau Tgl 8)", "error");
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setUploadStageLabel("Mengunggah…");
        try {
            const form = new FormData();
            form.append("file", selectedFile);
            form.append("period_mode", uploadPeriodMode);
            if (uploadPeriodMode === "harian") {
                form.append("date", uploadDate);
            } else {
                form.append("update_day", uploadCutoffDay);
                form.append("month", uploadDate.slice(0, 7));
            }

            const token = localStorage.getItem("token");
            if (!token) throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");

            const job = await uploadFormWithJobProgress(
                `${API_URL}/api/kiriman-yes/upload`,
                form,
                (info) => {
                    setUploadProgress(info.percent);
                    setUploadStageLabel(
                        info.phase === "uploading"
                            ? "Mengunggah file…"
                            : stageLabel(info.stage, info.message)
                    );
                },
                { token }
            );

            const periodLabel =
                uploadPeriodMode === "harian"
                    ? `Harian (${formatIdDate(uploadDate)})`
                    : `Bulanan (Tgl Update ${uploadCutoffDay})`;
            const rows = Number((job.result as { rows?: number } | undefined)?.rows || 0);
            showToast(
                `Kiriman Yes berhasil diunggah — ${periodLabel}${rows ? ` · ${rows} baris` : ""}`,
                "success"
            );

            setPeriodMode(uploadPeriodMode);
            if (uploadPeriodMode === "harian") {
                setFilterDate(uploadDate);
            } else {
                setCutoffDay(uploadCutoffDay);
                const month = uploadDate.slice(0, 7);
                if (month) setFilterDate(`${month}-01`);
            }
            setCurrentPage(1);
            setModalOpen(false);
            setSelectedFile(null);
            setUploadProgress(0);
            setDataEpoch((n) => n + 1);
            void fetchMeta();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "Upload gagal", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setDownloading(true);
        try {
            const params = new URLSearchParams({ period_mode: periodMode });
            if (periodMode === "harian") {
                if (filterDate) params.set("date", filterDate);
            } else {
                params.set("month", filterMonthValue);
                params.set("update_day", cutoffDay);
            }
            const res = await fetch(
                `${API_URL}/download/kiriman-yes?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Download gagal" }));
                throw new Error(err.detail || "Download gagal");
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download =
                periodMode === "harian"
                    ? `database_kiriman_yes_${filterDate || "data"}.csv`
                    : `database_kiriman_yes_${filterMonthValue}_tgl${cutoffDay}.csv`;
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
                PROGRESS
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
                            Filter harian/bulanan berdasarkan periode upload master &amp;
                            Destinasi, lalu lihat pivot + detail.
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

                {/* Kontrol: filter + upload (1 kartu) */}
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        <fieldset className="flex flex-col gap-1.5">
                            <legend className="text-sm font-semibold text-foreground">
                                Periode Data
                            </legend>
                            <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-white px-3 py-2.5">
                                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                                    <input
                                        type="radio"
                                        name="period-mode"
                                        value="harian"
                                        checked={periodMode === "harian"}
                                        onChange={() => setPeriodMode("harian")}
                                        className="size-4 accent-emerald-600"
                                    />
                                    Harian
                                </label>
                                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                                    <input
                                        type="radio"
                                        name="period-mode"
                                        value="bulanan"
                                        checked={periodMode === "bulanan"}
                                        onChange={() => setPeriodMode("bulanan")}
                                        className="size-4 accent-violet-600"
                                    />
                                    Bulanan
                                </label>
                            </div>
                            <span className="text-[11px] text-secondary">
                                {periodMode === "harian"
                                    ? "Menampilkan data harian"
                                    : "Menampilkan data bulanan"}
                            </span>
                        </fieldset>

                        <label className="flex flex-col gap-1.5">
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                <CalendarDays className="size-4 text-secondary" />
                                {periodMode === "bulanan"
                                    ? "Filter Bulan Upload"
                                    : "Tanggal Upload Master"}
                            </span>
                            {periodMode === "bulanan" ? (
                                <input
                                    type="month"
                                    value={filterMonthValue}
                                    onChange={(e) => {
                                        const month = e.target.value;
                                        setFilterDate(month ? `${month}-01` : todayIso());
                                    }}
                                    className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                                />
                            ) : (
                                <>
                                    <input
                                        type="date"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                                        list="kiriman-yes-upload-dates"
                                    />
                                    <datalist id="kiriman-yes-upload-dates">
                                        {uploadDates.map((d) => (
                                            <option key={d} value={d} />
                                        ))}
                                    </datalist>
                                </>
                            )}
                            <span className="text-[11px] text-secondary">{dateHint}</span>
                        </label>

                        {periodMode === "bulanan" ? (
                            <fieldset className="flex flex-col gap-1.5">
                                <legend className="text-sm font-semibold text-foreground">
                                    Tgl Update
                                </legend>
                                <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-white px-3 py-2.5">
                                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="radio"
                                            name="cutoff-day"
                                            value="2"
                                            checked={cutoffDay === "2"}
                                            onChange={() => setCutoffDay("2")}
                                            className="size-4 accent-sky-600"
                                        />
                                        Tgl 2
                                    </label>
                                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="radio"
                                            name="cutoff-day"
                                            value="8"
                                            checked={cutoffDay === "8"}
                                            onChange={() => setCutoffDay("8")}
                                            className="size-4 accent-emerald-600"
                                        />
                                        Tgl 8
                                    </label>
                                </div>
                                <span className="text-[11px] text-secondary">
                                    Tgl Update {cutoffDay} untuk filter data.
                                </span>
                            </fieldset>
                        ) : null}

                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm font-semibold text-foreground">
                                Cabang (Origin)
                            </span>
                            <select
                                value={cabangOrigin}
                                onChange={(e) => {
                                    setCabangOrigin(e.target.value);
                                    setCabang("(All)");
                                }}
                                className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                            >
                                <option value="(All)">(All)</option>
                                {originOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                            <span className="text-[11px] text-secondary">
                                Filter dari kolom Origin
                            </span>
                        </label>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm font-semibold text-foreground">
                                Cabang (Destinasi)
                            </span>
                            <select
                                value={cabang}
                                onChange={(e) => setCabang(e.target.value)}
                                className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                            >
                                <option value="(All)">(All)</option>
                                {cabangOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                            <span className="text-[11px] text-secondary">
                                Filter dari kolom Destinasi
                            </span>
                        </label>
                    </div>

                    <div className="border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-secondary">
                            <span className="font-medium text-foreground">
                                {fileMeta.filename}
                            </span>
                            {" · "}
                            {fileMeta.lastUpdate}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
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
                            <button
                                type="button"
                                onClick={openTambahData}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                            >
                                <Plus className="size-4" />
                                Tambah Data
                            </button>
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
                                        <th className={`${th} ${headerClass("Destinasi")} text-left`}>
                                            Destinasi
                                        </th>
                                        {dbCols.map((c) => (
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
                                                colSpan={dbCols.length + 2}
                                                className="px-4 py-10 text-center text-secondary"
                                            >
                                                Belum ada data. Upload master terlebih dahulu.
                                            </td>
                                        </tr>
                                    )}
                                    {dbPivot?.rows.map((row) => (
                                        <tr key={String(row.Cabang)}>
                                            <td className={`${td} font-medium`}>
                                                <button
                                                    type="button"
                                                    className="text-left font-medium text-blue-700 hover:underline"
                                                    onClick={() => applyDbDrill(String(row.Cabang))}
                                                    title="Filter detail ke cabang ini"
                                                >
                                                    {row.Cabang}
                                                </button>
                                            </td>
                                            {dbCols.map((c) => (
                                                <td key={c} className={tdNum}>
                                                    <button
                                                        type="button"
                                                        className="w-full text-right tabular-nums hover:text-blue-700 hover:underline"
                                                        onClick={() =>
                                                            applyDbDrill(String(row.Cabang), c)
                                                        }
                                                        title={`Filter: ${row.Cabang} · ${c}`}
                                                    >
                                                        {Number(row[c] || 0)}
                                                    </button>
                                                </td>
                                            ))}
                                            <td className={`${tdNum} font-semibold`}>
                                                <button
                                                    type="button"
                                                    className="w-full text-right font-semibold hover:text-blue-700 hover:underline"
                                                    onClick={() => applyDbDrill(String(row.Cabang))}
                                                >
                                                    {Number(row["Grand Total"] || 0)}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {dbPivot && (
                                        <tr>
                                            <td className={`${foot} text-left`}>Grand Total</td>
                                            {dbCols.map((c) => (
                                                <td key={c} className={`${foot} text-right`}>
                                                    {Number(dbPivot.grand_total[c] || 0)}
                                                </td>
                                            ))}
                                            <td className={`${foot} text-right`}>
                                                {Number(dbPivot.grand_total["Grand Total"] || 0)}
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
                                        <th className={`${th} ${headerClass("TRANSAKSI - TODAY")} text-left`}>
                                            TRANSAKSI - TODAY
                                        </th>
                                        {otsCols.map((c) => (
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
                                                    colSpan={otsCols.length + 2}
                                                    className="px-4 py-10 text-center text-secondary"
                                                >
                                                    Belum ada data OTS. Pastikan kolom TRANSAKSI - TODAY &amp; PROGRESS ada.
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
                                                    {otsCols.map((c) => (
                                                        <td key={c} className={`${tdNum} font-semibold`}>
                                                            {Number(m[c] || 0)}
                                                        </td>
                                                    ))}
                                                    <td className={`${tdNum} font-semibold`}>
                                                        {Number(m["Grand Total"] || 0)}
                                                    </td>
                                                </tr>
                                                {open &&
                                                    group.cities.map((city) => (
                                                        <tr key={`${group.lt}-${city.Cabang}`}>
                                                            <td className={`${td} pl-8 text-secondary`}>
                                                                <button
                                                                    type="button"
                                                                    className="text-left hover:text-blue-700 hover:underline"
                                                                    onClick={() =>
                                                                        applyOtsDrill(
                                                                            group.lt,
                                                                            String(city.Cabang)
                                                                        )
                                                                    }
                                                                >
                                                                    {city.Cabang}
                                                                </button>
                                                            </td>
                                                            {otsCols.map((c) => (
                                                                <td key={c} className={tdNum}>
                                                                    <button
                                                                        type="button"
                                                                        className="w-full text-right hover:text-blue-700 hover:underline"
                                                                        onClick={() =>
                                                                            applyOtsDrill(
                                                                                group.lt,
                                                                                String(city.Cabang),
                                                                                c
                                                                            )
                                                                        }
                                                                    >
                                                                        {Number(city[c] || 0)}
                                                                    </button>
                                                                </td>
                                                            ))}
                                                            <td className={tdNum}>
                                                                <button
                                                                    type="button"
                                                                    className="w-full text-right hover:text-blue-700 hover:underline"
                                                                    onClick={() =>
                                                                        applyOtsDrill(
                                                                            group.lt,
                                                                            String(city.Cabang)
                                                                        )
                                                                    }
                                                                >
                                                                    {Number(city["Grand Total"] || 0)}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </Fragment>
                                        );
                                    })}
                                    {otsPivot && (
                                        <tr>
                                            <td className={`${foot} text-left`}>Grand Total</td>
                                            {otsCols.map((c) => (
                                                <td key={c} className={`${foot} text-right`}>
                                                    {Number(otsPivot.grand_total[c] || 0)}
                                                </td>
                                            ))}
                                            <td className={`${foot} text-right`}>
                                                {Number(otsPivot.grand_total["Grand Total"] || 0)}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Detail rows — mirip All Inbound / UN RUNSHEET */}
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Detail Kiriman Yes</h2>
                            <p className="text-xs text-secondary">
                                {detailTotal.toLocaleString("id-ID")} baris
                                {searchQuery ? ` · search: "${searchQuery}"` : ""}
                                {pivotExternalLabel ? ` · ${pivotExternalLabel}` : ""}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {pivotDrill ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPivotDrill(null);
                                        setCurrentPage(1);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                                >
                                    <X className="size-3.5" />
                                    Clear pivot filter
                                </button>
                            ) : null}
                            <label className="inline-flex items-center gap-2 text-xs text-secondary">
                                Per halaman
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="rounded-lg border border-border bg-white px-2 py-1 text-xs text-foreground"
                                >
                                    <option value={1000}>1.000</option>
                                    <option value={2000}>2.000</option>
                                    <option value={5000}>5.000</option>
                                </select>
                            </label>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={loadingDetail || currentPage <= 1}
                                className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-50"
                            >
                                Prev
                            </button>
                            <span className="text-xs text-secondary">
                                {currentPage}
                                {detailPages > 0 ? ` / ${detailPages}` : ""}
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    setCurrentPage((p) =>
                                        detailPages > 0 ? Math.min(detailPages, p + 1) : p + 1
                                    )
                                }
                                disabled={
                                    loadingDetail ||
                                    (detailPages > 0 && currentPage >= detailPages)
                                }
                                className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>

                    <ShipmentRowsTable
                        title="Database Kiriman Yes"
                        dateLabel={
                            [
                                dateLabel,
                                cabangOrigin !== "(All)" ? `Origin = ${cabangOrigin}` : null,
                                cabang !== "(All)" ? `Destinasi = ${cabang}` : null,
                            ]
                                .filter(Boolean)
                                .join(" · ") || fileMeta.lastUpdate
                        }
                        columns={[...KIRIMAN_YES_DETAIL_COLUMNS]}
                        items={detailItems}
                        totalRows={detailTotal}
                        loading={loadingDetail}
                        emptyMessage={
                            detailMessage ||
                            "Belum ada baris detail. Upload file lengkap (header AWB dst) lewat Tambah Data."
                        }
                        iconClassName="text-emerald-700"
                        hint="Filter kolom di header · klik sel pivot untuk drill-down"
                        externalFilters={pivotExternalFilters}
                        externalFilterLabel={pivotExternalLabel}
                        onClearExternalFilters={() => {
                            setPivotDrill(null);
                            setCurrentPage(1);
                        }}
                        serverSearchValue={searchInput}
                        onServerSearchChange={setSearchInput}
                        serverSearchPlaceholder="Server search AWB / shipper / destinasi…"
                        serverSearchLoading={loadingDetail}
                        resetKey={`${detailTotal}-${searchQuery}-${pivotExternalLabel || ""}-${currentPage}-${periodMode}-${filterDate}-${cutoffDay}-${cabangOrigin}-${cabang}`}
                    />
                </div>
            </div>

            {modalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="kiriman-yes-upload-title"
                        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-lg"
                    >
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <h2
                                id="kiriman-yes-upload-title"
                                className="flex items-center gap-2 text-base font-semibold text-foreground"
                            >
                                <Upload className="size-5 text-emerald-600" />
                                Upload Database Kiriman Yes
                            </h2>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-lg p-1.5 text-secondary hover:bg-muted hover:text-foreground disabled:opacity-50"
                                disabled={uploading}
                                aria-label="Tutup"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-4 px-5 py-4">
                            <fieldset className="flex flex-col gap-1.5">
                                <legend className="text-sm font-semibold text-foreground">
                                    Periode Data
                                </legend>
                                <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-white px-3 py-2.5">
                                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="radio"
                                            name="upload-period-mode"
                                            value="harian"
                                            checked={uploadPeriodMode === "harian"}
                                            onChange={() => setUploadPeriodMode("harian")}
                                            className="size-4 accent-emerald-600"
                                            disabled={uploading}
                                        />
                                        Harian
                                    </label>
                                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="radio"
                                            name="upload-period-mode"
                                            value="bulanan"
                                            checked={uploadPeriodMode === "bulanan"}
                                            onChange={() => setUploadPeriodMode("bulanan")}
                                            className="size-4 accent-violet-600"
                                            disabled={uploading}
                                        />
                                        Bulanan
                                    </label>
                                </div>
                                <span className="text-xs text-secondary">
                                    Pilih dulu jenis data sebelum mengunggah file.
                                </span>
                            </fieldset>

                            {uploadPeriodMode === "harian" ? (
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-sm font-semibold text-foreground">
                                        Tanggal Upload
                                    </span>
                                    <input
                                        type="date"
                                        value={uploadDate}
                                        onChange={(e) => setUploadDate(e.target.value)}
                                        className="rounded-xl border border-border px-3 py-2.5 text-sm"
                                        disabled={uploading}
                                    />
                                    <span className="text-xs text-secondary">
                                        Tanggal master harian yang akan diunggah.
                                    </span>
                                </label>
                            ) : (
                                <>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm font-semibold text-foreground">
                                            Bulan Upload
                                        </span>
                                        <input
                                            type="month"
                                            value={uploadDate.slice(0, 7)}
                                            onChange={(e) => {
                                                const month = e.target.value;
                                                setUploadDate(
                                                    month ? `${month}-01` : todayIso()
                                                );
                                            }}
                                            className="rounded-xl border border-border px-3 py-2.5 text-sm"
                                            disabled={uploading}
                                        />
                                    </label>
                                    <fieldset className="flex flex-col gap-1.5">
                                        <legend className="text-sm font-semibold text-foreground">
                                            Tgl Update
                                        </legend>
                                        <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-white px-3 py-2.5">
                                            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                                                <input
                                                    type="radio"
                                                    name="upload-cutoff-day"
                                                    value="2"
                                                    checked={uploadCutoffDay === "2"}
                                                    onChange={() => setUploadCutoffDay("2")}
                                                    className="size-4 accent-sky-600"
                                                    disabled={uploading}
                                                />
                                                Tgl 2
                                            </label>
                                            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                                                <input
                                                    type="radio"
                                                    name="upload-cutoff-day"
                                                    value="8"
                                                    checked={uploadCutoffDay === "8"}
                                                    onChange={() => setUploadCutoffDay("8")}
                                                    className="size-4 accent-emerald-600"
                                                    disabled={uploading}
                                                />
                                                Tgl 8
                                            </label>
                                        </div>
                                        <span className="text-xs text-secondary">
                                            Pilih Tgl Update data bulanan (Tgl 2 atau Tgl 8).
                                        </span>
                                    </fieldset>
                                </>
                            )}

                            <div
                                onDragOver={handleDropZoneDragOver}
                                onDragLeave={handleDropZoneDragLeave}
                                onDrop={handleDropZoneDrop}
                                onClick={() => {
                                    if (!uploading) fileInputRef.current?.click();
                                }}
                                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                                    isDraggingFile
                                        ? "border-emerald-400 bg-emerald-50"
                                        : selectedFile
                                          ? "border-emerald-200 bg-emerald-50/40"
                                          : "border-border bg-gray-50/60 hover:border-emerald-300 hover:bg-emerald-50/40"
                                } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                            >
                                <div className="rounded-2xl bg-emerald-50 p-3">
                                    <Upload className="h-6 w-6 text-emerald-600" />
                                </div>
                                {selectedFile ? (
                                    <div className="space-y-1">
                                        <p className="max-w-[280px] truncate text-sm font-semibold text-foreground">
                                            {selectedFile.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatBytes(selectedFile.size)} — klik untuk
                                            ganti file
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-foreground">
                                            {isDraggingFile
                                                ? "Lepaskan file di sini"
                                                : "Drag & drop file di sini"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            atau klik untuk memilih — .csv / .xlsx / .xls
                                        </p>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    className="hidden"
                                    onChange={handleUploadFileChange}
                                    disabled={uploading}
                                />
                            </div>

                            {uploading ? (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs text-secondary">
                                        <span>{uploadStageLabel}</span>
                                        <span className="font-semibold text-foreground">
                                            {uploadProgress}%
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                        <div
                                            className="h-full rounded-full bg-emerald-600 transition-[width] duration-200 ease-out"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            ) : null}

                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={uploading}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleUploadSubmit()}
                                    disabled={!selectedFile || uploading}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" />
                                            Mengunggah…
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="size-4" />
                                            Upload
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </DashboardLayout>
    );
}
