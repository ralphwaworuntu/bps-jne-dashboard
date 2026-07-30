"use client";

import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    startTransition,
} from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import ReferenceUploadCard, {
    type ReferenceUploadColor,
} from "@/components/dashboard/v2/ReferenceUploadCard";
import ShipmentRowsTable from "@/app/dashboard/v2/lastmile/all-shipment/inbound/ShipmentRowsTable";
import { useToast } from "@/context/ToastContext";
import {
    createMasterDataKind,
    deleteMasterDataKind,
    fetchMasterData,
    listMasterDataKinds,
    listMasterDataUploads,
    uploadMasterData,
    type MasterDataColorClass,
    type MasterDataKind,
    type MasterDataKindDef,
    type MasterDataUpload,
} from "@/lib/opsMasterDataApi";

const COLOR_OPTIONS: MasterDataColorClass[] = [
    "blue",
    "emerald",
    "orange",
    "purple",
    "rose",
    "cyan",
];

type SlaLazadaView = "sla" | "origin_grouping";

/** Label header (hilangkan suffix .1 dari kolom duplikat Excel). */
function slaColumnLabel(col: string): string {
    return col.replace(/\.1$/, "");
}

type SlotState = {
    file: File | null;
    uploading: boolean;
    isUploaded: boolean;
    lastUpdated: string;
    filename: string;
    rowCount: number;
};

const emptySlot = (): SlotState => ({
    file: null,
    uploading: false,
    isUploaded: false,
    lastUpdated: "-",
    filename: "-",
    rowCount: 0,
});

function formatTime(isoOrDate: string | Date) {
    const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    if (Number.isNaN(date.getTime())) return "-";
    return (
        date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        }) +
        " • " +
        date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    );
}

function uploadToSlot(upload: MasterDataUpload | null | undefined): SlotState {
    if (!upload) return emptySlot();
    return {
        file: null,
        uploading: false,
        isUploaded: true,
        lastUpdated: formatTime(upload.created_at),
        filename: upload.original_filename,
        rowCount: upload.row_count,
    };
}

function parseColumnsInput(raw: string): string[] {
    const lines = raw
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    return lines;
}

type LazadaCombinedCardProps = {
    slotSla: SlotState;
    slotOrigin: SlotState;
    onFileChangeSla: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFileChangeOrigin: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUploadSla: () => void;
    onUploadOrigin: () => void;
};

function LazadaSlotRow({
    label,
    slot,
    theme,
    onFileChange,
    onUpload,
}: {
    label: string;
    slot: SlotState;
    theme: { bg: string; text: string; btn: string };
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUpload: () => void;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-foreground">{label}</p>
            {slot.isUploaded ? (
                <div className="flex items-start gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-2.5 py-2">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-emerald-700">
                            {slot.filename}
                        </p>
                        <p className="text-[10px] text-emerald-600/70">
                            {slot.lastUpdated}
                            {slot.rowCount
                                ? ` · ${slot.rowCount.toLocaleString("id-ID")} baris`
                                : ""}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-2.5 py-2">
                    <p className="text-xs text-gray-400">Belum diunggah</p>
                </div>
            )}
            <label
                className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium shadow-sm transition-colors hover:opacity-80 ${theme.bg} ${theme.text}`}
            >
                <Upload className="h-3.5 w-3.5" />
                <span className="truncate">{slot.file ? slot.file.name : "Pilih File…"}</span>
                <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={onFileChange}
                    className="hidden"
                    disabled={slot.uploading}
                />
            </label>
            {slot.file ? (
                <button
                    type="button"
                    onClick={onUpload}
                    disabled={slot.uploading}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-xl border-0 px-3 py-2 text-xs font-medium text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-70 ${theme.btn}`}
                >
                    {slot.uploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Upload className="h-3.5 w-3.5" />
                    )}
                    {slot.uploading ? "Proses…" : "Unggah"}
                </button>
            ) : null}
        </div>
    );
}

function LazadaCombinedCard({
    slotSla,
    slotOrigin,
    onFileChangeSla,
    onFileChangeOrigin,
    onUploadSla,
    onUploadOrigin,
}: LazadaCombinedCardProps) {
    const purpleTheme = {
        bg: "bg-purple-50",
        text: "text-purple-600",
        btn: "bg-purple-600 hover:bg-purple-700",
    };
    const violetTheme = {
        bg: "bg-violet-50",
        text: "text-violet-600",
        btn: "bg-violet-600 hover:bg-violet-700",
    };

    return (
        <div className="flex flex-col rounded-2xl border border-purple-100 bg-white p-4 shadow-sm transition-all hover:border-purple-300">
            <div className="mb-3">
                <h3 className="text-base font-bold text-foreground">Database SLA Lazada</h3>
                <p className="text-xs text-secondary">Upload 2 tabel referensi Lazada</p>
            </div>

            <div className="flex flex-col gap-3">
                <LazadaSlotRow
                    label="Database SLA Lazada"
                    slot={slotSla}
                    theme={purpleTheme}
                    onFileChange={onFileChangeSla}
                    onUpload={onUploadSla}
                />
                <div className="border-t border-gray-100" />
                <LazadaSlotRow
                    label="Origin Grouping Lazada"
                    slot={slotOrigin}
                    theme={violetTheme}
                    onFileChange={onFileChangeOrigin}
                    onUpload={onUploadOrigin}
                />
            </div>
        </div>
    );
}

export default function MasterDataPage() {
    const { showToast } = useToast();
    const [kinds, setKinds] = useState<MasterDataKindDef[]>([]);
    const [slots, setSlots] = useState<Record<string, SlotState>>({});
    const [kindsLoading, setKindsLoading] = useState(true);
    const [cardsExpanded, setCardsExpanded] = useState(false);

    const cardKinds = useMemo(
        () => kinds.filter((k) => k.card_group !== "lazada"),
        [kinds]
    );
    const hasLazada = useMemo(
        () => kinds.some((k) => k.card_group === "lazada"),
        [kinds]
    );

    const tabs = useMemo(() => {
        const labels: string[] = [];
        const seen = new Set<string>();
        for (const k of kinds) {
            const tab = k.tab_label || k.label;
            if (seen.has(tab)) continue;
            seen.add(tab);
            labels.push(tab);
        }
        return labels;
    }, [kinds]);

    const [activeTab, setActiveTab] = useState("");
    const [slaLazadaView, setSlaLazadaView] = useState<SlaLazadaView>("sla");

    const [tableColumns, setTableColumns] = useState<string[]>([]);
    const [tableData, setTableData] = useState<Record<string, string>[]>([]);
    const [isLoadingTable, setIsLoadingTable] = useState(false);
    const [tableMessage, setTableMessage] = useState("Data belum diunggah.");
    const [dataVersion, setDataVersion] = useState(0);

    // Admin form (popup)
    const [manageModalOpen, setManageModalOpen] = useState(false);
    const [newLabel, setNewLabel] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newColumns, setNewColumns] = useState("");
    const [newColor, setNewColor] = useState<MasterDataColorClass>("blue");
    const [creating, setCreating] = useState(false);
    const [deletingKind, setDeletingKind] = useState<string | null>(null);

    const closeManageModal = () => {
        if (creating || deletingKind) return;
        setManageModalOpen(false);
    };

    useEffect(() => {
        if (!activeTab && tabs.length) {
            setActiveTab(tabs[0]);
        } else if (activeTab && tabs.length && !tabs.includes(activeTab)) {
            setActiveTab(tabs[0]);
        }
    }, [tabs, activeTab]);

    const kindsForTab = useMemo(
        () => kinds.filter((k) => (k.tab_label || k.label) === activeTab),
        [kinds, activeTab]
    );

    const isLazadaTab = useMemo(
        () => kindsForTab.some((k) => k.card_group === "lazada"),
        [kindsForTab]
    );

    const activeKind: MasterDataKind = useMemo(() => {
        if (isLazadaTab) {
            return slaLazadaView === "origin_grouping"
                ? "origin_grouping_lazada"
                : "sla_lazada";
        }
        return kindsForTab[0]?.kind ?? "";
    }, [isLazadaTab, slaLazadaView, kindsForTab]);

    const activeDef = useMemo(
        () => kinds.find((k) => k.kind === activeKind) ?? kindsForTab[0],
        [kinds, activeKind, kindsForTab]
    );

    const activeSlot = slots[activeKind] ?? emptySlot();

    const displayColumns = useMemo(() => {
        if (!isLazadaTab) {
            return tableColumns.length
                ? tableColumns
                : activeDef?.columns ?? [];
        }
        const wanted =
            slaLazadaView === "origin_grouping"
                ? kinds.find((k) => k.kind === "origin_grouping_lazada")?.columns ?? []
                : kinds.find((k) => k.kind === "sla_lazada")?.columns ?? [];
        const available = new Set(tableColumns);
        const matched = wanted.filter((c) => available.has(c));
        return matched.length ? matched : wanted.length ? wanted : tableColumns;
    }, [isLazadaTab, slaLazadaView, tableColumns, activeDef, kinds]);

    const refreshAll = useCallback(async () => {
        setKindsLoading(true);
        try {
            const [kindItems, uploadItems] = await Promise.all([
                listMasterDataKinds(),
                listMasterDataUploads(),
            ]);
            setKinds(kindItems);
            const nextSlots: Record<string, SlotState> = {};
            for (const k of kindItems) {
                nextSlots[k.kind] = uploadToSlot(uploadItems[k.kind]);
            }
            setSlots(nextSlots);
            setDataVersion((v) => v + 1);
        } catch (e: unknown) {
            showToast(
                e instanceof Error ? e.message : "Gagal memuat daftar Master Data.",
                "error"
            );
        } finally {
            setKindsLoading(false);
        }
    }, [showToast]);

    const uploadedCardsCount = useMemo(() => {
        let count = cardKinds.filter((k) => slots[k.kind]?.isUploaded).length;
        if (hasLazada) {
            if (slots.sla_lazada?.isUploaded) count += 1;
            if (slots.origin_grouping_lazada?.isUploaded) count += 1;
        }
        return count;
    }, [cardKinds, hasLazada, slots]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void refreshAll();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [refreshAll]);

    useEffect(() => {
        if (!activeKind) return;
        let cancelled = false;
        setIsLoadingTable(true);
        setTableMessage("Memuat data...");

        fetchMasterData({
            kind: activeKind,
            limit: 0,
        })
            .then((res) => {
                if (cancelled) return;
                const fallback = activeDef?.columns ?? [];
                setTableColumns(res.columns?.length ? res.columns : fallback);
                setTableData(res.items ?? []);
                setTableMessage(
                    res.message ||
                        (res.total
                            ? ""
                            : `Data untuk referensi ${activeTab} belum diunggah.`)
                );
            })
            .catch((e: unknown) => {
                if (cancelled) return;
                setTableData([]);
                setTableColumns(activeDef?.columns ?? []);
                setTableMessage(
                    e instanceof Error ? e.message : "Gagal memuat data master."
                );
            })
            .finally(() => {
                if (!cancelled) setIsLoadingTable(false);
            });

        return () => {
            cancelled = true;
        };
    }, [activeKind, activeTab, dataVersion, activeDef?.columns]);

    const handleFileChange = (key: MasterDataKind, e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setSlots((prev) => ({
                ...prev,
                [key]: { ...(prev[key] ?? emptySlot()), file },
            }));
        }
    };

    const handleUpload = async (key: MasterDataKind) => {
        const slot = slots[key] ?? emptySlot();
        if (!slot.file) return;

        setSlots((prev) => ({
            ...prev,
            [key]: { ...(prev[key] ?? emptySlot()), uploading: true },
        }));

        try {
            const res = await uploadMasterData(key, slot.file);
            const def = kinds.find((d) => d.kind === key);
            setSlots((prev) => ({
                ...prev,
                [key]: uploadToSlot(res.upload),
            }));
            showToast(
                `${def?.label ?? "Master Data"} tersimpan (${res.rows.toLocaleString("id-ID")} baris).`,
                "success"
            );

            if (def?.card_group === "lazada") {
                setActiveTab(def.tab_label || "SLA LAZADA");
                setSlaLazadaView(
                    key === "origin_grouping_lazada" ? "origin_grouping" : "sla"
                );
            } else if (def) {
                setActiveTab(def.tab_label || def.label);
            }

            setDataVersion((v) => v + 1);
        } catch (e: unknown) {
            setSlots((prev) => ({
                ...prev,
                [key]: { ...(prev[key] ?? emptySlot()), uploading: false },
            }));
            showToast(e instanceof Error ? e.message : "Upload gagal.", "error");
        }
    };

    const handleCreateKind = async () => {
        const label = newLabel.trim();
        const columns = parseColumnsInput(newColumns);
        if (!label) {
            showToast("Judul database wajib diisi.", "error");
            return;
        }
        if (!columns.length) {
            showToast("Isi minimal satu header kolom.", "error");
            return;
        }

        setCreating(true);
        try {
            const item = await createMasterDataKind({
                label,
                description: newDescription.trim() || undefined,
                columns,
                color_class: newColor,
                tab_label: label.replace(/^Database\s+/i, "").trim() || label,
            });
            showToast(`${item.label} berhasil ditambahkan.`, "success");
            setNewLabel("");
            setNewDescription("");
            setNewColumns("");
            setNewColor("blue");
            await refreshAll();
            setActiveTab(item.tab_label || item.label);
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "Gagal menambah database.", "error");
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteKind = async (kind: MasterDataKindDef) => {
        if (kind.is_builtin) {
            showToast("Database bawaan tidak dapat dihapus.", "error");
            return;
        }
        const ok = window.confirm(
            `Hapus "${kind.label}"?\n\nSemua file upload dan data tabel untuk jenis ini akan dihapus permanen.`
        );
        if (!ok) return;

        setDeletingKind(kind.kind);
        try {
            await deleteMasterDataKind(kind.kind);
            showToast(`${kind.label} berhasil dihapus.`, "success");
            await refreshAll();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "Gagal menghapus database.", "error");
        } finally {
            setDeletingKind(null);
        }
    };

    const emptyHint = useMemo(() => {
        if (isLoadingTable) return "Memuat data referensi...";
        if (tableMessage) return tableMessage;
        return `Data untuk referensi ${activeTab} belum diunggah.`;
    }, [isLoadingTable, tableMessage, activeTab]);

    const tableTitle = useMemo(() => {
        if (isLazadaTab) {
            return slaLazadaView === "origin_grouping"
                ? "Origin Grouping Lazada"
                : "Database SLA Lazada";
        }
        return activeDef?.label ?? activeTab;
    }, [isLazadaTab, slaLazadaView, activeDef?.label, activeTab]);

    const customKinds = useMemo(() => kinds.filter((k) => !k.is_builtin), [kinds]);

    return (
        <DashboardLayout>
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-5 md:p-8">
                <div className="mx-auto max-w-[1800px]">
                    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                            <h1 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">
                                Master Data
                            </h1>
                            <p className="text-secondary">
                                Kelola file referensi master data untuk operasional. Data Excel/CSV
                                diunggah, diparse, disimpan, lalu ditampilkan di tabel. Riwayat
                                upload tersedia di{" "}
                                <a
                                    href="/dashboard/v2/upload"
                                    className="font-medium text-primary hover:underline"
                                >
                                    Upload Center
                                </a>
                                .
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setManageModalOpen(true)}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            Kelola Database
                        </button>
                    </div>

                    <section className="mb-10 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                        <button
                            type="button"
                            onClick={() => setCardsExpanded((v) => !v)}
                            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50/80"
                            aria-expanded={cardsExpanded}
                        >
                            <div>
                                <h2 className="text-base font-bold text-foreground">
                                    Upload Database
                                </h2>
                                <p className="text-xs text-secondary">
                                    {cardKinds.length + (hasLazada ? 1 : 0)} kartu ·{" "}
                                    {uploadedCardsCount} sudah terunggah
                                </p>
                            </div>
                            {cardsExpanded ? (
                                <ChevronUp className="h-5 w-5 shrink-0 text-secondary" />
                            ) : (
                                <ChevronDown className="h-5 w-5 shrink-0 text-secondary" />
                            )}
                        </button>

                        {cardsExpanded ? (
                            <div className="border-t border-border p-4 md:p-5">
                                {kindsLoading && !kinds.length ? (
                                    <div className="flex items-center gap-2 text-sm text-secondary">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Memuat daftar database…
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                                        {cardKinds.map((dataset) => {
                                            const slot = slots[dataset.kind] ?? emptySlot();
                                            return (
                                                <ReferenceUploadCard
                                                    key={dataset.kind}
                                                    title={dataset.label}
                                                    description={dataset.description}
                                                    colorClass={
                                                        (dataset.color_class as ReferenceUploadColor) ||
                                                        "blue"
                                                    }
                                                    file={slot.file}
                                                    uploading={slot.uploading}
                                                    isUploaded={slot.isUploaded}
                                                    lastUpdated={
                                                        slot.isUploaded
                                                            ? `${slot.lastUpdated}${
                                                                  slot.rowCount
                                                                      ? ` · ${slot.rowCount.toLocaleString("id-ID")} baris`
                                                                      : ""
                                                              }`
                                                            : slot.lastUpdated
                                                    }
                                                    filename={slot.filename}
                                                    onFileChange={(e) =>
                                                        handleFileChange(dataset.kind, e)
                                                    }
                                                    onUpload={() => void handleUpload(dataset.kind)}
                                                />
                                            );
                                        })}

                                        {hasLazada ? (
                                            <LazadaCombinedCard
                                                slotSla={slots.sla_lazada ?? emptySlot()}
                                                slotOrigin={
                                                    slots.origin_grouping_lazada ?? emptySlot()
                                                }
                                                onFileChangeSla={(e) =>
                                                    handleFileChange("sla_lazada", e)
                                                }
                                                onFileChangeOrigin={(e) =>
                                                    handleFileChange("origin_grouping_lazada", e)
                                                }
                                                onUploadSla={() => void handleUpload("sla_lazada")}
                                                onUploadOrigin={() =>
                                                    void handleUpload("origin_grouping_lazada")
                                                }
                                            />
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </section>

                    <div className="mb-10 overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
                        <div className="border-b border-border bg-gray-50/50">
                            <div className="flex overflow-x-auto hide-scrollbar">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => {
                                            startTransition(() => {
                                                setActiveTab(tab);
                                                const tabKinds = kinds.filter(
                                                    (k) => (k.tab_label || k.label) === tab
                                                );
                                                if (tabKinds.some((k) => k.card_group === "lazada")) {
                                                    setSlaLazadaView("sla");
                                                }
                                            });
                                        }}
                                        className={`whitespace-nowrap border-b-2 px-6 py-4 text-sm font-semibold transition-colors ${
                                            activeTab === tab
                                                ? "border-blue-600 bg-white text-blue-600"
                                                : "border-transparent text-secondary hover:bg-gray-100/50 hover:text-foreground"
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {isLazadaTab ? (
                            <div className="flex flex-wrap items-center gap-3 border-b border-border bg-white px-4 py-3">
                                <span className="text-sm font-semibold text-foreground">
                                    Tampilan Tabel:
                                </span>
                                <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-gray-50 px-2.5 py-1.5">
                                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="radio"
                                            name="sla-lazada-view"
                                            value="sla"
                                            checked={slaLazadaView === "sla"}
                                            onChange={() => setSlaLazadaView("sla")}
                                            className="size-4 accent-purple-600"
                                        />
                                        Database SLA Lazada
                                    </label>
                                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="radio"
                                            name="sla-lazada-view"
                                            value="origin_grouping"
                                            checked={slaLazadaView === "origin_grouping"}
                                            onChange={() => setSlaLazadaView("origin_grouping")}
                                            className="size-4 accent-violet-600"
                                        />
                                        Origin Grouping Lazada
                                    </label>
                                </div>
                                {activeSlot.isUploaded ? (
                                    <span className="text-xs text-secondary">
                                        Sumber: {activeSlot.filename}
                                    </span>
                                ) : null}
                            </div>
                        ) : activeSlot.isUploaded ? (
                            <div className="border-b border-border bg-white px-4 py-2 text-xs text-secondary">
                                Sumber: {activeSlot.filename}
                            </div>
                        ) : null}

                        <ShipmentRowsTable
                            embedded
                            title={tableTitle}
                            dateLabel={activeTab || "Master Data"}
                            columns={displayColumns}
                            items={tableData}
                            loading={isLoadingTable || !activeKind}
                            emptyMessage={emptyHint}
                            iconClassName="text-blue-700"
                            formatColumnLabel={slaColumnLabel}
                            resetKey={activeKind}
                            hint="Scroll di dalam kartu untuk melihat semua baris. Filter kolom via panah kecil di header."
                        />
                    </div>
                </div>
            </div>

            {manageModalOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onClick={closeManageModal}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="manage-db-title"
                        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <div>
                                <h2
                                    id="manage-db-title"
                                    className="text-base font-semibold text-foreground"
                                >
                                    Kelola Jenis Database
                                </h2>
                                <p className="text-xs text-secondary">
                                    Tambah database baru atau hapus yang ditambahkan lewat UI.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeManageModal}
                                disabled={creating || Boolean(deletingKind)}
                                className="rounded-lg p-1.5 text-secondary hover:bg-muted hover:text-foreground disabled:opacity-50"
                                aria-label="Tutup"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto px-5 py-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="flex flex-col gap-3">
                                    <label className="block text-xs font-semibold text-foreground">
                                        Judul
                                        <input
                                            type="text"
                                            value={newLabel}
                                            onChange={(e) => setNewLabel(e.target.value)}
                                            placeholder="Contoh: Uji Coba Demo"
                                            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                        />
                                    </label>
                                    <label className="block text-xs font-semibold text-foreground">
                                        Deskripsi (opsional)
                                        <input
                                            type="text"
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            placeholder="Keterangan singkat"
                                            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                        />
                                    </label>
                                    <label className="block text-xs font-semibold text-foreground">
                                        Warna kartu
                                        <select
                                            value={newColor}
                                            onChange={(e) =>
                                                setNewColor(e.target.value as MasterDataColorClass)
                                            }
                                            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                        >
                                            {COLOR_OPTIONS.map((c) => (
                                                <option key={c} value={c}>
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="block text-xs font-semibold text-foreground">
                                        Header kolom (satu per baris, atau dipisah koma)
                                        <textarea
                                            value={newColumns}
                                            onChange={(e) => setNewColumns(e.target.value)}
                                            rows={5}
                                            placeholder={"Kolom A\nKolom B\nKolom C"}
                                            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 font-mono text-sm outline-none focus:border-blue-400"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => void handleCreateKind()}
                                        disabled={creating}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-70"
                                    >
                                        {creating ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Plus className="h-4 w-4" />
                                        )}
                                        Tambah Database
                                    </button>
                                </div>

                                <div>
                                    <p className="mb-2 text-xs font-semibold text-foreground">
                                        Database custom
                                    </p>
                                    {customKinds.length === 0 ? (
                                        <p className="rounded-xl border border-dashed border-border bg-gray-50 px-3 py-6 text-center text-sm text-secondary">
                                            Belum ada database tambahan. Isi form di kiri untuk
                                            menambah.
                                        </p>
                                    ) : (
                                        <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                                            {customKinds.map((k) => (
                                                <li
                                                    key={k.kind}
                                                    className="flex items-start justify-between gap-3 rounded-xl border border-border bg-gray-50 px-3 py-2.5"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-foreground">
                                                            {k.label}
                                                        </p>
                                                        <p className="truncate text-[11px] text-secondary">
                                                            {k.kind} · {k.columns.length} kolom
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleDeleteKind(k)}
                                                        disabled={deletingKind === k.kind}
                                                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                                                    >
                                                        {deletingKind === k.kind ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        )}
                                                        Hapus
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <p className="mt-3 text-[11px] text-secondary">
                                        Database bawaan (Coding Nasional, dll.) tidak bisa dihapus
                                        dari UI.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </DashboardLayout>
    );
}
