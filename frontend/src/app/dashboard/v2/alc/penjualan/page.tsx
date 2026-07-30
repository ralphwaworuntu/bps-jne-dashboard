"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ChevronDown, FileSpreadsheet, Upload, X } from "lucide-react";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import {
    loadCabangAgenRecords,
    type CabangAgenEntityType,
    type CabangAgenRecord,
} from "@/components/dashboard/v2/alc/cabangAgenStorage";
import {
    fetchPenjualan,
    listPenjualanUploads,
    uploadPenjualan,
    type PenjualanKind,
    type PenjualanMatchStats,
    type PenjualanRow,
    type PenjualanUpload,
} from "@/lib/alcApi";

type FilterTipe = CabangAgenEntityType;

const UPLOAD_META: Record<
    PenjualanKind,
    { title: string; description: string; fileTypes: string }
> = {
    SCO: {
        title: "Upload Data SCO",
        description:
            "Unggah file data penjualan dari SCO untuk seluruh cabang/agen under JNE KOE.",
        fileTypes: "Excel (.xlsx, .xls) atau CSV (.csv)",
    },
    APEX: {
        title: "Upload Data APEX",
        description:
            "Unggah file data penjualan dari APEX untuk seluruh cabang/agen under JNE KOE.",
        fileTypes: "Excel (.xlsx, .xls) atau CSV (.csv)",
    },
};

const ACCEPT =
    ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

const BULAN_OPTIONS = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" },
] as const;

const DEFAULT_COLUMNS = [
    "AWB",
    "ID_ACCOUNT",
    "NAMA DEBITUR",
    "CNOTE USER NAME",
    "TGL_ENTRY",
    "ORIGIN",
    "CABANG",
    "DEST",
    "SERVICE",
    "PAYMENT_TYPE",
    "QTY",
    "WEIGHT",
    "INSURANCE",
    "AMOUNT",
    "KOMISI",
];

const PAGE_LIMIT = 50;

function currentPeriod() {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function yearOptions() {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear + 1; y >= currentYear - 5; y -= 1) years.push(y);
    return years;
}

function bulanLabel(month: number) {
    return BULAN_OPTIONS.find((b) => b.value === month)?.label ?? String(month);
}

function isAllowedFile(file: File) {
    const name = file.name.toLowerCase();
    return name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv");
}

export default function PenjualanPage() {
    const initialPeriod = currentPeriod();
    const [entities, setEntities] = useState<CabangAgenRecord[]>([]);
    const [filterTipe, setFilterTipe] = useState<FilterTipe>("Cabang");
    const [filterNama, setFilterNama] = useState("");

    const [uploadKind, setUploadKind] = useState<PenjualanKind | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadMonth, setUploadMonth] = useState(initialPeriod.month);
    const [uploadYear, setUploadYear] = useState(initialPeriod.year);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploads, setUploads] = useState<PenjualanUpload[]>([]);

    const [rows, setRows] = useState<PenjualanRow[]>([]);
    const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(0);
    const [loadingRows, setLoadingRows] = useState(false);
    const [tableError, setTableError] = useState<string | null>(null);
    const [dataVersion, setDataVersion] = useState(0);
    const [matchStats, setMatchStats] = useState<PenjualanMatchStats | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const refreshUploads = useCallback(async () => {
        try {
            setUploads(await listPenjualanUploads());
        } catch {
            setUploads([]);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setEntities(loadCabangAgenRecords());
            void refreshUploads();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [refreshUploads]);

    const optionsForTipe = useMemo(
        () =>
            entities
                .filter((e) => e.tipe === filterTipe)
                .sort((a, b) => a.nama.localeCompare(b.nama, "id", { sensitivity: "base" })),
        [entities, filterTipe]
    );

    const selectedEntity = useMemo(
        () => optionsForTipe.find((e) => e.nama === filterNama) ?? null,
        [optionsForTipe, filterNama]
    );

    const hasFilter = Boolean(selectedEntity);

    const latestByKind = useMemo(() => {
        const result: Partial<Record<PenjualanKind, PenjualanUpload>> = {};
        for (const item of uploads) {
            const prev = result[item.kind];
            if (!prev || prev.created_at < item.created_at) result[item.kind] = item;
        }
        return result;
    }, [uploads]);

    useEffect(() => {
        if (!selectedEntity) {
            setRows([]);
            setTotal(0);
            setPages(0);
            setTableError(null);
            setMatchStats(null);
            return;
        }

        // Fase awal: olah by Cabang dulu.
        if (selectedEntity.tipe !== "Cabang") {
            setRows([]);
            setTotal(0);
            setPages(0);
            setMatchStats(null);
            setTableError(null);
            setLoadingRows(false);
            return;
        }

        let cancelled = false;
        setLoadingRows(true);
        setTableError(null);

        fetchPenjualan({
            nama: selectedEntity.nama,
            tipe: "Cabang",
            page,
            limit: PAGE_LIMIT,
        })
            .then((res) => {
                if (cancelled) return;
                setRows(res.items);
                setColumns(res.columns?.length ? res.columns : DEFAULT_COLUMNS);
                setTotal(res.total);
                setPages(res.pages);
                setMatchStats(res.match ?? null);
            })
            .catch((e: unknown) => {
                if (cancelled) return;
                setRows([]);
                setTotal(0);
                setPages(0);
                setMatchStats(null);
                setTableError(e instanceof Error ? e.message : "Gagal memuat data penjualan.");
            })
            .finally(() => {
                if (!cancelled) setLoadingRows(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedEntity, page, dataVersion]);

    const onChangeFilterTipe = (tipe: FilterTipe) => {
        setFilterTipe(tipe);
        setFilterNama("");
        setPage(1);
    };

    const openUploadModal = (kind: PenjualanKind) => {
        const period = currentPeriod();
        setUploadKind(kind);
        setSelectedFile(null);
        setUploadMonth(period.month);
        setUploadYear(period.year);
        setError(null);
        setIsDragging(false);
    };

    const closeUploadModal = () => {
        if (submitting) return;
        setUploadKind(null);
        setSelectedFile(null);
        setError(null);
        setIsDragging(false);
    };

    const pickFile = (file: File | null) => {
        if (!file) return;
        if (!isAllowedFile(file)) {
            setSelectedFile(null);
            setError("Jenis file tidak didukung. Gunakan Excel (.xlsx / .xls) atau CSV (.csv).");
            return;
        }
        setSelectedFile(file);
        setError(null);
    };

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        pickFile(e.dataTransfer.files?.[0] ?? null);
    };

    const handleSubmit = async () => {
        if (!uploadKind) return;
        if (!selectedFile) {
            setError("Pilih file terlebih dahulu.");
            return;
        }
        if (!uploadMonth || !uploadYear) {
            setError("Pilih bulan dan tahun periode data.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const res = await uploadPenjualan({
                kind: uploadKind,
                file: selectedFile,
                month: uploadMonth,
                year: uploadYear,
            });

            await refreshUploads();
            setPage(1);
            setDataVersion((v) => v + 1);
            setMessage(
                `File ${uploadKind} "${selectedFile.name}" tersimpan untuk periode ${bulanLabel(uploadMonth)} ${uploadYear} (${res.upload.row_count.toLocaleString("id-ID")} baris).`
            );
            setUploadKind(null);
            setSelectedFile(null);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Upload gagal.");
        } finally {
            setSubmitting(false);
        }
    };

    const meta = uploadKind ? UPLOAD_META[uploadKind] : null;

    const emptyMessage = () => {
        if (!hasFilter) return "Pilih Cabang atau Agen terlebih dahulu untuk menampilkan data penjualan.";
        if (selectedEntity?.tipe === "Agen") {
            return "Pengolahan by Agen belum diaktifkan. Saat ini baru tersedia plotting by Cabang.";
        }
        if (loadingRows) return "Memuat data penjualan...";
        if (tableError) return tableError;
        return `Belum ada data penjualan terploting untuk Cabang ${filterNama}. Pastikan AWB di SCO dan APEX cocok, lalu CNOTE USER NAME / CABANG sesuai nama cabang.`;
    };

    return (
        <>
            <DashboardLayout>
                <div className="flex flex-col gap-6 p-6 lg:p-10">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Penjualan</h1>
                        <p className="mt-2 text-sm text-secondary">
                            Upload data SCO/APEX, lalu pilih Cabang atau Agen untuk menampilkan data.
                        </p>
                    </div>

                    <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-sm">
                        <p className="text-sm font-semibold text-foreground">Upload Data Penjualan</p>
                        <p className="mt-1 text-xs text-secondary">
                            Unggah data SCO atau APEX untuk mengisi tabel penjualan cabang/agen under JNE KOE.
                        </p>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => openUploadModal("SCO")}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                            >
                                <Upload className="size-4" aria-hidden />
                                Upload Data SCO
                            </button>
                            <button
                                type="button"
                                onClick={() => openUploadModal("APEX")}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                            >
                                <Upload className="size-4" aria-hidden />
                                Upload Data APEX
                            </button>
                        </div>

                        {(latestByKind.SCO || latestByKind.APEX) && (
                            <div className="mt-3 space-y-1 text-xs text-secondary">
                                {latestByKind.SCO ? (
                                    <p>
                                        SCO terakhir: {latestByKind.SCO.original_filename} (
                                        {bulanLabel(latestByKind.SCO.month)} {latestByKind.SCO.year} ·{" "}
                                        {latestByKind.SCO.row_count.toLocaleString("id-ID")} baris)
                                    </p>
                                ) : null}
                                {latestByKind.APEX ? (
                                    <p>
                                        APEX terakhir: {latestByKind.APEX.original_filename} (
                                        {bulanLabel(latestByKind.APEX.month)} {latestByKind.APEX.year} ·{" "}
                                        {latestByKind.APEX.row_count.toLocaleString("id-ID")} baris)
                                    </p>
                                ) : null}
                            </div>
                        )}
                    </div>

                    <div className="rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm">
                        <p className="text-sm font-semibold text-foreground">Filter By :</p>
                        <p className="mt-1 text-xs text-secondary">
                            Pilih Cabang atau Agen terlebih dahulu sebelum data penjualan ditampilkan.
                        </p>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <fieldset className="flex flex-col gap-2">
                                <legend className="sr-only">Filter By</legend>
                                <div className="flex flex-wrap gap-4">
                                    {(["Cabang", "Agen"] as const).map((tipe) => (
                                        <label
                                            key={tipe}
                                            className="inline-flex cursor-pointer items-center gap-2 text-sm"
                                        >
                                            <input
                                                type="radio"
                                                name="filterTipe"
                                                value={tipe}
                                                checked={filterTipe === tipe}
                                                onChange={() => onChangeFilterTipe(tipe)}
                                                className="size-4 accent-primary"
                                            />
                                            <span className="font-medium text-foreground">By {tipe}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="filter-nama" className="text-sm font-semibold text-foreground">
                                    Pilih {filterTipe}
                                </label>
                                <div className="relative">
                                    <select
                                        id="filter-nama"
                                        value={filterNama}
                                        onChange={(e) => {
                                            setFilterNama(e.target.value);
                                            setPage(1);
                                        }}
                                        className="w-full appearance-none rounded-xl border border-border bg-white px-4 py-3 pr-10 text-sm font-medium text-foreground"
                                        disabled={optionsForTipe.length === 0}
                                    >
                                        <option value="">Pilih {filterTipe}</option>
                                        {optionsForTipe.length === 0 ? (
                                            <option value="" disabled>
                                                Belum ada data {filterTipe}
                                            </option>
                                        ) : (
                                            optionsForTipe.map((opt) => (
                                                <option key={opt.id} value={opt.nama}>
                                                    {opt.nama}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
                                </div>
                            </div>
                        </div>

                        {optionsForTipe.length === 0 ? (
                            <p className="mt-3 text-sm text-amber-700">
                                Belum ada data {filterTipe} di Data Cabang/Agen. Tambahkan dulu di menu Data
                                Cabang/Agen.
                            </p>
                        ) : null}
                    </div>

                    {message ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {message}
                        </div>
                    ) : null}

                    <div className="rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm">
                        {hasFilter && matchStats ? (
                            <div
                                className={`mb-3 rounded-xl border px-4 py-3 text-sm ${
                                    matchStats.awb_content_equal
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : "border-amber-200 bg-amber-50 text-amber-900"
                                }`}
                            >
                                <p className="font-semibold">Pencocokan AWB (SCO ↔ APEX)</p>
                                <p className="mt-1">
                                    SCO: {matchStats.sco_awb_count.toLocaleString("id-ID")} AWB · APEX:{" "}
                                    {matchStats.apex_awb_count.toLocaleString("id-ID")} AWB · Cocok:{" "}
                                    {matchStats.matched_awb_count.toLocaleString("id-ID")} · Hanya SCO:{" "}
                                    {matchStats.only_sco_count.toLocaleString("id-ID")} · Hanya APEX:{" "}
                                    {matchStats.only_apex_count.toLocaleString("id-ID")}
                                </p>
                                {!matchStats.awb_content_equal ? (
                                    <p className="mt-1">
                                        Jumlah/isi AWB belum sama. Tabel hanya menampilkan AWB yang cocok di
                                        kedua file (VLOOKUP).
                                    </p>
                                ) : (
                                    <p className="mt-1">AWB di kedua file sudah sama secara jumlah dan isi.</p>
                                )}
                            </div>
                        ) : null}

                        {hasFilter && total > 0 ? (
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-secondary">
                                <span>
                                    {total.toLocaleString("id-ID")} baris · {filterTipe} {filterNama}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page <= 1 || loadingRows}
                                        className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                                    >
                                        Sebelumnya
                                    </button>
                                    <span>
                                        Hal. {page} / {Math.max(pages, 1)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setPage((p) => (pages ? Math.min(pages, p + 1) : p))}
                                        disabled={page >= pages || loadingRows}
                                        className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                                    >
                                        Berikutnya
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div className="overflow-x-auto">
                            <table className="w-max min-w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="bg-white text-black">
                                        {columns.map((col) => (
                                            <th
                                                key={col}
                                                className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold"
                                            >
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={columns.length}
                                                className={`border border-black/20 px-4 py-10 text-center ${
                                                    tableError ? "text-red-600" : "text-secondary"
                                                }`}
                                            >
                                                {emptyMessage()}
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, idx) => (
                                            <tr key={idx} className="odd:bg-white even:bg-muted/20">
                                                {columns.map((col) => (
                                                    <td
                                                        key={col}
                                                        className="whitespace-nowrap border border-black/20 px-3 py-2 text-foreground"
                                                    >
                                                        {row[col] ?? ""}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </DashboardLayout>

            {uploadKind && meta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="penjualan-upload-title"
                        className="w-full max-w-lg rounded-[var(--radius-card)] border border-border bg-white shadow-lg"
                    >
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <h2
                                id="penjualan-upload-title"
                                className="flex items-center gap-2 text-base font-semibold text-foreground"
                            >
                                <FileSpreadsheet className="size-5 text-primary" aria-hidden />
                                {meta.title}
                            </h2>
                            <button
                                type="button"
                                onClick={closeUploadModal}
                                disabled={submitting}
                                className="rounded-lg p-1.5 text-secondary transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                                aria-label="Tutup"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-4 px-5 py-4">
                            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                                <p className="text-sm font-semibold text-foreground">Keterangan file</p>
                                <p className="mt-1 text-sm text-secondary">{meta.description}</p>
                                <p className="mt-2 text-sm text-foreground">
                                    <span className="font-semibold">Jenis file:</span> {meta.fileTypes}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-sm font-semibold text-foreground">Bulan</span>
                                    <select
                                        value={uploadMonth}
                                        onChange={(e) => setUploadMonth(Number(e.target.value))}
                                        className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                                    >
                                        {BULAN_OPTIONS.map((b) => (
                                            <option key={b.value} value={b.value}>
                                                {b.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-sm font-semibold text-foreground">Tahun</span>
                                    <select
                                        value={uploadYear}
                                        onChange={(e) => setUploadYear(Number(e.target.value))}
                                        className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                                    >
                                        {yearOptions().map((y) => (
                                            <option key={y} value={y}>
                                                {y}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <p className="text-xs text-secondary">
                                Data akan dikelompokkan berdasarkan periode bulan/tahun yang dipilih, meskipun
                                nama file berbeda. Upload baru pada periode yang sama akan menggantikan data
                                sebelumnya (file lama diarsipkan di server).
                            </p>

                            <div
                                onDragEnter={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                }}
                                onDrop={onDrop}
                                className={`rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
                                    isDragging
                                        ? "border-primary bg-primary/5"
                                        : "border-border bg-muted/20"
                                }`}
                            >
                                <Upload className="mx-auto size-8 text-secondary" aria-hidden />
                                <p className="mt-3 text-sm font-medium text-foreground">
                                    Drag &amp; drop file di sini
                                </p>
                                <p className="mt-1 text-xs text-secondary">atau</p>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="mt-3 inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                                >
                                    Browse File
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={ACCEPT}
                                    className="hidden"
                                    onChange={(e) => {
                                        pickFile(e.target.files?.[0] ?? null);
                                        e.target.value = "";
                                    }}
                                />
                                {selectedFile ? (
                                    <p className="mt-3 break-all text-sm font-medium text-foreground">
                                        {selectedFile.name}
                                    </p>
                                ) : (
                                    <p className="mt-3 text-xs text-secondary">Belum ada file dipilih.</p>
                                )}
                            </div>

                            {error ? <p className="text-sm text-red-600">{error}</p> : null}

                            <div className="flex justify-end gap-2 border-t border-border pt-4">
                                <button
                                    type="button"
                                    onClick={closeUploadModal}
                                    disabled={submitting}
                                    className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-secondary transition hover:bg-muted disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitting || !selectedFile}
                                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Upload className="size-4" aria-hidden />
                                    {submitting ? "Mengunggah..." : "Submit"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
