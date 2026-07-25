"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import SyncedHorizontalTable from "@/components/dashboard/v2/SyncedHorizontalTable";
import {
    ArrowLeft,
    Download,
    Loader2,
    Package,
    RefreshCw,
    Search,
    Upload,
    X,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { API_URL } from "@/config";

type SMURow = {
    "Tanggal Entry": string;
    "SM NO": string;
    "SM SCH DATE": string;
    "REMARKS SM": string;
    "SMU REMARKS DATE": string;
    "SMU BAG": string;
    AWB: string;
    ket: string;
};

const COLUMNS: { key: keyof SMURow; label: string }[] = [
    { key: "Tanggal Entry", label: "Tanggal Entry" },
    { key: "SM NO", label: "SM NO" },
    { key: "SM SCH DATE", label: "SM SCH DATE" },
    { key: "REMARKS SM", label: "REMARKS SM" },
    { key: "SMU REMARKS DATE", label: "SMU REMARKS DATE" },
    { key: "SMU BAG", label: "SMU BAG" },
    { key: "AWB", label: "AWB" },
    { key: "ket", label: "ket" },
];

export default function DatabaseSMUPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [rows, setRows] = useState<SMURow[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [search, setSearch] = useState("");
    const [smuMeta, setSmuMeta] = useState<{ lastUpdate: string; filename: string }>({
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
            const [dataRes, infoRes] = await Promise.all([
                fetch(`${API_URL}/api/smu-firstmile`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${API_URL}/system-info`),
            ]);
            if (dataRes.ok) {
                const json: SMURow[] = await dataRes.json();
                setRows(json);
            }
            if (infoRes.ok) {
                const info = await infoRes.json();
                if (info.smu_last_update) {
                    const d = new Date(info.smu_last_update);
                    setSmuMeta({
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
                        filename: info.smu_filename || "-",
                    });
                }
            }
        } catch {
            showToast("Gagal memuat data SMU.", "error");
        } finally {
            setLoading(false);
        }
    }, [router, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUpload = async (file: File) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch(`${API_URL}/upload-smu-firstmile`, {
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
            const res = await fetch(`${API_URL}/download/smu-firstmile`, {
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
            a.download = "database_smu_firstmile.csv";
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

    const needle = search.trim().toLowerCase();
    const filtered = needle
        ? rows.filter((r) =>
              Object.values(r).some((v) => String(v).toLowerCase().includes(needle))
          )
        : rows;

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-7xl space-y-6">
                {/* Back link + title */}
                <div>
                    <Link
                        href="/dashboard/v2/firstmile"
                        className="group mb-4 inline-flex items-center text-muted-foreground transition-colors hover:text-primary"
                    >
                        <ArrowLeft className="mr-2 size-4 transition-transform group-hover:-translate-x-1" />
                        Back to Firstmile Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Database SMU
                    </h1>
                </div>

                {/* Upload area + info */}
                <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-white p-6">
                    <div className="flex-1 space-y-2">
                        <p className="text-sm font-semibold text-foreground">Upload file SMU</p>
                        <p className="text-xs text-secondary">
                            Format: .xlsx / .xls / .csv &mdash; kolom otomatis dinormalisasi ke 8
                            header kanonik.
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
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                            >
                                {uploading ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Upload className="size-4" />
                                )}
                                {uploading ? "Uploading..." : "Upload SMU"}
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
                            File: <span className="font-medium text-foreground">{smuMeta.filename}</span>
                        </p>
                        <p>
                            Update terakhir:{" "}
                            <span className="font-medium text-foreground">{smuMeta.lastUpdate}</span>
                        </p>
                        <p className="mt-1 font-semibold text-foreground">{rows.length} baris</p>
                    </div>
                </div>

                {/* Search bar */}
                <div className="relative max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari AWB, SM NO, SMU BAG..."
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

                {/* Table */}
                <SyncedHorizontalTable>
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr>
                                <th className="whitespace-nowrap border border-black/20 bg-[#ed7d31] px-4 py-3 text-left font-semibold text-white">
                                    No
                                </th>
                                {COLUMNS.map((col) => (
                                    <th
                                        key={col.key}
                                        className="whitespace-nowrap border border-black/20 bg-[#ed7d31] px-4 py-3 text-left font-semibold text-white"
                                    >
                                        {col.label}
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
                                            Memuat data SMU...
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
                                            <Package className="size-8 text-secondary/60" />
                                            <p className="font-medium">
                                                {rows.length === 0
                                                    ? "Belum ada data. Upload file SMU terlebih dahulu."
                                                    : "Tidak ada hasil pencarian."}
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
                                        <td className="whitespace-nowrap border border-black/10 px-4 py-2.5 text-center font-medium text-secondary">
                                            {i + 1}
                                        </td>
                                        {COLUMNS.map((col) => (
                                            <td
                                                key={col.key}
                                                className="whitespace-nowrap border border-black/10 px-4 py-2.5 text-foreground"
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
        </DashboardLayout>
    );
}
