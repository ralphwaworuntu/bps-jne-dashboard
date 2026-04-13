"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
    Upload,
    FileSpreadsheet,
    Receipt,
    Landmark,
    Loader2,
    CheckCircle2,
    Download,
    ChevronDown,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import SyncedHorizontalTable from "@/components/dashboard/v2/SyncedHorizontalTable";
import { useToast } from "@/context/ToastContext";
import type { LucideIcon } from "lucide-react";
import {
    parseRekeningKoranBuffer,
    type RekeningKoranRow,
} from "@/lib/parseRekeningKoran";
import {
    downloadFinanceFile,
    fetchMyFinanceFiles,
    formatUploadedLabelFromIso,
    uploadBuktiTransaksiApi,
    uploadRekeningKoranApi,
} from "@/lib/financeApi";
import { parseBuktiTransaksiBuffer, type BuktiSheetParsed } from "@/lib/parseBuktiTransaksi";

/** Excel atau CSV untuk kartu bukti transaksi */
const BUKTI_ALLOWED_PATTERN = /\.(xlsx|xls|xlsm|csv)$/i;

type DataViewTab = "rekening" | "bukti";
type RowLimit = 10 | 25 | 50 | 100 | "all";
type SelectAll = "";

type RekeningSelection =
    | null
    | { kind: "pdf"; name: string; buffer: ArrayBuffer }
    | { kind: "sheet"; name: string; buffer: ArrayBuffer };

type StoredUpload = { name: string; blob: Blob };

function guessMimeType(filename: string): string {
    const l = filename.toLowerCase();
    if (l.endsWith(".pdf")) return "application/pdf";
    if (l.endsWith(".csv")) return "text/csv;charset=utf-8";
    if (l.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (l.endsWith(".xls")) return "application/vnd.ms-excel";
    if (l.endsWith(".xlsm")) return "application/vnd.ms-excel.sheet.macroEnabled.12";
    return "application/octet-stream";
}

function blobFromBuffer(buffer: ArrayBuffer, filename: string): Blob {
    return new Blob([buffer], { type: guessMimeType(filename) });
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function friendlyReadError(err: unknown): string {
    if (err instanceof DOMException && err.name === "NotReadableError") {
        return "File tidak bisa dibaca. Tutup file di Excel jika sedang dibuka, pastikan file tersimpan di folder lokal (bukan hanya cloud/OneDrive yang belum tersinkron), lalu pilih ulang.";
    }
    if (err instanceof Error && /could not be read|not be read/i.test(err.message)) {
        return "File tidak bisa dibaca. Coba tutup aplikasi yang memakai file ini, lalu pilih ulang.";
    }
    return err instanceof Error ? err.message : "Gagal membaca file.";
}

function FinanceUploadCard({
    title,
    description,
    icon: Icon,
    accent,
    file,
    pendingLabel,
    isPreparing,
    activeUploadedName,
    activeUploadedAtLabel,
    onFileChange,
    uploading,
    onUpload,
    onDownload,
    accept,
}: {
    title: string;
    description: string;
    icon: LucideIcon;
    accent: "blue" | "emerald";
    /** File mentah (mis. bukti) */
    file?: File | null;
    /** Nama file siap proses tanpa objek File (mis. buffer sudah dibaca) */
    pendingLabel?: string | null;
    /** Sedang membaca file ke memori */
    isPreparing?: boolean;
    activeUploadedName: string | null;
    activeUploadedAtLabel: string | null;
    onFileChange: (f: File | null) => void;
    uploading: boolean;
    onUpload: () => void;
    /** Unduh salinan file yang sudah berhasil diunggah */
    onDownload?: () => void;
    accept: string;
}) {
    const ring =
        accent === "blue"
            ? "ring-primary/20 hover:ring-primary/40"
            : "ring-emerald-500/20 hover:ring-emerald-500/40";

    const activeTone =
        accent === "blue"
            ? "border-primary/25 bg-primary/5"
            : "border-emerald-500/25 bg-emerald-500/5";

    const displayName = pendingLabel ?? file?.name ?? null;
    const canUpload = !!(pendingLabel || file) && !isPreparing;

    return (
        <div
            className={`rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-sm ring-1 transition-all ${ring}`}
        >
            <div className="flex items-start gap-4">
                <div
                    className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
                        accent === "blue" ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600"
                    }`}
                >
                    <Icon className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                    <p className="mt-1 text-sm text-secondary">{description}</p>
                </div>
            </div>

            {activeUploadedName && (
                <div
                    className={`mt-6 flex gap-3 rounded-2xl border px-4 py-3 ${activeTone}`}
                    role="status"
                >
                    <CheckCircle2
                        className={`mt-0.5 size-5 shrink-0 ${
                            accent === "blue" ? "text-primary" : "text-emerald-600"
                        }`}
                        aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                            File aktif
                        </p>
                        <p
                            className="mt-1 break-all font-medium text-foreground"
                            title={activeUploadedName}
                        >
                            {activeUploadedName}
                        </p>
                        {activeUploadedAtLabel && (
                            <p className="mt-1 text-xs text-secondary">
                                Berhasil diunggah · {activeUploadedAtLabel}
                            </p>
                        )}
                    </div>
                    {onDownload && (
                        <button
                            type="button"
                            onClick={onDownload}
                            className={`flex shrink-0 items-center gap-2 self-center rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                accent === "blue"
                                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                                    : "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15"
                            }`}
                        >
                            <Download className="size-4 shrink-0" aria-hidden />
                            Unduh
                        </button>
                    )}
                </div>
            )}

            <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/50 px-4 py-8 transition-colors hover:bg-muted">
                {isPreparing ? (
                    <Loader2 className="mb-2 size-8 animate-spin text-primary" />
                ) : (
                    <Upload className="mb-2 size-8 text-secondary" />
                )}
                <span className="text-center text-sm font-medium text-foreground">
                    {isPreparing
                        ? "Membaca file…"
                        : displayName
                          ? displayName
                          : activeUploadedName
                            ? "Pilih file baru untuk mengganti"
                            : "Klik atau seret file ke sini"}
                </span>
                <span className="mt-1 text-xs text-secondary">{accept}</span>
                <input
                    type="file"
                    className="hidden"
                    accept={accept}
                    onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                />
            </label>

            <button
                type="button"
                disabled={!canUpload || uploading}
                onClick={onUpload}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
                {uploading ? (
                    <>
                        <Loader2 className="size-4 animate-spin" />
                        Memproses…
                    </>
                ) : (
                    "Unggah & proses"
                )}
            </button>
        </div>
    );
}

export default function KelolaTransaksiPage() {
    const router = useRouter();
    const { showToast } = useToast();

    const [rekeningSelection, setRekeningSelection] = useState<RekeningSelection>(null);
    const [rekeningReading, setRekeningReading] = useState(false);
    const [rekeningStored, setRekeningStored] = useState<StoredUpload | null>(null);
    const [buktiSelection, setBuktiSelection] = useState<{ name: string; buffer: ArrayBuffer } | null>(
        null
    );
    const [buktiReading, setBuktiReading] = useState(false);
    const [buktiStored, setBuktiStored] = useState<StoredUpload | null>(null);
    const [uploadingRekening, setUploadingRekening] = useState(false);
    const [uploadingBukti, setUploadingBukti] = useState(false);
    const [activeRekeningName, setActiveRekeningName] = useState<string | null>(null);
    const [activeRekeningAt, setActiveRekeningAt] = useState<string | null>(null);
    const [activeBuktiName, setActiveBuktiName] = useState<string | null>(null);
    const [activeBuktiAt, setActiveBuktiAt] = useState<string | null>(null);
    const [rows, setRows] = useState<RekeningKoranRow[]>([]);
    const [dataView, setDataView] = useState<DataViewTab>("rekening");
    const [buktiSheets, setBuktiSheets] = useState<BuktiSheetParsed[]>([]);
    const [selectedBuktiSheet, setSelectedBuktiSheet] = useState<string | null>(null);
    const [rowLimit, setRowLimit] = useState<RowLimit>(25);
    const [rekeningFilters, setRekeningFilters] = useState({
        tanggal: "" as SelectAll | string,
        deskripsiTransaksi: "" as SelectAll | string,
        amount: "" as SelectAll | string,
        type: "" as SelectAll | string,
        catatan: "" as SelectAll | string,
        unknow: "" as SelectAll | string,
        divisiPic: "" as SelectAll | string,
    });
    const [buktiFilters, setBuktiFilters] = useState({
        hari: "" as SelectAll | string,
        tanggal: "" as SelectAll | string,
        bri: "" as SelectAll | string,
        bni: "" as SelectAll | string,
        lainnya: "" as SelectAll | string,
        totalSetoran: "" as SelectAll | string,
    });
    /** ID file di server (untuk unduh / sinkron setelah reload) */
    const [rekeningServerId, setRekeningServerId] = useState<number | null>(null);
    const [buktiServerId, setBuktiServerId] = useState<number | null>(null);

    const formatUploadedAt = () => {
        const d = new Date();
        return (
            d.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
            }) +
            " · " +
            d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        );
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) router.push("/");
    }, [router]);

    useEffect(() => {
        if (buktiSheets.length === 0) {
            setSelectedBuktiSheet(null);
            return;
        }
        if (selectedBuktiSheet && buktiSheets.some((s) => s.sheetName === selectedBuktiSheet)) {
            return;
        }
        setSelectedBuktiSheet(buktiSheets[0].sheetName);
    }, [buktiSheets, selectedBuktiSheet]);

    useEffect(() => {
        let cancelled = false;
        const token = localStorage.getItem("token");
        if (!token) {
            return;
        }
        (async () => {
            try {
                const meta = await fetchMyFinanceFiles(token);
                if (cancelled) return;

                if (meta.rekening_koran) {
                    const m = meta.rekening_koran;
                    setRekeningServerId(m.id);
                    setActiveRekeningName(m.original_filename);
                    setActiveRekeningAt(formatUploadedLabelFromIso(m.created_at));
                    try {
                        const blob = await downloadFinanceFile(token, m.id);
                        setRekeningStored({ name: m.original_filename, blob });
                        const lower = m.original_filename.toLowerCase();
                        if (!lower.endsWith(".pdf")) {
                            const buf = await blob.arrayBuffer();
                            const { rows: parsed } = parseRekeningKoranBuffer(buf, m.original_filename);
                            if (parsed.length > 0) {
                                setRows(
                                    parsed.map((r, i) => ({
                                        ...r,
                                        id: `srv-rk-${m.id}-${i}`,
                                    }))
                                );
                            }
                        }
                    } catch {
                        /* file hilang di server atau error jaringan */
                    }
                }

                if (meta.bukti_transaksi) {
                    const m = meta.bukti_transaksi;
                    setBuktiServerId(m.id);
                    setActiveBuktiName(m.original_filename);
                    setActiveBuktiAt(formatUploadedLabelFromIso(m.created_at));
                    try {
                        const blob = await downloadFinanceFile(token, m.id);
                        setBuktiStored({ name: m.original_filename, blob });
                        const buf = await blob.arrayBuffer();
                        try {
                            const sheets = parseBuktiTransaksiBuffer(buf, m.original_filename);
                            setBuktiSheets(sheets);
                        } catch {
                            setBuktiSheets([]);
                        }
                    } catch {
                        /* ignore */
                    }
                }
            } catch {
                /* backend tidak jalan atau 401 */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const onRekeningFileChange = async (f: File | null) => {
        if (!f) {
            setRekeningSelection(null);
            return;
        }
        const lower = f.name.toLowerCase();

        setRekeningReading(true);
        try {
            const buffer = await f.arrayBuffer();
            if (lower.endsWith(".pdf")) {
                setRekeningSelection({ kind: "pdf", name: f.name, buffer });
                return;
            }
            setRekeningSelection({ kind: "sheet", name: f.name, buffer });
        } catch (err) {
            showToast(friendlyReadError(err), "error");
            setRekeningSelection(null);
        } finally {
            setRekeningReading(false);
        }
    };

    const uploadRekeningBufferToServer = async (buffer: ArrayBuffer, filename: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const blob = blobFromBuffer(buffer, filename);
            const data = await uploadRekeningKoranApi(token, blob, filename);
            setRekeningServerId(data.id);
        } catch (e) {
            showToast(
                `Gagal menyimpan rekening koran ke server: ${e instanceof Error ? e.message : "error"}`,
                "error"
            );
        }
    };

    const handleUploadRekening = async () => {
        if (!rekeningSelection) return;

        setUploadingRekening(true);
        try {
            const storeCopy = () => {
                const blob = blobFromBuffer(rekeningSelection.buffer, rekeningSelection.name);
                setRekeningStored({ name: rekeningSelection.name, blob });
            };

            if (rekeningSelection.kind === "pdf") {
                await new Promise((r) => setTimeout(r, 400));
                storeCopy();
                setActiveRekeningName(rekeningSelection.name);
                setActiveRekeningAt(formatUploadedAt());
                await uploadRekeningBufferToServer(
                    rekeningSelection.buffer,
                    rekeningSelection.name
                );
                showToast(
                    "File PDF diproses. Unggah Excel atau CSV dengan header kolom rekening koran untuk mengisi tabel.",
                    "info"
                );
                setRekeningSelection(null);
                return;
            }

            const { rows: parsed, matchedHeaders } = parseRekeningKoranBuffer(
                rekeningSelection.buffer,
                rekeningSelection.name
            );

            storeCopy();

            if (parsed.length === 0) {
                showToast("Tidak ada baris data yang bisa ditampilkan.", "error");
                setRows([]);
                setActiveRekeningName(rekeningSelection.name);
                setActiveRekeningAt(formatUploadedAt());
                await uploadRekeningBufferToServer(
                    rekeningSelection.buffer,
                    rekeningSelection.name
                );
                setRekeningSelection(null);
                return;
            }

            const withIds: RekeningKoranRow[] = parsed.map((r, i) => ({
                ...r,
                id: `rk-${Date.now()}-${i}`,
            }));
            setRows(withIds);
            setActiveRekeningName(rekeningSelection.name);
            setActiveRekeningAt(formatUploadedAt());
            await uploadRekeningBufferToServer(
                rekeningSelection.buffer,
                rekeningSelection.name
            );
            showToast(
                `${parsed.length} baris dimuat (${matchedHeaders} kolom dikenali). Disimpan di server.`,
                "success"
            );
            setRekeningSelection(null);
        } catch (e) {
            showToast(friendlyReadError(e), "error");
        } finally {
            setUploadingRekening(false);
        }
    };

    const onBuktiFileChange = async (f: File | null) => {
        if (!f) {
            setBuktiSelection(null);
            return;
        }
        if (!BUKTI_ALLOWED_PATTERN.test(f.name)) {
            showToast(
                "Bukti transaksi hanya boleh berupa Excel (.xlsx, .xls, .xlsm) atau CSV (.csv).",
                "error"
            );
            return;
        }
        setBuktiReading(true);
        try {
            const buffer = await f.arrayBuffer();
            setBuktiSelection({ name: f.name, buffer });
        } catch (err) {
            showToast(friendlyReadError(err), "error");
            setBuktiSelection(null);
        } finally {
            setBuktiReading(false);
        }
    };

    const handleUploadBukti = async () => {
        if (!buktiSelection) return;
        if (!BUKTI_ALLOWED_PATTERN.test(buktiSelection.name)) {
            showToast(
                "Bukti transaksi hanya boleh berupa Excel (.xlsx, .xls, .xlsm) atau CSV (.csv).",
                "error"
            );
            return;
        }
        const { name, buffer } = buktiSelection;
        setUploadingBukti(true);
        await new Promise((r) => setTimeout(r, 400));
        const blob = blobFromBuffer(buffer, name);
        setBuktiStored({ name, blob });
        setActiveBuktiName(name);
        setActiveBuktiAt(formatUploadedAt());
        const token = localStorage.getItem("token");
        try {
            const sheets = parseBuktiTransaksiBuffer(buffer, name);
            setBuktiSheets(sheets);
            if (sheets.some((s) => s.rows.length > 0 || s.f1TotalSetoranBank)) {
                setDataView("bukti");
            }
        } catch (e) {
            setBuktiSheets([]);
            showToast(
                `Gagal membaca isi bukti (sheet): ${e instanceof Error ? e.message : "error"}`,
                "error"
            );
        }

        if (token) {
            try {
                const data = await uploadBuktiTransaksiApi(token, blob, name);
                setBuktiServerId(data.id);
                showToast(
                    "Bukti transaksi tersimpan di server. Buka tab Bukti transaksi untuk melihat semua sheet.",
                    "success"
                );
            } catch (e) {
                showToast(
                    `Gagal simpan bukti ke server: ${e instanceof Error ? e.message : "error"}`,
                    "error"
                );
            }
        } else {
            showToast("Tidak ada token — bukti hanya di perangkat ini.", "error");
        }
        setUploadingBukti(false);
        setBuktiSelection(null);
    };

    const handleDownloadRekening = async () => {
        const token = localStorage.getItem("token");
        if (rekeningServerId && token) {
            try {
                const blob = await downloadFinanceFile(token, rekeningServerId);
                downloadBlob(blob, activeRekeningName || "rekening-koran");
                return;
            } catch {
                showToast("Gagal mengunduh dari server. Coba lagi.", "error");
            }
        }
        if (rekeningStored) downloadBlob(rekeningStored.blob, rekeningStored.name);
    };

    const handleDownloadBukti = async () => {
        const token = localStorage.getItem("token");
        if (buktiServerId && token) {
            try {
                const blob = await downloadFinanceFile(token, buktiServerId);
                downloadBlob(blob, activeBuktiName || "bukti-transaksi");
                return;
            } catch {
                showToast("Gagal mengunduh dari server. Coba lagi.", "error");
            }
        }
        if (buktiStored) downloadBlob(buktiStored.blob, buktiStored.name);
    };

    const loadDemoRows = () => {
        setRows([
            {
                id: "demo-1",
                tanggal: "28/03/2026",
                deskripsiTransaksi: "Transfer masuk PT Contoh",
                amount: "15.000.000",
                type: "CR",
                catatan: "Operasional",
                unknow: "—",
                divisiPic: "Finance / A",
            },
            {
                id: "demo-2",
                tanggal: "27/03/2026",
                deskripsiTransaksi: "Biaya administrasi",
                amount: "6.500",
                type: "DB",
                catatan: "Bank",
                unknow: "—",
                divisiPic: "Finance / B",
            },
        ]);
        showToast("Data contoh dimuat (struktur rekening koran).", "info");
    };

    const HeaderFilter = ({
        value,
        onChange,
        options,
        ariaLabel,
        title,
    }: {
        value: string;
        onChange: (v: string) => void;
        options: string[];
        ariaLabel: string;
        title?: string;
    }) => {
        return (
            <span className="relative inline-flex items-center">
                {/* Native select (aksesibel) tapi dibuat transparan; yang terlihat hanya ikon panah */}
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    aria-label={ariaLabel}
                    title={title}
                    className="absolute inset-0 z-10 h-6 w-6 cursor-pointer opacity-0"
                >
                    <option value="">Semua</option>
                    {options.map((v) => (
                        <option key={v} value={v}>
                            {v}
                        </option>
                    ))}
                </select>
                <ChevronDown className="size-4 text-secondary" aria-hidden />
                {value !== "" && (
                    <span
                        className="ml-1 inline-flex h-2 w-2 rounded-full bg-primary"
                        title="Filter aktif"
                        aria-hidden
                    />
                )}
            </span>
        );
    };

    const matchesSelect = (value: string, selected: string) => (selected === "" ? true : value === selected);

    const uniqueOptions = (values: string[], max = 250): string[] => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const v of values) {
            const s = (v ?? "").toString().trim();
            if (!s) continue;
            if (seen.has(s)) continue;
            seen.add(s);
            out.push(s);
            if (out.length >= max) break;
        }
        return out.sort((a, b) => a.localeCompare(b, "id-ID", { numeric: true, sensitivity: "base" }));
    };

    const rekeningOptions = useMemo(() => {
        return {
            tanggal: uniqueOptions(rows.map((r) => r.tanggal ?? "")),
            deskripsiTransaksi: uniqueOptions(rows.map((r) => r.deskripsiTransaksi ?? "")),
            amount: uniqueOptions(rows.map((r) => r.amount ?? "")),
            type: uniqueOptions(rows.map((r) => r.type ?? "")),
            catatan: uniqueOptions(rows.map((r) => r.catatan ?? "")),
            unknow: uniqueOptions(rows.map((r) => r.unknow ?? "")),
            divisiPic: uniqueOptions(rows.map((r) => r.divisiPic ?? "")),
        };
    }, [rows]);

    const activeBuktiSheet =
        selectedBuktiSheet ? buktiSheets.find((s) => s.sheetName === selectedBuktiSheet) ?? null : null;

    const buktiOptions = useMemo(() => {
        const base = activeBuktiSheet?.rows ?? [];
        return {
            hari: uniqueOptions(base.map((r) => r.hari ?? "")),
            tanggal: uniqueOptions(base.map((r) => r.tanggal ?? "")),
            bri: uniqueOptions(base.map((r) => r.bri ?? "")),
            bni: uniqueOptions(base.map((r) => r.bni ?? "")),
            lainnya: uniqueOptions(base.map((r) => r.lainnya ?? "")),
            totalSetoran: uniqueOptions(base.map((r) => r.totalSetoran ?? "")),
        };
    }, [activeBuktiSheet]);

    const filteredRekeningRows = rows.filter((r) => {
        return (
            matchesSelect(r.tanggal ?? "", rekeningFilters.tanggal) &&
            matchesSelect(r.deskripsiTransaksi ?? "", rekeningFilters.deskripsiTransaksi) &&
            matchesSelect(r.amount ?? "", rekeningFilters.amount) &&
            matchesSelect(r.type ?? "", rekeningFilters.type) &&
            matchesSelect(r.catatan ?? "", rekeningFilters.catatan) &&
            matchesSelect(r.unknow ?? "", rekeningFilters.unknow) &&
            matchesSelect(r.divisiPic ?? "", rekeningFilters.divisiPic)
        );
    });

    const displayedRekeningRows =
        rowLimit === "all" ? filteredRekeningRows : filteredRekeningRows.slice(0, rowLimit);

    const filteredBuktiRows = !activeBuktiSheet
        ? []
        : activeBuktiSheet.rows.filter((r) => {
              return (
                  matchesSelect(r.hari ?? "", buktiFilters.hari) &&
                  matchesSelect(r.tanggal ?? "", buktiFilters.tanggal) &&
                  matchesSelect(r.bri ?? "", buktiFilters.bri) &&
                  matchesSelect(r.bni ?? "", buktiFilters.bni) &&
                  matchesSelect(r.lainnya ?? "", buktiFilters.lainnya) &&
                  matchesSelect(r.totalSetoran ?? "", buktiFilters.totalSetoran)
              );
          });

    const displayedBuktiRows =
        rowLimit === "all" ? filteredBuktiRows : filteredBuktiRows.slice(0, rowLimit);

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8 p-6 lg:p-10">
                <div>
                    <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Kelola Transaksi</h1>
                    <p className="mt-2 text-secondary">
                        Unggah rekening koran (Excel/CSV) untuk mengisi tabel sesuai kolom file. Bukti transaksi
                        dalam bentuk Excel atau CSV. File disimpan di server (folder{" "}
                        <code className="rounded bg-muted px-1 text-xs">uploads/finance</code>) dan dapat diunduh
                        lagi setelah login.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <FinanceUploadCard
                        title="Upload rekening koran"
                        description="Excel/CSV mengisi tabel di bawah. PDF hanya disimpan (tidak di-parse)."
                        icon={Landmark}
                        accent="blue"
                        pendingLabel={rekeningSelection?.name ?? null}
                        isPreparing={rekeningReading}
                        activeUploadedName={activeRekeningName}
                        activeUploadedAtLabel={activeRekeningAt}
                        onFileChange={onRekeningFileChange}
                        uploading={uploadingRekening}
                        onUpload={handleUploadRekening}
                        onDownload={
                            rekeningServerId || rekeningStored
                                ? () => {
                                      void handleDownloadRekening();
                                  }
                                : undefined
                        }
                        accept=".xlsx,.xls,.xlsm,.csv,.pdf"
                    />
                    <FinanceUploadCard
                        title="Upload bukti transaksi"
                        description="Microsoft Excel (.xlsx, .xls, .xlsm) atau file CSV (.csv)."
                        icon={Receipt}
                        accent="emerald"
                        pendingLabel={buktiSelection?.name ?? null}
                        isPreparing={buktiReading}
                        activeUploadedName={activeBuktiName}
                        activeUploadedAtLabel={activeBuktiAt}
                        onFileChange={onBuktiFileChange}
                        uploading={uploadingBukti}
                        onUpload={handleUploadBukti}
                        onDownload={
                            buktiServerId || buktiStored
                                ? () => {
                                      void handleDownloadBukti();
                                  }
                                : undefined
                        }
                        accept=".xlsx,.xls,.xlsm,.csv"
                    />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <FileSpreadsheet className="size-5 text-primary" />
                            <h2 className="text-lg font-semibold text-foreground">Data transaksi</h2>
                        </div>
                        <div
                            className="inline-flex rounded-xl border border-border bg-muted/50 p-1"
                            role="tablist"
                            aria-label="Jenis tabel"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={dataView === "rekening"}
                                onClick={() => setDataView("rekening")}
                                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                    dataView === "rekening"
                                        ? "bg-white text-foreground shadow-sm"
                                        : "text-secondary hover:text-foreground"
                                }`}
                            >
                                Rekening koran
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={dataView === "bukti"}
                                onClick={() => setDataView("bukti")}
                                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                    dataView === "bukti"
                                        ? "bg-white text-foreground shadow-sm"
                                        : "text-secondary hover:text-foreground"
                                }`}
                            >
                                Bukti transaksi
                            </button>
                        </div>
                        <span className="text-sm text-secondary">
                            {dataView === "rekening"
                                ? "(kolom sesuai file rekening koran)"
                                : "(semua sheet file bukti, header dari sel F1)"}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-secondary">
                            <span className="whitespace-nowrap">Tampilkan</span>
                            <select
                                value={rowLimit}
                                onChange={(e) =>
                                    setRowLimit(
                                        (e.target.value === "all" ? "all" : Number(e.target.value)) as RowLimit
                                    )
                                }
                                className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value="all">Semua</option>
                            </select>
                            <span className="whitespace-nowrap">baris</span>
                        </label>

                        {dataView === "rekening" && (
                            <button
                                type="button"
                                onClick={loadDemoRows}
                                className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                            >
                                Isi contoh data
                            </button>
                        )}
                    </div>
                </div>

                {dataView === "rekening" ? (
                    <SyncedHorizontalTable>
                        <table className="w-max min-w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/60 text-secondary">
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold">No</th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                                        <div className="flex items-center gap-2">
                                            <span>Tanggal</span>
                                            <HeaderFilter
                                                value={rekeningFilters.tanggal}
                                                onChange={(v) => setRekeningFilters((p) => ({ ...p, tanggal: v }))}
                                                options={rekeningOptions.tanggal}
                                                ariaLabel="Filter Tanggal"
                                                title="Filter Tanggal"
                                            />
                                        </div>
                                    </th>
                                    <th className="min-w-[260px] whitespace-nowrap px-4 py-3 font-semibold">
                                        <div className="flex items-center gap-2">
                                            <span>Deskripsi Transaksi</span>
                                            <HeaderFilter
                                                value={rekeningFilters.deskripsiTransaksi}
                                                onChange={(v) =>
                                                    setRekeningFilters((p) => ({ ...p, deskripsiTransaksi: v }))
                                                }
                                                options={rekeningOptions.deskripsiTransaksi}
                                                ariaLabel="Filter Deskripsi Transaksi"
                                                title="Filter Deskripsi"
                                            />
                                        </div>
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                                        <div className="flex items-center justify-between gap-2">
                                            <span>Amount</span>
                                            <HeaderFilter
                                                value={rekeningFilters.amount}
                                                onChange={(v) => setRekeningFilters((p) => ({ ...p, amount: v }))}
                                                options={rekeningOptions.amount}
                                                ariaLabel="Filter Amount"
                                                title="Filter Amount"
                                            />
                                        </div>
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                                        <div className="flex items-center gap-2">
                                            <span>Type</span>
                                            <HeaderFilter
                                                value={rekeningFilters.type}
                                                onChange={(v) => setRekeningFilters((p) => ({ ...p, type: v }))}
                                                options={rekeningOptions.type}
                                                ariaLabel="Filter Type"
                                                title="Filter Type"
                                            />
                                        </div>
                                    </th>
                                    <th className="min-w-[200px] whitespace-nowrap px-4 py-3 font-semibold">
                                        <div className="flex items-center gap-2">
                                            <span>Catatan</span>
                                            <HeaderFilter
                                                value={rekeningFilters.catatan}
                                                onChange={(v) => setRekeningFilters((p) => ({ ...p, catatan: v }))}
                                                options={rekeningOptions.catatan}
                                                ariaLabel="Filter Catatan"
                                                title="Filter Catatan"
                                            />
                                        </div>
                                    </th>
                                    <th
                                        className="whitespace-nowrap px-4 py-3 font-semibold"
                                        title="Sesuai kolom di file sumber"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>UNKNOW</span>
                                            <HeaderFilter
                                                value={rekeningFilters.unknow}
                                                onChange={(v) => setRekeningFilters((p) => ({ ...p, unknow: v }))}
                                                options={rekeningOptions.unknow}
                                                ariaLabel="Filter UNKNOW"
                                                title="Filter UNKNOW"
                                            />
                                        </div>
                                    </th>
                                    <th className="min-w-[220px] whitespace-nowrap px-4 py-3 font-semibold">
                                        <div className="flex items-center gap-2">
                                            <span>DIVISI/PIC</span>
                                            <HeaderFilter
                                                value={rekeningFilters.divisiPic}
                                                onChange={(v) => setRekeningFilters((p) => ({ ...p, divisiPic: v }))}
                                                options={rekeningOptions.divisiPic}
                                                ariaLabel="Filter DIVISI/PIC"
                                                title="Filter DIVISI/PIC"
                                            />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                            {rows.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-10 text-center text-secondary"
                                        >
                                            Unggah file rekening koran berformat Excel atau CSV — header kolom harus
                                            mencakup: Tanggal, Deskripsi Transaksi, Amount, Type, Catatan, UNKNOW,
                                            DIVISI/PIC.
                                        </td>
                                    </tr>
                                ) : (
                                displayedRekeningRows.map((row, idx) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-border/80 hover:bg-muted/30"
                                        >
                                            <td className="whitespace-nowrap px-4 py-3 text-secondary">
                                                {idx + 1}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3">{row.tanggal}</td>
                                            <td className="px-4 py-3">{row.deskripsiTransaksi}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                                                {row.amount}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3">{row.type}</td>
                                            <td className="px-4 py-3 text-secondary">{row.catatan}</td>
                                            <td className="whitespace-nowrap px-4 py-3">{row.unknow}</td>
                                            <td className="px-4 py-3">{row.divisiPic}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </SyncedHorizontalTable>
                ) : (
                <div className="flex flex-col gap-4">
                    {buktiSheets.length === 0 ? (
                        <div className="rounded-[var(--radius-card)] border border-border bg-muted/30 px-4 py-12 text-center text-secondary">
                            Unggah file bukti transaksi (Excel atau CSV). Pilih sheet di header untuk mengganti isi
                            tabel. Header <span className="font-medium text-foreground">Total Setoran Bank</span>{" "}
                            diambil dari sel F1.
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                                        Sheet
                                    </p>
                                    <select
                                        value={selectedBuktiSheet ?? ""}
                                        onChange={(e) => setSelectedBuktiSheet(e.target.value || null)}
                                        className="min-w-[220px] max-w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
                                    >
                                        {buktiSheets.map((s) => (
                                            <option key={s.sheetName} value={s.sheetName}>
                                                {s.sheetName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <p className="text-base font-semibold text-foreground">
                                    Total Setoran Bank : {activeBuktiSheet?.f1TotalSetoranBank || "—"}
                                </p>
                            </div>

                            <SyncedHorizontalTable>
                                <table className="w-max min-w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/60 text-secondary">
                                            <th className="whitespace-nowrap px-4 py-3 font-semibold">
                                                <div className="flex items-center gap-2">
                                                    <span>Hari</span>
                                                    <HeaderFilter
                                                        value={buktiFilters.hari}
                                                        onChange={(v) =>
                                                            setBuktiFilters((p) => ({ ...p, hari: v }))
                                                        }
                                                        options={buktiOptions.hari}
                                                        ariaLabel="Filter Hari"
                                                        title="Filter Hari"
                                                    />
                                                </div>
                                            </th>
                                            <th className="whitespace-nowrap px-4 py-3 font-semibold">
                                                <div className="flex items-center gap-2">
                                                    <span>Tanggal</span>
                                                    <HeaderFilter
                                                        value={buktiFilters.tanggal}
                                                        onChange={(v) =>
                                                            setBuktiFilters((p) => ({ ...p, tanggal: v }))
                                                        }
                                                        options={buktiOptions.tanggal}
                                                        ariaLabel="Filter Tanggal"
                                                        title="Filter Tanggal"
                                                    />
                                                </div>
                                            </th>
                                            <th className="min-w-[120px] whitespace-nowrap px-4 py-3 text-right font-semibold">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>BRI</span>
                                                    <HeaderFilter
                                                        value={buktiFilters.bri}
                                                        onChange={(v) => setBuktiFilters((p) => ({ ...p, bri: v }))}
                                                        options={buktiOptions.bri}
                                                        ariaLabel="Filter BRI"
                                                        title="Filter BRI"
                                                    />
                                                </div>
                                            </th>
                                            <th className="min-w-[120px] whitespace-nowrap px-4 py-3 text-right font-semibold">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>BNI</span>
                                                    <HeaderFilter
                                                        value={buktiFilters.bni}
                                                        onChange={(v) => setBuktiFilters((p) => ({ ...p, bni: v }))}
                                                        options={buktiOptions.bni}
                                                        ariaLabel="Filter BNI"
                                                        title="Filter BNI"
                                                    />
                                                </div>
                                            </th>
                                            <th className="min-w-[120px] whitespace-nowrap px-4 py-3 text-right font-semibold">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>Lainnya</span>
                                                    <HeaderFilter
                                                        value={buktiFilters.lainnya}
                                                        onChange={(v) =>
                                                            setBuktiFilters((p) => ({ ...p, lainnya: v }))
                                                        }
                                                        options={buktiOptions.lainnya}
                                                        ariaLabel="Filter Lainnya"
                                                        title="Filter Lainnya"
                                                    />
                                                </div>
                                            </th>
                                            <th className="min-w-[140px] whitespace-nowrap px-4 py-3 text-right font-semibold">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>Total Setoran</span>
                                                    <HeaderFilter
                                                        value={buktiFilters.totalSetoran}
                                                        onChange={(v) =>
                                                            setBuktiFilters((p) => ({ ...p, totalSetoran: v }))
                                                        }
                                                        options={buktiOptions.totalSetoran}
                                                        ariaLabel="Filter Total Setoran"
                                                        title="Filter Total Setoran"
                                                    />
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!activeBuktiSheet || activeBuktiSheet.rows.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-secondary">
                                                    Tidak ada baris data yang dikenali di sheet ini (pastikan ada baris
                                                    header Hari dan Tanggal).
                                                </td>
                                            </tr>
                                        ) : (
                                            displayedBuktiRows.map((r, i) => (
                                                <tr
                                                    key={`${activeBuktiSheet.sheetName}-${i}`}
                                                    className="border-b border-border/80 hover:bg-muted/30"
                                                >
                                                    <td className="whitespace-nowrap px-4 py-3">{r.hari}</td>
                                                    <td className="whitespace-nowrap px-4 py-3">{r.tanggal}</td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                                                        {r.bri}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                                                        {r.bni}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                                                        {r.lainnya}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                                                        {r.totalSetoran}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </SyncedHorizontalTable>
                        </>
                    )}
                </div>
                )}
            </div>
        </DashboardLayout>
    );
}
