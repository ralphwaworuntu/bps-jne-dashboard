"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import SyncedHorizontalTable from "@/components/dashboard/v2/SyncedHorizontalTable";
import {
    ArrowLeft,
    ChevronDown,
    Download,
    FilterX,
    Loader2,
    MapPinned,
    RefreshCw,
    Search,
    Upload,
    X,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { API_URL } from "@/config";

type CakupanRow = Record<string, string>;

const COLUMNS: { key: string; label: string; headerClass?: string }[] = [
    { key: "Coding", label: "Coding" },
    { key: "Provinsi", label: "Provinsi" },
    { key: "Kota / Kabupaten", label: "Kota / Kabupaten" },
    { key: "Kecamatan", label: "Kecamatan" },
    { key: "Kelurahan", label: "Kelurahan" },
    { key: "Kode POS", label: "Kode POS" },
    { key: "Status Cabang", label: "Status Cabang" },
    { key: "Zona EXISTING", label: "Zona EXISTING" },
    { key: "Cabang", label: "Cabang" },
    { key: "Wilayah Grouping", label: "Wilayah Grouping" },
    { key: "Gate Inbound", label: "Gate Inbound" },
    { key: "Area Delivery", label: "Area Delivery" },
    { key: "Jadwal Penerusan", label: "Jadwal Penerusan" },
    { key: "Jadwal Penerusan ke Agen", label: "Jadwal Penerusan ke Agen" },
    { key: "Transportasi", label: "Transportasi" },
    { key: "ETD", label: "ETD" },
    { key: "ETA", label: "ETA" },
    { key: "Jadwal Delivery", label: "Jadwal Delivery" },
    { key: "Nama Kurir", label: "Nama Kurir" },
    { key: "ID Kurir", label: "ID Kurir" },
    { key: "Ket", label: "Ket" },
    { key: "Keterangan", label: "Keterangan" },
];

const EMPTY_BLANKS = "(Kosong)";

function uniqueOptions(values: string[], max = 500) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of values) {
        const s = (v ?? "").toString();
        const key = s.trim() === "" ? EMPTY_BLANKS : s;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(key);
        if (out.length >= max) break;
    }
    return out.sort((a, b) => {
        if (a === EMPTY_BLANKS) return 1;
        if (b === EMPTY_BLANKS) return -1;
        return a.localeCompare(b, "id-ID", { numeric: true, sensitivity: "base" });
    });
}

function HeaderFilter({
    value,
    onChange,
    options,
    ariaLabel,
}: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    ariaLabel: string;
}) {
    const active = value !== "";
    return (
        <span className="relative ml-1 inline-flex shrink-0 items-center">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={ariaLabel}
                className="absolute inset-0 z-10 h-full min-w-[18px] cursor-pointer opacity-0"
            >
                <option value="">(Semua)</option>
                {options.map((v) => (
                    <option key={v} value={v}>
                        {v}
                    </option>
                ))}
            </select>
            <ChevronDown
                className={`size-3.5 ${active ? "text-yellow-200" : "text-white/80"}`}
                aria-hidden
            />
            {active && (
                <span
                    className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-yellow-300"
                    aria-hidden
                />
            )}
        </span>
    );
}

export default function CakupanAreaDeliveryPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [rows, setRows] = useState<CakupanRow[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(50);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [meta, setMeta] = useState<{ lastUpdate: string; filename: string }>({
        lastUpdate: "-",
        filename: "-",
    });

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/");
            return;
        }
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(pageSize),
            });
            if (search.trim()) params.set("q", search.trim());
            const [dataRes, infoRes] = await Promise.all([
                fetch(`${API_URL}/api/cakupan-area?${params}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${API_URL}/system-info`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } }),
            ]);
            if (dataRes.ok) {
                const json = await dataRes.json();
                const items: CakupanRow[] = Array.isArray(json) ? json : (json.items || []);
                setRows(items);
                setTotal(Array.isArray(json) ? items.length : (json.total || 0));
                setPages(Array.isArray(json) ? 1 : (json.pages || 0));
            }
            if (infoRes.ok) {
                const info = await infoRes.json();
                if (info.cakupan_last_update) {
                    const d = new Date(info.cakupan_last_update);
                    setMeta({
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
                        filename: info.cakupan_filename || "-",
                    });
                } else {
                    setMeta({ lastUpdate: "-", filename: "-" });
                }
            }
        } catch {
            showToast("Gagal memuat data cakupan area.", "error");
        } finally {
            setLoading(false);
        }
    }, [router, showToast, page, pageSize, search]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setPage(1);
    }, [search]);

    const columnOptions = useMemo(() => {
        const map: Record<string, string[]> = {};
        for (const col of COLUMNS) {
            map[col.key] = uniqueOptions(rows.map((r) => r[col.key] ?? ""));
        }
        return map;
    }, [rows]);

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return rows.filter((r) => {
            for (const col of COLUMNS) {
                const f = filters[col.key];
                if (!f) continue;
                const cell = (r[col.key] ?? "").toString();
                if (f === EMPTY_BLANKS) {
                    if (cell.trim() !== "") return false;
                } else if (cell !== f) {
                    return false;
                }
            }
            if (!needle) return true;
            return Object.values(r).some((v) => String(v).toLowerCase().includes(needle));
        });
    }, [rows, filters, search]);

    const activeFilterCount = useMemo(
        () => Object.values(filters).filter((v) => v !== "").length,
        [filters]
    );

    const setFilter = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => setFilters({});

    const handleUpload = async (file: File) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch(`${API_URL}/upload-cakupan-area`, {
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
            setFilters({});
            fetchData();
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
            const res = await fetch(`${API_URL}/download/cakupan-area`, {
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
            a.download = "cakupan_area_delivery_koe.csv";
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

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-7xl space-y-6">
                <div>
                    <Link
                        href="/dashboard/v2/lastmile"
                        className="group mb-4 inline-flex items-center text-muted-foreground transition-colors hover:text-primary"
                    >
                        <ArrowLeft className="mr-2 size-4 transition-transform group-hover:-translate-x-1" />
                        Back to Lastmile Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Cakupan Area Delivery KOE
                    </h1>
                    <p className="mt-2 text-sm text-secondary">
                        Upload master data cakupan area delivery dan lihat tabel detail kecamatan/cabang.
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-white p-6">
                    <div className="flex-1 space-y-2">
                        <p className="text-sm font-semibold text-foreground">
                            Upload Master Data Cakupan Area Delivery
                        </p>
                        <p className="text-xs text-secondary">
                            Format: .xlsx / .xls / .csv — header dinormalisasi ke 22 kolom kanonik.
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
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
                            <button
                                type="button"
                                disabled={uploading}
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
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
                                disabled={downloading || rows.length === 0}
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
                                onClick={() => fetchData()}
                                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
                            >
                                <RefreshCw className="size-4" />
                                Refresh
                            </button>
                        </div>
                    </div>
                    <div className="text-right text-xs text-secondary">
                        <p>
                            File:{" "}
                            <span className="font-medium text-foreground">{meta.filename}</span>
                        </p>
                        <p>
                            Update terakhir:{" "}
                            <span className="font-medium text-foreground">{meta.lastUpdate}</span>
                        </p>
                        <p className="mt-1 font-semibold text-foreground">
                            {filtered.length} / {rows.length} baris
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative max-w-md flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari Coding, kecamatan, cabang, kurir..."
                            className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-10 text-sm"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground"
                            >
                                <X className="size-4" />
                            </button>
                        )}
                    </div>
                    {activeFilterCount > 0 && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
                        >
                            <FilterX className="size-4" />
                            Reset filter ({activeFilterCount})
                        </button>
                    )}
                </div>

                <SyncedHorizontalTable className="!rounded-none">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr>
                                <th className="whitespace-nowrap border border-black/20 bg-[#ed7d31] px-3 py-2.5 text-left font-semibold text-white">
                                    No
                                </th>
                                {COLUMNS.map((col) => (
                                    <th
                                        key={col.key}
                                        className={`whitespace-nowrap border border-black/20 px-3 py-2.5 text-left font-semibold text-foreground ${
                                            col.headerClass || "bg-[#ed7d31] text-white"
                                        }`}
                                    >
                                        <div className="inline-flex items-center gap-0.5">
                                            <span>{col.label}</span>
                                            <HeaderFilter
                                                value={filters[col.key] || ""}
                                                onChange={(v) => setFilter(col.key, v)}
                                                options={columnOptions[col.key] || []}
                                                ariaLabel={`Filter ${col.label}`}
                                            />
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={COLUMNS.length + 1}
                                        className="px-4 py-16 text-center text-secondary"
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            <Loader2 className="size-4 animate-spin" />
                                            Memuat data...
                                        </span>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={COLUMNS.length + 1}
                                        className="px-4 py-16 text-center text-secondary"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <MapPinned className="size-8 text-secondary/60" />
                                            <p className="font-medium">
                                                {rows.length === 0
                                                    ? "Belum ada data. Upload master cakupan area terlebih dahulu."
                                                    : "Tidak ada hasil filter / pencarian."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((row, i) => (
                                    <tr
                                        key={i}
                                        className="border-t border-border transition-colors hover:bg-muted/40"
                                    >
                                        <td className="whitespace-nowrap border border-black/10 px-3 py-2 text-center font-medium text-secondary">
                                            {i + 1}
                                        </td>
                                        {COLUMNS.map((col) => (
                                            <td
                                                key={col.key}
                                                className="whitespace-nowrap border border-black/10 px-3 py-2 text-foreground"
                                            >
                                                {row[col.key] || ""}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </SyncedHorizontalTable>
            </div>

            {(pages > 1 || total > 0) && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-secondary">
                    <span>
                        Menampilkan {rows.length} baris (filter halaman) dari total {total} data
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="px-3 py-1.5 rounded-lg border border-border bg-white disabled:opacity-50"
                        >
                            Sebelumnya
                        </button>
                        <span className="font-medium text-foreground">
                            Halaman {page} / {Math.max(pages, 1)}
                        </span>
                        <button
                            type="button"
                            disabled={page >= pages}
                            onClick={() => setPage((p) => p + 1)}
                            className="px-3 py-1.5 rounded-lg border border-border bg-white disabled:opacity-50"
                        >
                            Berikutnya
                        </button>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
