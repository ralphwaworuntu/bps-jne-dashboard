"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    ClipboardList,
    FileSpreadsheet,
    Inbox,
    Loader2,
    Package,
    PackageOpen,
    Upload,
    X,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import { useToast } from "@/context/ToastContext";
import { API_URL } from "@/config";

type TemplateKind = "all_inbound_ctc" | "inbound" | "outstanding";

function formatIdDate(iso: string | null | undefined, withTime = true) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const date = d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
    if (!withTime) return date;
    const time = d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
    });
    return `${date} ${time}`;
}

function formatIdDateShort(iso: string | null | undefined) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

const TEMPLATE_SLOTS: {
    kind: TemplateKind;
    title: string;
    description: string;
}[] = [
    {
        kind: "all_inbound_ctc",
        title: "All Inbound & CTC",
        description: "Upload template All Inbound & CTC (.xlsx / .csv)",
    },
    {
        kind: "inbound",
        title: "Inbound",
        description: "Upload template Inbound (.xlsx / .csv)",
    },
    {
        kind: "outstanding",
        title: "Outstanding",
        description: "Upload template Outstanding (.xlsx / .csv)",
    },
];

export default function AllShipmentHubPage() {
    const { showToast } = useToast();
    const masterInputRef = useRef<HTMLInputElement>(null);

    const [ctcRangeStart, setCtcRangeStart] = useState<string | null>(null);
    const [ctcRangeEnd, setCtcRangeEnd] = useState<string | null>(null);
    const [ctcUpdate, setCtcUpdate] = useState<string | null>(null);
    const [inboundUpdate, setInboundUpdate] = useState<string | null>(null);
    const [outstandingUpdate, setOutstandingUpdate] = useState<string | null>(null);

    const [uploadingMaster, setUploadingMaster] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [templateFiles, setTemplateFiles] = useState<
        Partial<Record<TemplateKind, File | null>>
    >({});
    const [uploadingKind, setUploadingKind] = useState<TemplateKind | null>(null);

    const fetchMeta = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/system-info`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
            if (!res.ok) return;
            const data = await res.json();
            setCtcRangeStart(data.all_inbound_ctc_range_start ?? null);
            setCtcRangeEnd(data.all_inbound_ctc_range_end ?? null);
            setCtcUpdate(data.all_inbound_ctc_last_update ?? null);
            setInboundUpdate(data.inbound_last_update ?? null);
            setOutstandingUpdate(data.outstanding_last_update ?? null);
        } catch (e) {
            console.error("Failed to fetch all-shipment meta", e);
        }
    }, []);

    useEffect(() => {
        fetchMeta();
    }, [fetchMeta]);

    const uploadFile = async (endpoint: string, file: File) => {
        const token = localStorage.getItem("token");
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${API_URL}/${endpoint}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: "Upload gagal" }));
            throw new Error(err.detail || "Upload gagal");
        }
        return res.json();
    };

    const handleMasterSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        try {
            setUploadingMaster(true);
            await uploadFile("upload-all-shipment-master-inbound", file);
            showToast("Master Data Inbound berhasil diunggah", "success");
            await fetchMeta();
        } catch (err: any) {
            showToast(err.message || "Upload Master Data Inbound gagal", "error");
        } finally {
            setUploadingMaster(false);
        }
    };

    const handleTemplateUpload = async (kind: TemplateKind) => {
        const file = templateFiles[kind];
        if (!file) {
            showToast("Pilih file terlebih dahulu", "error");
            return;
        }
        try {
            setUploadingKind(kind);
            await uploadFile(`upload-all-shipment-template/${kind}`, file);
            const title = TEMPLATE_SLOTS.find((s) => s.kind === kind)?.title || kind;
            showToast(`Template ${title} berhasil diunggah`, "success");
            setTemplateFiles((prev) => ({ ...prev, [kind]: null }));
            await fetchMeta();
        } catch (err: any) {
            showToast(err.message || "Upload template gagal", "error");
        } finally {
            setUploadingKind(null);
        }
    };

    const ctcLine = (() => {
        const start = formatIdDateShort(ctcRangeStart);
        const end = formatIdDateShort(ctcRangeEnd);
        const upd = formatIdDate(ctcUpdate);
        if (start && end && upd) {
            return `All Inbound & CTC ${start} - ${end} (Update ${upd}).`;
        }
        return `All Inbound & CTC — (Update ${upd || "belum ada data"}).`;
    })();

    const inboundLine = `Inbound (Update ${formatIdDate(inboundUpdate) || "belum ada data"}).`;
    const outstandingLine = `Outstanding 2022 Hingga ${
        formatIdDate(outstandingUpdate) || "belum ada data"
    }.`;

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto">
                <Link
                    href="/dashboard/v2/lastmile"
                    className="inline-flex items-center text-muted-foreground hover:text-primary mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Lastmile Data
                </Link>

                <header className="mb-8">
                    <h1 className="text-4xl font-bold text-foreground">All Shipment</h1>
                    <p className="text-muted-foreground mt-2">
                        Kelola All Inbound &amp; CTC, Inbound, dan Outstanding.
                    </p>
                </header>

                {/* Top info + upload bar */}
                <div className="bg-white border border-border rounded-2xl p-6 mb-10">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6 justify-between">
                        <div className="space-y-2 text-sm text-foreground leading-relaxed">
                            <p>{ctcLine}</p>
                            <p>{inboundLine}</p>
                            <p>{outstandingLine}</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                            <input
                                ref={masterInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={handleMasterSelected}
                            />
                            <button
                                type="button"
                                onClick={() => masterInputRef.current?.click()}
                                disabled={uploadingMaster}
                                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-5 py-2.5 rounded-xl transition-colors"
                            >
                                {uploadingMaster ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Mengunggah...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" /> Upload Master Data Inbound
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsTemplateModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-5 py-2.5 rounded-xl transition-colors"
                            >
                                <FileSpreadsheet className="w-4 h-4" /> Upload Template Data
                            </button>
                        </div>
                    </div>
                </div>

                {/* Submenu cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                    <Link href="/dashboard/v2/lastmile/all-shipment/all-inbound-ctc">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative overflow-hidden bg-white border border-border rounded-3xl p-8 cursor-pointer hover:shadow-lg transition-all h-full"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Package className="w-28 h-28 text-indigo-600" />
                            </div>
                            <div className="relative z-10">
                                <div className="p-4 bg-indigo-50 w-fit rounded-2xl mb-6">
                                    <Package className="w-8 h-8 text-indigo-600" />
                                </div>
                                <h2 className="text-xl font-bold text-foreground mb-2">
                                    All Inbound &amp; CTC
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    Lihat ringkasan All Inbound &amp; CTC.
                                </p>
                            </div>
                        </motion.div>
                    </Link>

                    <Link href="/dashboard/v2/lastmile/all-shipment/inbound">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative overflow-hidden bg-white border border-border rounded-3xl p-8 cursor-pointer hover:shadow-lg transition-all h-full"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Inbox className="w-28 h-28 text-sky-600" />
                            </div>
                            <div className="relative z-10">
                                <div className="p-4 bg-sky-50 w-fit rounded-2xl mb-6">
                                    <Inbox className="w-8 h-8 text-sky-600" />
                                </div>
                                <h2 className="text-xl font-bold text-foreground mb-2">Inbound</h2>
                                <p className="text-muted-foreground text-sm">
                                    Lihat data Inbound.
                                </p>
                            </div>
                        </motion.div>
                    </Link>

                    <Link href="/dashboard/v2/lastmile/all-shipment/outstanding">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative overflow-hidden bg-white border border-border rounded-3xl p-8 cursor-pointer hover:shadow-lg transition-all h-full"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <PackageOpen className="w-28 h-28 text-amber-600" />
                            </div>
                            <div className="relative z-10">
                                <div className="p-4 bg-amber-50 w-fit rounded-2xl mb-6">
                                    <PackageOpen className="w-8 h-8 text-amber-600" />
                                </div>
                                <h2 className="text-xl font-bold text-foreground mb-2">
                                    Outstanding
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    Lihat data Outstanding.
                                </p>
                            </div>
                        </motion.div>
                    </Link>

                    <Link href="/dashboard/v2/lastmile/all-shipment/un-runsheet">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative overflow-hidden bg-white border border-border rounded-3xl p-8 cursor-pointer hover:shadow-lg transition-all h-full"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <ClipboardList className="w-28 h-28 text-rose-600" />
                            </div>
                            <div className="relative z-10">
                                <div className="p-4 bg-rose-50 w-fit rounded-2xl mb-6">
                                    <ClipboardList className="w-8 h-8 text-rose-600" />
                                </div>
                                <h2 className="text-xl font-bold text-foreground mb-2">
                                    UN RUNSHEET
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    Pivot aging &amp; detail UN RUNSHEET.
                                </p>
                            </div>
                        </motion.div>
                    </Link>
                </div>
            </div>

            {/* Modal Upload Template Data */}
            {isTemplateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                                Upload Template Data
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsTemplateModalOpen(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Pilih dan unggah template untuk masing-masing jenis data.
                            </p>
                            {TEMPLATE_SLOTS.map((slot) => {
                                const selected = templateFiles[slot.kind];
                                const busy = uploadingKind === slot.kind;
                                return (
                                    <div
                                        key={slot.kind}
                                        className="border border-border rounded-xl p-4 space-y-3"
                                    >
                                        <div>
                                            <p className="font-semibold text-foreground">
                                                {slot.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {slot.description}
                                            </p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                            <label className="flex-1 cursor-pointer">
                                                <span className="block w-full text-sm border border-dashed border-border rounded-lg px-3 py-2 text-muted-foreground hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors truncate">
                                                    {selected?.name || "Pilih file .xlsx / .csv"}
                                                </span>
                                                <input
                                                    type="file"
                                                    accept=".xlsx,.xls,.csv"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0] || null;
                                                        setTemplateFiles((prev) => ({
                                                            ...prev,
                                                            [slot.kind]: f,
                                                        }));
                                                        e.target.value = "";
                                                    }}
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                disabled={!selected || busy}
                                                onClick={() => handleTemplateUpload(slot.kind)}
                                                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 px-4 py-2 rounded-lg transition-colors shrink-0"
                                            >
                                                {busy ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />{" "}
                                                        Upload...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="w-4 h-4" /> Upload
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
