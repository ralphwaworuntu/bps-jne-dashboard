"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    CalendarDays,
    ChevronDown,
    ChevronRight,
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
import { CTC_DETAIL_COLUMNS } from "../all-inbound-ctc/ctcColumns";

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

type AgingCounts = {
    "H+0"?: number;
    "H+1"?: number;
    "H+2"?: number;
    "H+3"?: number;
    "Grand Total"?: number;
};

type PivotNode = {
    label: string;
    level: number;
    counts: AgingCounts;
    children?: PivotNode[];
};

type PivotBlock = {
    field: string;
    rows: PivotNode[];
    grand_total: AgingCounts;
};

type PivotResponse = {
    date?: string;
    cabang?: string;
    cabang_options?: string[];
    aging_columns?: string[];
    pivot_lt_im?: PivotBlock;
    pivot_lt_mti?: PivotBlock;
    row_count_source?: number;
    message?: string | null;
};

type DetailResponse = {
    items?: DetailRow[];
    columns?: string[];
    cabang_options?: string[];
    message?: string | null;
};

const AGING_COLS = ["H+0", "H+1", "H+2", "H+3"] as const;

const thDark =
    "border border-black/25 bg-[#1f4e79] px-2 py-1.5 text-center text-xs font-semibold text-white";
const thRed =
    "border border-black/25 bg-red-600 px-2 py-1.5 text-center text-xs font-semibold text-white";
const tdBase = "border border-black/20 px-2 py-1 text-center text-xs tabular-nums";
const tdLabel = "border border-black/20 px-2 py-1 text-left text-xs text-foreground";

function countVal(counts: AgingCounts | undefined, key: string): number {
    return Number(counts?.[key as keyof AgingCounts] ?? 0);
}

type PivotDrill = {
    source: "lt_im" | "lt_mti";
    status?: string;
    zona?: string;
    kecamatan?: string;
    /** H+0..H+3; kosong = Grand Total baris (semua aging di scope) */
    aging?: string;
};

function agingBucketClient(value: unknown): string | null {
    const text = String(value ?? "").trim().toUpperCase();
    const m = /^H\+(\d+)$/.exec(text);
    if (!m) return null;
    const n = Number(m[1]);
    if (n <= 0) return "H+0";
    if (n === 1) return "H+1";
    if (n === 2) return "H+2";
    return "H+3";
}

function drillKey(d: PivotDrill): string {
    return [d.source, d.status || "", d.zona || "", d.kecamatan || "", d.aging || ""].join("|");
}

function AgingPivotTable({
    title,
    fieldLabel,
    source,
    rows,
    grandTotal,
    loading,
    emptyMessage,
    activeDrill,
    onCellClick,
}: {
    title: string;
    fieldLabel: string;
    source: "lt_im" | "lt_mti";
    rows: PivotNode[];
    grandTotal: AgingCounts;
    loading?: boolean;
    emptyMessage?: string | null;
    activeDrill: PivotDrill | null;
    onCellClick: (drill: PivotDrill) => void;
}) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const next: Record<string, boolean> = {};
        for (const row of rows) {
            if (row.children?.length) next[`0:${row.label}`] = true;
            for (const child of row.children || []) {
                if (child.children?.length) {
                    next[`1:${row.label}/${child.label}`] = true;
                }
            }
        }
        setExpanded(next);
    }, [rows]);

    const toggle = (key: string) => {
        setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const isActive = (partial: Omit<PivotDrill, "source">) => {
        if (!activeDrill || activeDrill.source !== source) return false;
        return (
            drillKey({ source, ...partial }) ===
            drillKey({
                source,
                status: activeDrill.status,
                zona: activeDrill.zona,
                kecamatan: activeDrill.kecamatan,
                aging: activeDrill.aging,
            })
        );
    };

    const renderCounts = (
        counts: AgingCounts,
        path: { status?: string; zona?: string; kecamatan?: string },
        emphasizeH0 = false
    ) => (
        <>
            {AGING_COLS.map((col) => {
                const n = countVal(counts, col);
                const active = isActive({ ...path, aging: col });
                const red = emphasizeH0 && col === "H+0" && n > 0;
                return (
                    <td
                        key={col}
                        className={`${tdBase} ${
                            active
                                ? "bg-rose-100 ring-1 ring-inset ring-rose-400"
                                : ""
                        } ${red ? "font-semibold text-red-600" : "text-foreground"}`}
                    >
                        {n ? (
                            <button
                                type="button"
                                onClick={() =>
                                    onCellClick({
                                        source,
                                        ...path,
                                        aging: col,
                                    })
                                }
                                className="w-full cursor-pointer underline-offset-2 hover:underline"
                                title="Klik untuk filter tabel detail"
                            >
                                {n}
                            </button>
                        ) : (
                            ""
                        )}
                    </td>
                );
            })}
            <td
                className={`${tdBase} font-semibold text-foreground ${
                    isActive({ ...path, aging: undefined })
                        ? "bg-rose-100 ring-1 ring-inset ring-rose-400"
                        : ""
                }`}
            >
                {countVal(counts, "Grand Total") ? (
                    <button
                        type="button"
                        onClick={() =>
                            onCellClick({
                                source,
                                ...path,
                            })
                        }
                        className="w-full cursor-pointer underline-offset-2 hover:underline"
                        title="Klik untuk filter tabel detail"
                    >
                        {countVal(counts, "Grand Total")}
                    </button>
                ) : (
                    ""
                )}
            </td>
        </>
    );

    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
                <span className="text-sm font-bold text-foreground">{title}</span>
                <div className="flex items-center gap-3">
                    <span className="text-[11px] text-secondary">
                        Klik angka untuk filter tabel
                    </span>
                    {loading ? (
                        <Loader2 className="size-3.5 animate-spin text-secondary" />
                    ) : null}
                </div>
            </div>
            <div className="overflow-x-auto p-3">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr>
                            <th className={`${thDark} text-left`} rowSpan={2}>
                                Row Labels
                            </th>
                            <th className={thDark} colSpan={AGING_COLS.length + 1}>
                                {fieldLabel}
                            </th>
                        </tr>
                        <tr>
                            {AGING_COLS.map((col) => (
                                <th key={col} className={col === "H+0" ? thRed : thDark}>
                                    {col}
                                </th>
                            ))}
                            <th className={thDark}>Grand Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!loading && rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={AGING_COLS.length + 2}
                                    className="border border-black/20 px-4 py-10 text-center text-secondary"
                                >
                                    {emptyMessage || "Belum ada data pivot."}
                                </td>
                            </tr>
                        ) : null}
                        {rows.map((status) => {
                            const statusKey = `0:${status.label}`;
                            const statusOpen = Boolean(expanded[statusKey]);
                            const hasChildren = Boolean(status.children?.length);
                            return (
                                <FragmentRows key={statusKey}>
                                    <tr className="bg-slate-50/80">
                                        <td className={tdLabel}>
                                            <button
                                                type="button"
                                                disabled={!hasChildren}
                                                onClick={() => toggle(statusKey)}
                                                className="inline-flex items-center gap-1 font-semibold disabled:cursor-default"
                                            >
                                                {hasChildren ? (
                                                    statusOpen ? (
                                                        <ChevronDown className="size-3.5 text-secondary" />
                                                    ) : (
                                                        <ChevronRight className="size-3.5 text-secondary" />
                                                    )
                                                ) : (
                                                    <span className="inline-block w-3.5" />
                                                )}
                                                {status.label}
                                            </button>
                                        </td>
                                        {renderCounts(status.counts, { status: status.label }, true)}
                                    </tr>
                                    {statusOpen
                                        ? (status.children || []).map((zona) => {
                                              const zonaKey = `1:${status.label}/${zona.label}`;
                                              const zonaOpen = Boolean(expanded[zonaKey]);
                                              const zonaHasKids = Boolean(zona.children?.length);
                                              return (
                                                  <FragmentRows key={zonaKey}>
                                                      <tr>
                                                          <td
                                                              className={tdLabel}
                                                              style={{ paddingLeft: 22 }}
                                                          >
                                                              <button
                                                                  type="button"
                                                                  disabled={!zonaHasKids}
                                                                  onClick={() => toggle(zonaKey)}
                                                                  className="inline-flex items-center gap-1 disabled:cursor-default"
                                                              >
                                                                  {zonaHasKids ? (
                                                                      zonaOpen ? (
                                                                          <ChevronDown className="size-3.5 text-secondary" />
                                                                      ) : (
                                                                          <ChevronRight className="size-3.5 text-secondary" />
                                                                      )
                                                                  ) : (
                                                                      <span className="inline-block w-3.5" />
                                                                  )}
                                                                  {zona.label}
                                                              </button>
                                                          </td>
                                                          {renderCounts(
                                                              zona.counts,
                                                              {
                                                                  status: status.label,
                                                                  zona: zona.label,
                                                              },
                                                              true
                                                          )}
                                                      </tr>
                                                      {zonaOpen
                                                          ? (zona.children || []).map((kec) => (
                                                                <tr key={`${zonaKey}/${kec.label}`}>
                                                                    <td
                                                                        className={`${tdLabel} text-secondary`}
                                                                        style={{ paddingLeft: 40 }}
                                                                    >
                                                                        {kec.label}
                                                                    </td>
                                                                    {renderCounts(
                                                                        kec.counts,
                                                                        {
                                                                            status: status.label,
                                                                            zona: zona.label,
                                                                            kecamatan: kec.label,
                                                                        },
                                                                        true
                                                                    )}
                                                                </tr>
                                                            ))
                                                          : null}
                                                  </FragmentRows>
                                              );
                                          })
                                        : null}
                                </FragmentRows>
                            );
                        })}
                        {rows.length > 0 ? (
                            <tr className="bg-[#1f4e79]/10">
                                <td className={`${tdLabel} font-bold`}>Grand Total</td>
                                {AGING_COLS.map((col) => {
                                    const n = countVal(grandTotal, col);
                                    const active = isActive({ aging: col });
                                    return (
                                        <td
                                            key={col}
                                            className={`${tdBase} font-bold ${
                                                active
                                                    ? "bg-rose-100 ring-1 ring-inset ring-rose-400"
                                                    : ""
                                            } ${
                                                col === "H+0" && n > 0
                                                    ? "text-red-600"
                                                    : "text-foreground"
                                            }`}
                                        >
                                            {n ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onCellClick({ source, aging: col })
                                                    }
                                                    className="w-full cursor-pointer underline-offset-2 hover:underline"
                                                >
                                                    {n}
                                                </button>
                                            ) : (
                                                ""
                                            )}
                                        </td>
                                    );
                                })}
                                <td
                                    className={`${tdBase} font-bold ${
                                        isActive({})
                                            ? "bg-rose-100 ring-1 ring-inset ring-rose-400"
                                            : ""
                                    }`}
                                >
                                    {countVal(grandTotal, "Grand Total") ? (
                                        <button
                                            type="button"
                                            onClick={() => onCellClick({ source })}
                                            className="w-full cursor-pointer underline-offset-2 hover:underline"
                                        >
                                            {countVal(grandTotal, "Grand Total")}
                                        </button>
                                    ) : (
                                        ""
                                    )}
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function FragmentRows({ children }: { children: ReactNode }) {
    return <Fragment>{children}</Fragment>;
}

export default function UnRunsheetPage() {
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [filterDate, setFilterDate] = useState(todayIso());
    const [cabang, setCabang] = useState("(All)");
    const [cabangOptions, setCabangOptions] = useState<string[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [uploadDate, setUploadDate] = useState(todayIso());
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStageLabel, setUploadStageLabel] = useState("Mengunggah…");
    const [downloading, setDownloading] = useState(false);

    const [detailItems, setDetailItems] = useState<DetailRow[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailMessage, setDetailMessage] = useState<string | null>(null);

    const [pivot, setPivot] = useState<PivotResponse | null>(null);
    const [loadingPivot, setLoadingPivot] = useState(false);
    const [pivotDrill, setPivotDrill] = useState<PivotDrill | null>(null);

    const dateLabel = useMemo(() => formatIdDate(filterDate), [filterDate]);

    useEffect(() => {
        setPivotDrill(null);
    }, [filterDate, cabang]);

    const applyPivotDrill = useCallback((drill: PivotDrill) => {
        setPivotDrill((prev) => {
            if (prev && drillKey(prev) === drillKey(drill)) return null;
            return drill;
        });
        window.requestAnimationFrame(() => {
            document.getElementById("un-runsheet-table-card")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    }, []);

    const pivotFilteredItems = useMemo(() => {
        if (!pivotDrill) return detailItems;
        const agingCol =
            pivotDrill.source === "lt_im" ? "LT IM - TODAY" : "LT MTI - TODAY";
        return detailItems.filter((row) => {
            if (
                pivotDrill.status &&
                String(row["VALIDASI STATUS CABANG"] ?? "").trim() !== pivotDrill.status
            ) {
                return false;
            }
            if (
                pivotDrill.zona &&
                String(row.ZONA ?? "").trim() !== pivotDrill.zona
            ) {
                return false;
            }
            if (
                pivotDrill.kecamatan &&
                String(row.KECAMATAN ?? "").trim() !== pivotDrill.kecamatan
            ) {
                return false;
            }
            if (pivotDrill.aging) {
                const bucket = agingBucketClient(row[agingCol]);
                if (bucket !== pivotDrill.aging) return false;
            } else {
                // Grand Total scope: hanya baris yang punya bucket H+n di field yang diklik
                if (agingBucketClient(row[agingCol]) == null) return false;
            }
            return true;
        });
    }, [detailItems, pivotDrill]);

    const pivotExternalLabel = useMemo(() => {
        if (!pivotDrill) return null;
        const parts: string[] = [
            pivotDrill.source === "lt_im" ? "LT IM TODAY" : "LT MTI TODAY",
        ];
        if (pivotDrill.status) parts.push(`Status = ${pivotDrill.status}`);
        if (pivotDrill.zona) parts.push(`Zona = ${pivotDrill.zona}`);
        if (pivotDrill.kecamatan) parts.push(`Kecamatan = ${pivotDrill.kecamatan}`);
        if (pivotDrill.aging) parts.push(`Aging = ${pivotDrill.aging}`);
        else parts.push("Aging = (semua H+n)");
        return parts.join(" · ");
    }, [pivotDrill]);

    const loadPivot = useCallback(async () => {
        setLoadingPivot(true);
        try {
            const params = new URLSearchParams({ date: filterDate });
            if (cabang && cabang !== "(All)") params.set("cabang", cabang);
            const res = await fetch(
                `${API_URL}/api/all-shipment/un-runsheet/pivot?${params.toString()}`,
                { headers: authHeaders() }
            );
            if (!res.ok) throw new Error(await parseError(res));
            const data = (await res.json()) as PivotResponse;
            setPivot(data);
            if (data.cabang_options?.length) {
                setCabangOptions(data.cabang_options);
            }
        } catch (e: unknown) {
            setPivot(null);
            showToast(e instanceof Error ? e.message : "Gagal memuat pivot", "error");
        } finally {
            setLoadingPivot(false);
        }
    }, [cabang, filterDate, showToast]);

    const loadDetail = useCallback(async () => {
        setLoadingDetail(true);
        try {
            const params = new URLSearchParams({
                date: filterDate,
                limit: "0",
            });
            if (cabang && cabang !== "(All)") params.set("cabang", cabang);
            const res = await fetch(
                `${API_URL}/api/all-shipment/un-runsheet/rows?${params.toString()}`,
                { headers: authHeaders() }
            );
            if (!res.ok) throw new Error(await parseError(res));
            const data = (await res.json()) as DetailResponse;
            setDetailItems(data.items || []);
            setDetailMessage(data.message || null);
            if (data.cabang_options?.length) {
                setCabangOptions(data.cabang_options);
            }
        } catch (e: unknown) {
            setDetailItems([]);
            setDetailMessage(null);
            showToast(e instanceof Error ? e.message : "Gagal memuat detail", "error");
        } finally {
            setLoadingDetail(false);
        }
    }, [cabang, filterDate, showToast]);

    useEffect(() => {
        void loadPivot();
    }, [loadPivot]);

    useEffect(() => {
        void loadDetail();
    }, [loadDetail]);

    const openTambahData = () => {
        setUploadDate(filterDate || todayIso());
        setSelectedFile(null);
        setIsDraggingFile(false);
        setModalOpen(true);
    };

    const closeModal = () => {
        if (uploading) return;
        setModalOpen(false);
        setSelectedFile(null);
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

    const handleUploadFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        acceptUploadFile(e.target.files?.[0]);
    };

    const handleDropZoneDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDraggingFile(true);
    };

    const handleDropZoneDragLeave = (e: DragEvent) => {
        e.preventDefault();
        setIsDraggingFile(false);
    };

    const handleDropZoneDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDraggingFile(false);
        acceptUploadFile(e.dataTransfer.files?.[0]);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            showToast("Pilih file APEX terlebih dahulu", "error");
            return;
        }
        if (!uploadDate) {
            showToast("Pilih tanggal data", "error");
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setUploadStageLabel("Mengunggah…");
        try {
            const form = new FormData();
            form.append("file", selectedFile);
            form.append("date", uploadDate);

            const token = localStorage.getItem("token");
            if (!token) throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");

            await uploadFormWithJobProgress(
                `${API_URL}/api/all-shipment/un-runsheet/upload`,
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

            showToast(
                `UN RUNSHEET berhasil diunggah — ${formatIdDate(uploadDate)}`,
                "success"
            );
            setFilterDate(uploadDate);
            setModalOpen(false);
            setSelectedFile(null);
            setUploadProgress(0);
            void loadPivot();
            void loadDetail();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "Upload gagal", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadExcel = () => {
        setDownloading(true);
        try {
            showToast("Export Excel UN RUNSHEET belum tersedia.", "info");
        } finally {
            setDownloading(false);
        }
    };

    const emptyPivotMsg =
        pivot?.message || "Belum ada data UN RUNSHEET untuk filter ini.";

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
                        UN RUNSHEET
                    </h1>
                    <p className="mt-2 text-sm text-secondary">
                        Filter tanggal harian, pivot aging LT IM / LT MTI, unduh Excel, atau
                        tambah data APEX.
                    </p>
                </div>

                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <label className="flex flex-col gap-1.5">
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <CalendarDays className="size-4 text-secondary" />
                                    Filter Tanggal
                                </span>
                                <input
                                    type="date"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                                />
                                <span className="text-[11px] text-secondary">
                                    Filter harian: {dateLabel}
                                </span>
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-foreground">
                                    CABANG BY CODING DEST
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
                                    Filter cabang untuk pivot &amp; tabel
                                </span>
                            </label>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:mt-[26px]">
                            <button
                                type="button"
                                onClick={handleDownloadExcel}
                                disabled={downloading}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
                            >
                                {downloading ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Download className="size-4" />
                                )}
                                {downloading ? "Menyiapkan Excel…" : "Download Excel"}
                            </button>
                            <button
                                type="button"
                                onClick={openTambahData}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                            >
                                <Plus className="size-4" />
                                Tambah Data
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <AgingPivotTable
                        title={`PIVOT LT IM TODAY · ${dateLabel}`}
                        fieldLabel="LT IM TODAY"
                        source="lt_im"
                        rows={pivot?.pivot_lt_im?.rows || []}
                        grandTotal={pivot?.pivot_lt_im?.grand_total || {}}
                        loading={loadingPivot}
                        emptyMessage={emptyPivotMsg}
                        activeDrill={pivotDrill}
                        onCellClick={applyPivotDrill}
                    />
                    <AgingPivotTable
                        title={`PIVOT LT MTI TODAY · ${dateLabel}`}
                        fieldLabel="LT MTI TODAY"
                        source="lt_mti"
                        rows={pivot?.pivot_lt_mti?.rows || []}
                        grandTotal={pivot?.pivot_lt_mti?.grand_total || {}}
                        loading={loadingPivot}
                        emptyMessage={emptyPivotMsg}
                        activeDrill={pivotDrill}
                        onCellClick={applyPivotDrill}
                    />
                </div>

                <div id="un-runsheet-table-card">
                    <ShipmentRowsTable
                        title="UN RUNSHEET — Detail"
                        dateLabel={
                            cabang && cabang !== "(All)"
                                ? `${dateLabel} · ${cabang}`
                                : dateLabel
                        }
                        columns={[...CTC_DETAIL_COLUMNS]}
                        items={pivotFilteredItems}
                        loading={loadingDetail}
                        emptyMessage={
                            pivotDrill
                                ? "Tidak ada baris untuk filter pivot ini. Klik angka lain atau reset filter."
                                : detailMessage ||
                                  "Belum ada data UN RUNSHEET untuk filter ini. Unggah APEX lewat Tambah Data."
                        }
                        iconClassName="text-rose-700"
                        hint={
                            pivot?.row_count_source != null
                                ? `Sumber terfilter: ${pivot.row_count_source.toLocaleString("id-ID")} baris · klik angka pivot untuk drill-down`
                                : "Header kolom sama persis All Inbound & CTC"
                        }
                        externalFilterLabel={pivotExternalLabel}
                        onClearExternalFilters={() => setPivotDrill(null)}
                    />
                </div>
            </div>

            {modalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="un-runsheet-upload-title"
                        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-lg"
                    >
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <h2
                                id="un-runsheet-upload-title"
                                className="flex items-center gap-2 text-base font-semibold text-foreground"
                            >
                                <Upload className="size-5 text-rose-600" />
                                Upload APEX — UN RUNSHEET
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
                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-foreground">
                                    Tanggal Data
                                </span>
                                <input
                                    type="date"
                                    value={uploadDate}
                                    onChange={(e) => setUploadDate(e.target.value)}
                                    disabled={uploading}
                                    className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground disabled:opacity-60"
                                />
                            </label>

                            <div
                                onDragOver={handleDropZoneDragOver}
                                onDragLeave={handleDropZoneDragLeave}
                                onDrop={handleDropZoneDrop}
                                onClick={() => {
                                    if (!uploading) fileInputRef.current?.click();
                                }}
                                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                                    isDraggingFile
                                        ? "border-rose-400 bg-rose-50"
                                        : selectedFile
                                          ? "border-rose-200 bg-rose-50/40"
                                          : "border-border bg-gray-50/60 hover:border-rose-300 hover:bg-rose-50/40"
                                } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                            >
                                <div className="rounded-2xl bg-rose-50 p-3">
                                    <Upload className="h-6 w-6 text-rose-600" />
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
                                                : "Drag & drop file APEX di sini"}
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
                                            className="h-full rounded-full bg-rose-600 transition-[width] duration-200 ease-out"
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
                                    onClick={() => void handleUpload()}
                                    disabled={uploading || !selectedFile}
                                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                                >
                                    {uploading ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : null}
                                    {uploading ? `${uploadProgress}%` : "Upload"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </DashboardLayout>
    );
}
