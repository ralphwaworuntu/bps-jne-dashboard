"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Download,
    History,
    RefreshCw,
    FileText,
    Filter,
    User,
    ArrowLeft,
} from "lucide-react";
import { API_URL } from "../../../../config";
import { useToast } from "../../../../context/ToastContext";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import DateFilter from "@/components/dashboard/v2/DateFilter";
import { downloadMasterDataUpload } from "@/lib/opsMasterDataApi";

type HistoryItem = {
    filename: string;
    original_filename?: string;
    uploaded_by?: string;
    upload_date: string;
    category: string;
    source?: string;
    kind?: string;
    upload_id?: number;
    downloadable?: boolean;
    is_active?: boolean;
};

const CATEGORY_BADGE: Record<string, string> = {
    Lastmile: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Firstmile: "bg-orange-50 text-orange-700 border-orange-100",
    Geotaging: "bg-purple-50 text-purple-700 border-purple-100",
    Inbound: "bg-sky-50 text-sky-700 border-sky-100",
    "All Inbound & CTC": "bg-indigo-50 text-indigo-700 border-indigo-100",
    Outstanding: "bg-amber-50 text-amber-700 border-amber-100",
    "Master Inbound": "bg-blue-50 text-blue-700 border-blue-100",
    SMU: "bg-teal-50 text-teal-700 border-teal-100",
    "Kiriman Yes": "bg-emerald-50 text-emerald-700 border-emerald-100",
    "Cakupan Area": "bg-orange-50 text-orange-700 border-orange-100",
    "Potensi Claim": "bg-cyan-50 text-cyan-700 border-cyan-100",
    "Breach Monitoring": "bg-rose-50 text-rose-700 border-rose-100",
    "Apex OTS": "bg-violet-50 text-violet-700 border-violet-100",
    "Apex Transit": "bg-blue-50 text-blue-700 border-blue-100",
    "Apex Potensi Claim": "bg-cyan-50 text-cyan-700 border-cyan-100",
    "Apex All Shipment": "bg-blue-50 text-blue-700 border-blue-100",
    "Master Report": "bg-teal-50 text-teal-700 border-teal-100",
    "DB CCC": "bg-indigo-50 text-indigo-700 border-indigo-100",
    "Database Coding Nasional": "bg-blue-50 text-blue-700 border-blue-100",
    "Database Coding NTT": "bg-sky-50 text-sky-700 border-sky-100",
    "Database Cakupan Area Delivery KOE": "bg-orange-50 text-orange-700 border-orange-100",
    "Database SLA LAZADA": "bg-purple-50 text-purple-700 border-purple-100",
    "Origin Grouping Lazada": "bg-violet-50 text-violet-700 border-violet-100",
    "Database SLA SHOPEE": "bg-orange-50 text-orange-700 border-orange-100",
    "Database SERVICE": "bg-teal-50 text-teal-700 border-teal-100",
    "Database Account": "bg-emerald-50 text-emerald-700 border-emerald-100",
    "Database ID KURIR": "bg-cyan-50 text-cyan-700 border-cyan-100",
    "Database USERNAME INBOUND": "bg-indigo-50 text-indigo-700 border-indigo-100",
    "Database Status Coding 1": "bg-rose-50 text-rose-700 border-rose-100",
    "Database Status Coding 2": "bg-rose-50 text-rose-700 border-rose-100",
    "Database Coding AUTOCLOSE": "bg-amber-50 text-amber-700 border-amber-100",
    "Database Coding Firstmile": "bg-orange-50 text-orange-700 border-orange-100",
    "Database Username Manifest": "bg-emerald-50 text-emerald-700 border-emerald-100",
};

export default function UploadPageV2() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
        }
    }, [router]);

    return (
        <DashboardLayout>
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-5 md:p-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-8">
                        <Link href="/dashboard/v2">
                            <button
                                type="button"
                                className="mb-2 inline-flex items-center text-sm font-medium text-secondary transition-colors hover:text-primary"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                            </button>
                        </Link>
                        <h1 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">
                            Upload Center
                        </h1>
                        <p className="text-secondary">
                            Riwayat upload Lastmile, Firstmile, Master Data, dan arsip lainnya —
                            unduh kapan saja.
                        </p>
                    </div>

                    <HistorySection />
                </div>
            </div>
        </DashboardLayout>
    );
}

function HistorySection() {
    const { showToast } = useToast();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

    const [filters, setFilters] = useState({
        filename: "",
        category: "",
        uploaded_by: "",
        date: "",
    });

    const uniqueFilenames = useMemo(
        () =>
            Array.from(
                new Set(
                    history
                        .map((item) => item.original_filename || item.filename)
                        .filter(Boolean)
                )
            ),
        [history]
    );
    const uniqueUsers = useMemo(
        () =>
            Array.from(
                new Set(history.map((item) => item.uploaded_by).filter(Boolean) as string[])
            ),
        [history]
    );
    const uniqueCategories = useMemo(
        () => Array.from(new Set(history.map((item) => item.category).filter(Boolean))).sort(),
        [history]
    );

    const filteredHistory = history.filter((item) => {
        const itemFilename = item.original_filename || item.filename;
        const matchFilename = filters.filename === "" || itemFilename === filters.filename;
        const matchCategory = filters.category === "" || item.category === filters.category;
        const matchUser = filters.uploaded_by === "" || item.uploaded_by === filters.uploaded_by;

        let matchDate = true;
        if (filters.date) {
            const itemDate = new Date(item.upload_date).toISOString().split("T")[0];
            matchDate = itemDate === filters.date;
        }

        return matchFilename && matchCategory && matchUser && matchDate;
    });

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/api/upload-history`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error(error);
            showToast("Gagal memuat upload history", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const itemKey = (item: HistoryItem) =>
        item.source === "master_data" && item.upload_id != null
            ? `master_data:${item.kind}:${item.upload_id}`
            : `${item.category}:${item.filename}`;

    const handleDownload = async (item: HistoryItem) => {
        const key = itemKey(item);
        setDownloadingKey(key);
        try {
            if (item.source === "master_data") {
                if (!item.kind || item.upload_id == null) {
                    throw new Error("Data unduhan Master Data tidak lengkap");
                }
                if (item.downloadable === false) {
                    throw new Error("File arsip tidak tersedia");
                }
                const blob = await downloadMasterDataUpload(item.kind, item.upload_id);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = item.original_filename || item.filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                showToast("File berhasil diunduh", "success");
                return;
            }

            const token = localStorage.getItem("token");
            const res = await fetch(
                `${API_URL}/download/history/${encodeURIComponent(item.category)}/${encodeURIComponent(item.filename)}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || "File not found");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = item.original_filename || item.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            showToast("File berhasil diunduh", "success");
        } catch (error: unknown) {
            showToast(
                error instanceof Error ? error.message : "Gagal mendownload file",
                "error"
            );
        } finally {
            setDownloadingKey(null);
        }
    };

    const getCategoryBadge = (cat: string) => {
        const cls =
            CATEGORY_BADGE[cat] ||
            (cat.startsWith("Database ") || cat.includes("Lazada")
                ? "bg-slate-50 text-slate-700 border-slate-100"
                : "bg-gray-50 text-gray-700 border-gray-100");
        return (
            <span className={`rounded-md border px-2 py-1 text-xs font-medium ${cls}`}>
                {cat}
            </span>
        );
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="flex flex-col items-start justify-between gap-4 border-b border-border p-6 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gray-100 p-2 text-gray-600">
                        <History className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Upload History</h2>
                        <p className="text-sm text-secondary">
                            Arsip file upload — filter kategori sesuai nama database / tabel
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={fetchHistory}
                    className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:bg-gray-100 hover:text-foreground"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            <div className="flex flex-wrap gap-3 border-b border-border bg-gray-50/50 p-4">
                <div className="flex min-w-[200px] items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-secondary">
                    <Filter className="h-4 w-4" />
                    <select
                        className="w-full border-none bg-transparent text-sm text-foreground outline-none"
                        value={filters.category}
                        onChange={(e) =>
                            setFilters((prev) => ({ ...prev, category: e.target.value }))
                        }
                    >
                        <option value="">All Categories</option>
                        {uniqueCategories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex min-w-[200px] items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-secondary">
                    <FileText className="h-4 w-4" />
                    <select
                        className="w-full border-none bg-transparent text-sm text-foreground outline-none"
                        value={filters.filename}
                        onChange={(e) =>
                            setFilters((prev) => ({ ...prev, filename: e.target.value }))
                        }
                    >
                        <option value="">All Files</option>
                        {uniqueFilenames.map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex min-w-[200px] items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-secondary">
                    <User className="h-4 w-4" />
                    <select
                        className="w-full border-none bg-transparent text-sm text-foreground outline-none"
                        value={filters.uploaded_by}
                        onChange={(e) =>
                            setFilters((prev) => ({ ...prev, uploaded_by: e.target.value }))
                        }
                    >
                        <option value="">All Users</option>
                        {uniqueUsers.map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>
                <DateFilter
                    value={filters.date}
                    onChange={(date) => setFilters((prev) => ({ ...prev, date }))}
                    availableDates={Array.from(
                        new Set(
                            history.map(
                                (item) => new Date(item.upload_date).toISOString().split("T")[0]
                            )
                        )
                    )}
                />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-gray-50 font-medium text-secondary">
                        <tr>
                            <th className="px-6 py-4">File Name</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4">Uploaded By</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4 text-right">Download</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-secondary">
                                    Loading history...
                                </td>
                            </tr>
                        ) : filteredHistory.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-secondary">
                                    Belum ada history upload.
                                </td>
                            </tr>
                        ) : (
                            filteredHistory.map((item, index) => {
                                const key = itemKey(item);
                                const busy = downloadingKey === key;

                                return (
                                    <tr
                                        key={`${key}-${index}`}
                                        className="transition-colors hover:bg-gray-50/50"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-foreground">
                                                {item.original_filename || item.filename}
                                                {item.is_active ? (
                                                    <span className="ml-2 text-xs font-semibold text-emerald-600">
                                                        aktif
                                                    </span>
                                                ) : null}
                                            </div>
                                            {item.original_filename &&
                                                item.original_filename !== item.filename && (
                                                    <div className="mt-0.5 text-xs text-secondary">
                                                        Stored: {item.filename}
                                                    </div>
                                                )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getCategoryBadge(item.category)}
                                        </td>
                                        <td className="px-6 py-4 text-secondary">
                                            {item.uploaded_by || "-"}
                                        </td>
                                        <td className="px-6 py-4 text-secondary">
                                            {new Date(item.upload_date).toLocaleDateString("id-ID")}
                                            <div className="text-xs">
                                                {new Date(item.upload_date).toLocaleTimeString(
                                                    "id-ID"
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleDownload(item)}
                                                disabled={busy || item.downloadable === false}
                                                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-blue-50 disabled:opacity-50"
                                                title="Download file"
                                            >
                                                <Download
                                                    className={`h-4 w-4 ${busy ? "animate-pulse" : ""}`}
                                                />
                                                {busy ? "Mengunduh..." : "Download"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
