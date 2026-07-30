"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    CalendarDays,
    Download,
    Loader2,
    Plus,
    Upload,
    X,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import { useToast } from "@/context/ToastContext";
import { API_URL, authHeaders } from "@/config";
import {
    stageLabel,
    uploadFormWithJobProgress,
} from "@/lib/uploadJobProgress";
import ShipmentRowsTable, {
    type DetailRow,
} from "../inbound/ShipmentRowsTable";
import { CTC_DETAIL_COLUMNS } from "./ctcColumns";

function todayIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatIdDate(iso: string) {
    if (!iso) return "-";
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

async function parseError(res: Response) {
    try {
        const data = await res.json();
        return data.detail || data.message || res.statusText;
    } catch {
        return res.statusText || "Request gagal";
    }
}

type DetailResponse = {
    items?: DetailRow[];
    columns?: string[];
    message?: string | null;
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
};

const DEFAULT_PAGE_SIZE = 1000;

export default function AllInboundCtcPage() {
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [filterDate, setFilterDate] = useState(todayIso());
    const [periodMode, setPeriodMode] = useState<"harian" | "bulanan">("harian");
    const [cutoffDay, setCutoffDay] = useState<"2" | "8">("2");
    const [viewMode, setViewMode] = useState<"inbound" | "un_inbound">("inbound");

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
    const [detailItems, setDetailItems] = useState<DetailRow[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailMessage, setDetailMessage] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [totalRows, setTotalRows] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const dateHint = useMemo(() => {
        if (periodMode === "bulanan") {
            const [y, m] = filterDate.split("-");
            if (!y || !m) return "Filter bulanan";
            const d = new Date(Number(y), Number(m) - 1, 1);
            return `Periode bulanan: ${d.toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
            })}`;
        }
        return `Filter harian: ${formatIdDate(filterDate)}`;
    }, [filterDate, periodMode]);

    const filterMonthValue = filterDate.slice(0, 7);

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

    const tableItems = detailItems;
    const tableTitle =
        viewMode === "inbound"
            ? "All Inbound & CTC — INBOUND"
            : "All Inbound & CTC — UN INBOUND";
    const tableEmptyMessage =
        detailMessage ||
        "Belum ada data untuk periode ini. Unggah template lewat Tambah Data, lalu muat ulang setelah data diproses.";
    const tableHint =
        viewMode === "inbound"
            ? "Semua baris hasil upload APEX (enrichment CTC)."
            : "UN INBOUND: INBOUND_MANIFEST_DATE blank, MANIFEST_TRANSIT_AGEN blank, SERVICE bukan CTC*, ORIGIN bukan KOE*.";

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSearchQuery(searchInput.trim());
        }, 350);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const loadDetail = useCallback(async () => {
        setLoadingDetail(true);
        try {
            const params = new URLSearchParams({
                period_mode: periodMode,
                kind: viewMode,
                page: String(currentPage),
                limit: String(pageSize),
            });
            if (periodMode === "harian") {
                params.set("date", filterDate);
            } else {
                params.set("month", filterMonthValue);
                params.set("update_day", cutoffDay);
            }
            if (searchQuery) params.set("q", searchQuery);

            const res = await fetch(
                `${API_URL}/api/all-shipment/all-inbound-ctc/rows?${params.toString()}`,
                { headers: authHeaders() }
            );
            if (!res.ok) throw new Error(await parseError(res));
            const data = (await res.json()) as DetailResponse;
            setDetailItems(data.items || []);
            setDetailMessage(data.message || null);
            setTotalRows(Number(data.total || 0));
            setTotalPages(Number(data.pages || 0));
        } catch (e: unknown) {
            setDetailItems([]);
            setDetailMessage(null);
            setTotalRows(0);
            setTotalPages(0);
            showToast(e instanceof Error ? e.message : "Gagal memuat detail", "error");
        } finally {
            setLoadingDetail(false);
        }
    }, [
        cutoffDay,
        currentPage,
        filterDate,
        filterMonthValue,
        pageSize,
        periodMode,
        searchQuery,
        showToast,
        viewMode,
    ]);

    useEffect(() => {
        setCurrentPage(1);
    }, [periodMode, filterDate, filterMonthValue, cutoffDay, viewMode, searchQuery]);

    useEffect(() => {
        void loadDetail();
    }, [loadDetail]);

    const openTambahData = () => {
        setUploadPeriodMode(periodMode);
        setUploadDate(filterDate || todayIso());
        setUploadCutoffDay(cutoffDay);
        setSelectedFile(null);
        setIsDraggingFile(false);
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
            showToast("Pilih file All Inbound & CTC terlebih dahulu", "error");
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

            await uploadFormWithJobProgress(
                `${API_URL}/api/all-shipment/all-inbound-ctc/upload`,
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
            showToast(
                `All Inbound & CTC berhasil diunggah — ${periodLabel}`,
                "success"
            );

            setPeriodMode(uploadPeriodMode);
            if (uploadPeriodMode === "harian") {
                setFilterDate(uploadDate);
            } else {
                setCutoffDay(uploadCutoffDay);
            }
            setCurrentPage(1);
            setModalOpen(false);
            setSelectedFile(null);
            setUploadProgress(0);
            void loadDetail();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "Upload gagal", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadXlsxAllData = async () => {
        setDownloading(true);
        try {
            const params = new URLSearchParams({
                period_mode: periodMode,
                kind: viewMode,
            });
            if (periodMode === "harian") {
                params.set("date", filterDate);
            } else {
                params.set("month", filterMonthValue);
                params.set("update_day", cutoffDay);
            }

            const res = await fetch(
                `${API_URL}/api/all-shipment/all-inbound-ctc/export-xlsx?${params.toString()}`,
                { headers: authHeaders() }
            );
            if (!res.ok) throw new Error(await parseError(res));
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const disposition = res.headers.get("content-disposition") || "";
            const match = disposition.match(/filename="?([^"]+)"?/i);
            const filename =
                match?.[1] || `all_inbound_ctc_${viewMode}_${periodMode}.xlsx`;
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("XLSX all data berhasil diunduh.", "success");
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "Gagal export XLSX", "error");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-[1400px] space-y-6">
                <div>
                    <Link
                        href="/dashboard/v2/lastmile/all-shipment"
                        className="mb-4 inline-flex items-center text-muted-foreground transition-colors hover:text-primary"
                    >
                        <ArrowLeft className="mr-2 size-4" /> Back to All Shipment
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                        All Inbound &amp; CTC
                    </h1>
                    <p className="mt-2 text-sm text-secondary">
                        Pilih tampilan Harian / Bulanan, filter Inbound / Un Inbound,
                        unduh XLSX all data, atau tambah data template All Inbound &amp; CTC.
                    </p>
                </div>

                {/* Control card */}
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                                            className="size-4 accent-indigo-600"
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
                                    {periodMode === "bulanan" ? "Filter Bulan" : "Filter Tanggal"}
                                </span>
                                {periodMode === "bulanan" ? (
                                    <input
                                        type="month"
                                        value={filterMonthValue}
                                        onChange={(e) => {
                                            const month = e.target.value;
                                            setFilterDate(month ? `${month}-01` : todayIso());
                                        }}
                                        className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                                    />
                                ) : (
                                    <input
                                        type="date"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                                    />
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

                            <fieldset className="flex flex-col gap-1.5">
                                <legend className="text-sm font-semibold text-foreground">
                                    Tampilkan Tabel
                                </legend>
                                <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-white px-3 py-2.5">
                                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="radio"
                                            name="view-mode"
                                            value="inbound"
                                            checked={viewMode === "inbound"}
                                            onChange={() => setViewMode("inbound")}
                                            className="size-4 accent-sky-600"
                                        />
                                        Inbound
                                    </label>
                                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="radio"
                                            name="view-mode"
                                            value="un_inbound"
                                            checked={viewMode === "un_inbound"}
                                            onChange={() => setViewMode("un_inbound")}
                                            className="size-4 accent-amber-600"
                                        />
                                        Un Inbound
                                    </label>
                                </div>
                                <span className="text-[11px] text-secondary">
                                    {viewMode === "inbound"
                                        ? `Data INBOUND (halaman ${currentPage}${
                                              totalPages ? `/${totalPages}` : ""
                                          })`
                                        : `Data UN INBOUND (halaman ${currentPage}${
                                              totalPages ? `/${totalPages}` : ""
                                          })`}
                                </span>
                            </fieldset>
                        </div>

                        <div className="flex flex-nowrap items-center gap-2 lg:mt-[26px]">
                            <button
                                type="button"
                                onClick={handleDownloadXlsxAllData}
                                disabled={downloading}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
                            >
                                {downloading ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Download className="size-4" />
                                )}
                                {downloading ? "Menyiapkan XLSX…" : "Download XLSX (All Data)"}
                            </button>
                            <button
                                type="button"
                                onClick={openTambahData}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                            >
                                <Plus className="size-4" />
                                Tambah Data
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                        <p className="text-xs text-secondary">
                            Menampilkan {detailItems.length.toLocaleString("id-ID")} dari{" "}
                            {totalRows.toLocaleString("id-ID")} baris
                            {totalPages > 1 ? ` · halaman ${currentPage}/${totalPages}` : ""}
                            {searchQuery ? ` · server search: "${searchQuery}"` : ""}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="text-xs text-secondary">
                                Per halaman
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="ml-2 rounded-lg border border-border bg-white px-2 py-1 text-xs text-foreground"
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
                            <button
                                type="button"
                                onClick={() =>
                                    setCurrentPage((p) =>
                                        totalPages > 0 ? Math.min(totalPages, p + 1) : p + 1
                                    )
                                }
                                disabled={loadingDetail || (totalPages > 0 && currentPage >= totalPages)}
                                className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                <ShipmentRowsTable
                    title={tableTitle}
                    dateLabel={dateLabel}
                    columns={[...CTC_DETAIL_COLUMNS]}
                    items={tableItems}
                    totalRows={totalRows}
                    loading={loadingDetail}
                    emptyMessage={tableEmptyMessage}
                    iconClassName={
                        viewMode === "inbound" ? "text-sky-700" : "text-amber-700"
                    }
                    hint={`${dateHint} · ${tableHint}`}
                    serverSearchValue={searchInput}
                    onServerSearchChange={setSearchInput}
                    serverSearchPlaceholder="Server search lintas 100k baris…"
                    serverSearchLoading={loadingDetail}
                />
            </div>

            {modalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ctc-upload-title"
                        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-lg"
                    >
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <h2
                                id="ctc-upload-title"
                                className="flex items-center gap-2 text-base font-semibold text-foreground"
                            >
                                <Upload className="size-5 text-indigo-600" />
                                Upload All Inbound &amp; CTC
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
                                            className="size-4 accent-indigo-600"
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
                                        Tanggal Data
                                    </span>
                                    <input
                                        type="date"
                                        value={uploadDate}
                                        onChange={(e) => setUploadDate(e.target.value)}
                                        className="rounded-xl border border-border px-3 py-2.5 text-sm"
                                        disabled={uploading}
                                    />
                                    <span className="text-xs text-secondary">
                                        Tanggal data harian yang akan diunggah.
                                    </span>
                                </label>
                            ) : (
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
                                        ? "border-indigo-400 bg-indigo-50"
                                        : selectedFile
                                          ? "border-indigo-200 bg-indigo-50/40"
                                          : "border-border bg-gray-50/60 hover:border-indigo-300 hover:bg-indigo-50/40"
                                } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                            >
                                <div className="rounded-2xl bg-indigo-50 p-3">
                                    <Upload className="h-6 w-6 text-indigo-600" />
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
                                            className="h-full rounded-full bg-indigo-600 transition-[width] duration-200 ease-out"
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
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:bg-indigo-300"
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
