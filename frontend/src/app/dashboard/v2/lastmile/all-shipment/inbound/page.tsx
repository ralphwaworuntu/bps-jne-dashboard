"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    CalendarDays,
    Download,
    Inbox,
    Loader2,
    Plus,
    Upload,
    X,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import { API_URL, authHeaders } from "@/config";
import { useToast } from "@/context/ToastContext";
import ShipmentRowsTable, {
    isInboundRow,
    isUnInboundRow,
    type DetailRow,
} from "./ShipmentRowsTable";

type ZonaKey = "A" | "B" | "C" | "D";

type PivotRow = {
    Cabang: string;
    A: number;
    B: number;
    C: number;
    D: number;
    "Grand Total": number;
};

type PivotResponse = {
    date: string;
    columns: ZonaKey[];
    rows: PivotRow[];
    grand_total: Record<string, number>;
    wilayah_options: string[];
    available_dates: string[];
    message?: string | null;
    row_count_source?: number;
};

type DetailResponse = {
    items: DetailRow[];
    total: number;
    page: number;
    limit: number;
    pages: number;
    columns: string[];
    message?: string | null;
};

const ZONA_COLS: ZonaKey[] = ["A", "B", "C", "D"];

const DETAIL_COLUMNS_FALLBACK = [
    "Wilayah Grouping",
    "Cabang",
    "Zone",
    "Kecamatan",
    "AWB",
    "ID_ACCOUNT",
    "SHIPPER_NAME",
    "TGL_ENTRY",
    "CONSIGNEE_NAME",
    "ADDR1",
    "ADDR2",
    "ADDR3",
    "LAST_OFFICE_DATE",
    "LAST_WAREHOUSE_DATE",
    "NOREF",
    "ORIGIN",
    "DEST",
    "SERVICE",
    "QTY",
    "WEIGHT",
    "GOODS_DESCR",
    "INSURANCE_ID",
    "GOODS_VALUE",
    "INSURANCE_VALUE(+)",
    "AMOUNT",
    "INTRUCTION",
    "NOTICE",
    "HOLD_REASON",
    "RECEIVING",
    "RECEIVING_DATE",
    "OUTBOUND_MANIFEST",
    "OUTBOUND_MANIFEST_DATE",
    "INBOUND_MANIFEST",
    "USER_IM",
    "INBOUND_MANIFEST_DATE",
    "MANIFEST_TRANSIT_AGEN",
    "DATE_TRANSIT",
    "HVO_NO",
    "HVO_DATE",
    "HVO_HUB",
    "HVO_HUB_NAME",
    "HVO_HUB_DESTINATION",
    "HVO_HUB_DESTINATION_NAME",
    "HVI_NO",
    "HVI_DATE",
    "RUNSHEET_NO",
    "DATE_RUNSHEET",
    "RUNSHEET_COURIER_ID",
    "RUNSHEET_COURIER_NAME",
    "CODING",
    "STATUS_POD",
    "TGL_RECEIVED",
    "STATUS_LATITUDE",
    "STATUS_LONGITUDE",
    "AGING",
    "ETD",
    "SLA",
    "CARRER",
    "RECEIVED/REASON",
    "TGL_UPDATE_STATUS_POD",
    "WUS_OUTGOING_CODE",
    "WUS_REMARKS",
    "WUS_DATE",
    "INVOICED",
    "AWB_CANCEL",
    "COD_FLAG",
    "BILNOTE_FLAG",
    "BILNOTE_AMOUNT",
    "REFNO_UOB",
    "SCO_NO",
    "WO/DO/PO",
    "NO_INVOICE",
    "PAYMENT_TYPE",
    "DATE_1ST_ATTEMPT",
    "RESULT_1ST_ATTEMPT",
    "LATLONG_1ST_ATTEMPT",
    "DATE_2ND_ATTEMPT",
    "RESULT_2ND_ATTEMPT",
    "LATLONG_2ND_ATTEMPT",
    "DATE_LAST_ATTEMPT",
    "RESULT_LAST_ATTEMPT",
    "LATLONG_LAST_ATTEMPT",
    "PRA_RUNSHEET_NO",
    "PRA_RUNSHEET_NAME",
    "PRA_RUNSHEET_DATE",
    "CS3_DATE",
    "CONNOTE_RETURN_RT",
    "DATE_CONNOTE_RETURN_RT",
    "CONNOTE_RETURN_RF",
    "DATE_CONNOTE_RETURN_RF",
    "USER_CONNOTE",
    "USER_ZONE_CONNOTE",
    "CONFIRM_SHIPMENT_UNDEL",
    "TRANSIT_MANIFEST",
    "TRANSIT_MANIFEST_DATE",
    "TRANSIT_MANIFEST_USER",
    "IREG_MANIFEST",
    "IREG_CODE",
    "IREG_DATE",
    "URL_TTD",
    "URL_FOTO",
    "USER_OM",
    "USER_RECEIVING",
    "AGING_ONGOING",
    "CLAIM_NO",
    "CLAIM_DOC_NO",
    "CLAIM_DATE",
    "NO_CNOTE_FW",
    "ORIGIN_FW",
    "DEST_FW",
    "CODING_STATUS_FW",
    "DESC_STATUS_FW",
    "HBG_NO",
    "HBG_DATE",
    "1ST_HVO_NO",
    "1ST_HVO_DATE",
    "1ST_HVO_USER",
    "LAST_HVO_NO",
    "LAST_HVO_DATE",
    "LAST_HVO_USER",
    "MANIFEST_TRANSIT_SUBAGEN_NO",
    "MANIFEST_TRANSIT_SUBAGEN_DATE",
    "MANIFEST_INBOUND_SUBAGEN_NO",
    "MANIFEST_INBOUND_SUBAGEN_DATE",
    "BAG_NO",
    "LATEST_SM_NO",
    "LATEST_SM_DATE",
    "1ST_PREVIOUS_SM_NO",
    "1ST_PREVIOUS_SM_DATE",
    "2ND_PREVIOUS_SM_NO",
    "2ND_PREVIOUS_SM_DATE",
    "1ST_TRANSIT_MANIFEST_NO",
    "1ST_TRANSIT_MANIFEST_DATE",
    "2ND_TRANSIT_MANIFEST_NO",
    "2ND_TRANSIT_MANIFEST_DATE",
    "3RD_TRANSIT_MANIFEST_NO",
    "3RD_TRANSIT_MANIFEST_DATE",
    "LAST_TRANSIT_MANIFEST_NO",
    "LAST_TRANSIT_MANIFEST_DATE",
    "MTI_USER",
    "MTS_USER",
    "HO_COURIER_NO",
    "HO_COURIER_DATE",
    "WAREHOUSE_DATE",
    "OFFICE_DATE",
    "IRREG_REMAKS",
    "BPIK",
    "ZONE_USER_ENTRI",
    "CORRECT_DESTINATION",
    "CORRECT_SERVICE",
    "CORRECT_AMOUNT",
    "HACB_NO",
    "HACB_DATE",
    "HACB_USER",
    "HBAG_NO",
    "HBAG_DATE",
    "HBAG_USER",
    "PICKUP_DATE",
    "PICKUP_STATUS",
    "PICKUP_COURIER_ID",
    "1ST_RUNSHEET_DATE",
    "1ST_RUNSHEET_COURIERID",
    "URL_CHAT",
    "SINGLE_LEG",
    "LAST_DATE_DO",
    "NO_RCW",
    "DATE_RCW",
    "USER_RCW",
    "DATE_LPR",
    "NO_LPR",
    "NO_RDO",
    "DATE_RDO",
    "NO_DO",
    "PROJECT_KR",
    "HO_OFFICE_NO",
    "HO_OFFICE_DATE",
    "LATEST_SM_ORIGIN",
    "LATEST_SM_DEST",
    "1ST_PREVIOUS_SM_ORIGIN",
    "1ST_PREVIOUS_SM_DEST",
    "2ND_PREVIOUS_SM_ORIGIN",
    "2ND_PREVIOUS_SM_DEST",
    "STATUS_WEB",
    "TGL_TARIK_REPORT",
] as const;

function todayIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatIdDate(iso: string) {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

async function parseError(res: Response) {
    try {
        const body = await res.json();
        if (typeof body?.detail === "string") return body.detail;
        return JSON.stringify(body);
    } catch {
        return res.statusText || "Request gagal";
    }
}

function formatBytes(n: number) {
    if (!Number.isFinite(n) || n < 0) return "0 B";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadProgressInfo = {
    /** 0–100: upload bytes (0–90) lalu processing (90–99) hingga selesai (100) */
    percent: number;
    loaded: number;
    total: number;
    phase: "idle" | "uploading" | "processing" | "done";
};

type UploadWithProgressResult = {
    ok: boolean;
    status: number;
    body: string;
};

/** Upload multipart dengan progress nyata dari XHR (byte-level). */
function uploadWithProgress(
    url: string,
    form: FormData,
    headers: Record<string, string>,
    onProgress: (info: Omit<UploadProgressInfo, "phase"> & { phase: "uploading" | "processing" }) => void
): Promise<UploadWithProgressResult> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        Object.entries(headers).forEach(([k, v]) => {
            if (v) xhr.setRequestHeader(k, v);
        });
        xhr.timeout = 300_000; // 5 menit, selaras proxyTimeout

        xhr.upload.onprogress = (ev) => {
            if (!ev.lengthComputable || ev.total <= 0) return;
            // Cadangkan 10% untuk fase proses server setelah bytes terkirim
            const uploadPct = Math.min(90, Math.round((ev.loaded / ev.total) * 90));
            onProgress({
                percent: uploadPct,
                loaded: ev.loaded,
                total: ev.total,
                phase: "uploading",
            });
        };

        xhr.upload.onload = () => {
            onProgress({
                percent: 92,
                loaded: 0,
                total: 0,
                phase: "processing",
            });
        };

        xhr.onload = () => {
            resolve({
                ok: xhr.status >= 200 && xhr.status < 300,
                status: xhr.status,
                body: xhr.responseText || "",
            });
        };

        xhr.onerror = () => reject(new Error("Network error saat upload"));
        xhr.ontimeout = () =>
            reject(new Error("Upload timeout. File terlalu besar atau koneksi lambat."));
        xhr.onabort = () => reject(new Error("Upload dibatalkan"));

        xhr.send(form);
    });
}

export default function InboundPage() {
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [filterDate, setFilterDate] = useState(todayIso());
    const [wilayahGrouping, setWilayahGrouping] = useState("(All)");
    const [wilayahOptions, setWilayahOptions] = useState<string[]>([]);
    const [availableDates, setAvailableDates] = useState<string[]>([]);

    const [pivot, setPivot] = useState<PivotResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const [detailColumns, setDetailColumns] = useState<string[]>([
        ...DETAIL_COLUMNS_FALLBACK,
    ]);
    const [detailItems, setDetailItems] = useState<DetailRow[]>([]);
    const [detailMessage, setDetailMessage] = useState<string | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [viewMode, setViewMode] = useState<"inbound" | "un_inbound">("inbound");
    /** Drill-down dari klik angka PIVOT → filter tabel INBOUND. */
    const [pivotDrill, setPivotDrill] = useState<{
        cabang?: string;
        zone?: string;
    } | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [uploadDate, setUploadDate] = useState(todayIso());
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo>({
        percent: 0,
        loaded: 0,
        total: 0,
        phase: "idle",
    });

    const loadPivot = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                date: filterDate,
                kind: viewMode === "un_inbound" ? "un_inbound" : "inbound",
            });
            if (wilayahGrouping && wilayahGrouping !== "(All)") {
                params.set("wilayah_grouping", wilayahGrouping);
            }
            const res = await fetch(
                `${API_URL}/api/all-shipment/inbound/pivot?${params.toString()}`,
                { headers: authHeaders() }
            );
            if (!res.ok) throw new Error(await parseError(res));
            const data = (await res.json()) as PivotResponse;
            // Kompatibilitas: backend lama pakai "Row Labels"
            data.rows = (data.rows || []).map((row) => {
                const anyRow = row as PivotRow & { "Row Labels"?: string };
                return {
                    ...anyRow,
                    Cabang: anyRow.Cabang || anyRow["Row Labels"] || "UNKNOWN",
                };
            });
            setPivot(data);
            setWilayahOptions(data.wilayah_options || []);
            setAvailableDates(data.available_dates || []);
        } catch (e: unknown) {
            setPivot(null);
            showToast(e instanceof Error ? e.message : "Gagal memuat pivot", "error");
        } finally {
            setLoading(false);
        }
    }, [filterDate, wilayahGrouping, viewMode, showToast]);

    const loadDetail = useCallback(async () => {
        setLoadingDetail(true);
        try {
            const params = new URLSearchParams({
                date: filterDate,
                limit: "0", // unlimited
            });
            if (wilayahGrouping && wilayahGrouping !== "(All)") {
                params.set("wilayah_grouping", wilayahGrouping);
            }

            const res = await fetch(
                `${API_URL}/api/all-shipment/inbound/rows?${params.toString()}`,
                { headers: authHeaders() }
            );
            if (!res.ok) throw new Error(await parseError(res));
            const data = (await res.json()) as DetailResponse;
            setDetailItems(data.items || []);
            setDetailMessage(data.message || null);
            if (data.columns?.length) setDetailColumns(data.columns);
        } catch (e: unknown) {
            setDetailItems([]);
            setDetailMessage(null);
            showToast(e instanceof Error ? e.message : "Gagal memuat detail", "error");
        } finally {
            setLoadingDetail(false);
        }
    }, [filterDate, wilayahGrouping, showToast]);

    useEffect(() => {
        void loadPivot();
    }, [loadPivot]);

    useEffect(() => {
        void loadDetail();
    }, [loadDetail]);

    // Reset drill pivot saat filter tanggal/wilayah berubah
    useEffect(() => {
        setPivotDrill(null);
    }, [filterDate, wilayahGrouping]);

    const openTambahData = () => {
        setUploadDate(filterDate || todayIso());
        setSelectedFile(null);
        setUploadProgress({ percent: 0, loaded: 0, total: 0, phase: "idle" });
        setModalOpen(true);
    };

    const handleDownloadExcel = async () => {
        if (!filterDate) {
            showToast("Pilih tanggal data terlebih dahulu", "error");
            return;
        }
        setDownloading(true);
        try {
            const params = new URLSearchParams({ date: filterDate });
            if (wilayahGrouping && wilayahGrouping !== "(All)") {
                params.set("wilayah_grouping", wilayahGrouping);
            }
            const res = await fetch(
                `${API_URL}/api/all-shipment/inbound/export?${params.toString()}`,
                { headers: authHeaders() }
            );
            if (!res.ok) throw new Error(await parseError(res));
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Inbound_${filterDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            showToast("Excel berhasil diunduh (3 sheet).", "success");
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "Download gagal", "error");
        } finally {
            setDownloading(false);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            showToast("Pilih file APEX (CSV) terlebih dahulu", "error");
            return;
        }
        if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
            showToast("Format file harus CSV (.csv).", "error");
            return;
        }
        if (!uploadDate) {
            showToast("Pilih tanggal data", "error");
            return;
        }

        setUploading(true);
        setUploadProgress({
            percent: 0,
            loaded: 0,
            total: selectedFile.size,
            phase: "uploading",
        });

        try {
            const form = new FormData();
            form.append("file", selectedFile);
            form.append("date", uploadDate);

            const auth = authHeaders() as Record<string, string>;
            const result = await uploadWithProgress(
                `${API_URL}/api/all-shipment/inbound/upload`,
                form,
                auth,
                (info) => setUploadProgress(info)
            );

            if (!result.ok) {
                let detail = result.body || `Upload gagal (HTTP ${result.status})`;
                try {
                    const parsed = JSON.parse(result.body);
                    if (typeof parsed?.detail === "string") detail = parsed.detail;
                    else if (parsed?.detail) detail = JSON.stringify(parsed.detail);
                } catch {
                    /* keep raw */
                }
                throw new Error(detail);
            }

            setUploadProgress((p) => ({ ...p, percent: 100, phase: "done" }));

            const data = JSON.parse(result.body) as { rows?: number };
            showToast(
                `File APEX tanggal ${formatIdDate(uploadDate)} tersimpan (${Number(
                    data.rows || 0
                ).toLocaleString("id-ID")} baris).`,
                "success"
            );
            setModalOpen(false);
            setSelectedFile(null);
            setUploadProgress({ percent: 0, loaded: 0, total: 0, phase: "idle" });
            setFilterDate(uploadDate);
            if (uploadDate === filterDate) {
                await Promise.all([loadPivot(), loadDetail()]);
            }
        } catch (e: unknown) {
            setUploadProgress((p) => ({ ...p, phase: "idle" }));
            const msg = e instanceof Error ? e.message : "Upload gagal";
            if (/failed to fetch|network|socket|hang up|timeout/i.test(msg)) {
                showToast(
                    "Upload terputus (file terlalu besar / timeout). Coba lagi — pastikan backend masih jalan.",
                    "error"
                );
            } else {
                showToast(msg, "error");
            }
        } finally {
            setUploading(false);
        }
    };

    const columns = pivot?.columns?.length ? pivot.columns : ZONA_COLS;
    const rows = pivot?.rows || [];
    const grand = pivot?.grand_total || { A: 0, B: 0, C: 0, D: 0, "Grand Total": 0 };

    const hasData = rows.length > 0;

    const thDark =
        "border border-black/50 bg-[#2f2f2f] px-3 py-2 text-center text-xs font-semibold text-white whitespace-nowrap";
    const tdBody =
        "border border-black/25 bg-[#c6efce] px-3 py-1.5 text-sm text-black whitespace-nowrap";
    const tdNum = `${tdBody} text-right tabular-nums`;
    const foot =
        "border border-black/50 bg-[#2f2f2f] px-3 py-2 text-xs font-bold text-white whitespace-nowrap";

    const pivotCellClass = (active: boolean) =>
        `${tdNum} cursor-pointer underline decoration-dotted underline-offset-2 transition hover:bg-[#a5d6a7] ${
            active ? "bg-[#81c784] font-bold ring-2 ring-inset ring-sky-600" : ""
        }`;

    const pivotFootCellClass = (active: boolean) =>
        `${foot} text-right cursor-pointer underline decoration-dotted underline-offset-2 transition hover:bg-[#444] ${
            active ? "ring-2 ring-inset ring-sky-300" : ""
        }`;

    const dateHint = useMemo(() => {
        if (!availableDates.length) return "Belum ada tanggal tersimpan.";
        return `Tersedia: ${availableDates.slice(0, 5).map(formatIdDate).join(", ")}${
            availableDates.length > 5 ? "…" : ""
        }`;
    }, [availableDates]);

    // INBOUND / UN INBOUND — aturan filter Excel-like
    const { inboundItems, unInboundItems } = useMemo(() => {
        const inbound: DetailRow[] = [];
        const unInbound: DetailRow[] = [];
        for (const row of detailItems) {
            // UN INBOUND dievaluasi lebih dulu (tabel terpisah)
            if (isUnInboundRow(row)) unInbound.push(row);
            if (isInboundRow(row)) inbound.push(row);
        }
        return { inboundItems: inbound, unInboundItems: unInbound };
    }, [detailItems]);

    const pivotExternalFilters = useMemo(() => {
        if (!pivotDrill) return {} as Record<string, string>;
        const f: Record<string, string> = {};
        if (pivotDrill.cabang) f.Cabang = pivotDrill.cabang;
        if (pivotDrill.zone) f.Zone = pivotDrill.zone;
        return f;
    }, [pivotDrill]);

    const pivotExternalLabel = useMemo(() => {
        if (!pivotDrill) return null;
        const parts: string[] = [];
        if (pivotDrill.cabang) parts.push(`Cabang = ${pivotDrill.cabang}`);
        if (pivotDrill.zone) parts.push(`Zone = ${pivotDrill.zone}`);
        return parts.length ? parts.join(" · ") : null;
    }, [pivotDrill]);

    const applyPivotDrill = (cabang?: string, zone?: string) => {
        const same =
            pivotDrill &&
            (pivotDrill.cabang || "") === (cabang || "") &&
            (pivotDrill.zone || "") === (zone || "");
        if (same) {
            setPivotDrill(null);
            return;
        }
        setPivotDrill({
            ...(cabang ? { cabang } : {}),
            ...(zone ? { zone } : {}),
        });
        window.requestAnimationFrame(() => {
            document.getElementById("inbound-table-card")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    };

    const isPivotActive = (cabang?: string, zone?: string) =>
        Boolean(
            pivotDrill &&
                (pivotDrill.cabang || "") === (cabang || "") &&
                (pivotDrill.zone || "") === (zone || "")
        );

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
                        Inbound
                    </h1>
                    <p className="mt-2 text-sm text-secondary">
                        PIVOT INBOUND per Cabang × Zone. Pilih radio INBOUND / UN INBOUND
                        di kartu kontrol.
                    </p>
                </div>

                {/* Control card */}
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(200px,240px)_minmax(160px,220px)_minmax(220px,280px)]">
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
                                <span className="text-[11px] text-secondary">{dateHint}</span>
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-foreground">
                                    Wilayah Grouping
                                </span>
                                <select
                                    value={wilayahGrouping}
                                    onChange={(e) => setWilayahGrouping(e.target.value)}
                                    className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                                >
                                    <option value="(All)">(All)</option>
                                    {wilayahOptions.map((w) => (
                                        <option key={w} value={w}>
                                            {w}
                                        </option>
                                    ))}
                                </select>
                            </label>

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
                                            onChange={() => {
                                                setViewMode("inbound");
                                            }}
                                            className="size-4 accent-sky-600"
                                        />
                                        INBOUND
                                    </label>
                                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="radio"
                                            name="view-mode"
                                            value="un_inbound"
                                            checked={viewMode === "un_inbound"}
                                            onChange={() => {
                                                setViewMode("un_inbound");
                                                setPivotDrill(null);
                                            }}
                                            className="size-4 accent-amber-600"
                                        />
                                        UN INBOUND
                                    </label>
                                </div>
                                <span className="text-[11px] text-secondary">
                                    {viewMode === "inbound"
                                        ? "Menampilkan PIVOT INBOUND + tabel INBOUND"
                                        : "Menampilkan PIVOT UN INBOUND + tabel UN INBOUND"}
                                </span>
                            </fieldset>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:mt-[26px]">
                            <button
                                type="button"
                                onClick={() => void handleDownloadExcel()}
                                disabled={downloading || loadingDetail}
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
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
                            >
                                <Plus className="size-4" />
                                Tambah Data
                            </button>
                        </div>
                    </div>
                </div>

                {(() => {
                    const isInboundView = viewMode === "inbound";
                    const pivotTitle = isInboundView
                        ? "PIVOT INBOUND"
                        : "PIVOT UN INBOUND";
                    const tableTitle = isInboundView ? "INBOUND" : "UN INBOUND";
                    const tableItems = isInboundView ? inboundItems : unInboundItems;
                    const iconCls = isInboundView ? "text-sky-700" : "text-amber-700";
                    const accent = isInboundView ? "text-sky-700" : "text-amber-700";
                    const tableHint = isInboundView
                        ? "INBOUND: Zone A–D. Dihapus hanya jika IMD kosong + ORIGIN ≠ KOE* + OUTBOUND_MANIFEST terisi ≠ KOE*. Klik angka pivot untuk memfilter."
                        : "UN INBOUND: INBOUND_MANIFEST_DATE kosong + ORIGIN tidak berawalan KOE (difilter lebih dahulu).";
                    const emptyMsg = isInboundView
                        ? detailMessage ||
                          "Belum ada data INBOUND untuk filter ini."
                        : "Belum ada data UN INBOUND (INBOUND_MANIFEST_DATE kosong & ORIGIN ≠ KOE*) untuk filter ini.";

                    return (
                        <>
                            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Inbox className={`size-4 ${iconCls}`} />
                                        <span className="text-sm font-bold text-foreground">
                                            {pivotTitle} · {formatIdDate(filterDate)}
                                        </span>
                                        {loading ? (
                                            <Loader2 className="size-3.5 animate-spin text-secondary" />
                                        ) : null}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {pivotDrill ? (
                                            <button
                                                type="button"
                                                onClick={() => setPivotDrill(null)}
                                                className={`text-xs font-semibold ${accent} underline-offset-2 hover:underline`}
                                            >
                                                Reset filter pivot
                                            </button>
                                        ) : null}
                                        {pivot?.row_count_source != null ? (
                                            <span className="text-xs text-secondary">
                                                Sumber:{" "}
                                                {pivot.row_count_source.toLocaleString(
                                                    "id-ID"
                                                )}{" "}
                                                baris · klik angka untuk filter tabel{" "}
                                                {tableTitle}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="overflow-x-auto p-3">
                                    <table className="min-w-full border-collapse">
                                        <thead>
                                            <tr>
                                                <th className={`${thDark} text-left`}>
                                                    {pivotTitle}
                                                </th>
                                                <th
                                                    className={thDark}
                                                    colSpan={columns.length + 1}
                                                >
                                                    ZONA
                                                </th>
                                            </tr>
                                            <tr>
                                                <th className={`${thDark} text-left`}>
                                                    Cabang
                                                </th>
                                                {columns.map((z) => (
                                                    <th key={z} className={thDark}>
                                                        {z}
                                                    </th>
                                                ))}
                                                <th className={thDark}>Grand Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {!loading && !hasData ? (
                                                <tr>
                                                    <td
                                                        colSpan={columns.length + 2}
                                                        className="border border-black/20 px-4 py-12 text-center text-secondary"
                                                    >
                                                        {pivot?.message ||
                                                            `Belum ada data ${pivotTitle}.`}
                                                    </td>
                                                </tr>
                                            ) : null}

                                            {rows.map((row) => {
                                                const cabang = row.Cabang;
                                                return (
                                                    <tr key={cabang}>
                                                        <td
                                                            className={`${tdBody} font-bold`}
                                                        >
                                                            {cabang}
                                                        </td>
                                                        {columns.map((z) => {
                                                            const n = row[z] || 0;
                                                            const active = isPivotActive(
                                                                cabang,
                                                                z
                                                            );
                                                            return (
                                                                <td
                                                                    key={z}
                                                                    className={
                                                                        n
                                                                            ? pivotCellClass(
                                                                                  active
                                                                              )
                                                                            : tdNum
                                                                    }
                                                                    onClick={() => {
                                                                        if (!n) return;
                                                                        applyPivotDrill(
                                                                            cabang,
                                                                            z
                                                                        );
                                                                    }}
                                                                    title={
                                                                        n
                                                                            ? `Filter ${tableTitle}: Cabang=${cabang}, Zone=${z}`
                                                                            : undefined
                                                                    }
                                                                >
                                                                    {n
                                                                        ? n.toLocaleString(
                                                                              "id-ID"
                                                                          )
                                                                        : ""}
                                                                </td>
                                                            );
                                                        })}
                                                        <td
                                                            className={
                                                                row["Grand Total"]
                                                                    ? pivotCellClass(
                                                                          isPivotActive(
                                                                              cabang,
                                                                              undefined
                                                                          )
                                                                      )
                                                                    : `${tdNum} font-bold`
                                                            }
                                                            onClick={() => {
                                                                if (!row["Grand Total"])
                                                                    return;
                                                                applyPivotDrill(
                                                                    cabang,
                                                                    undefined
                                                                );
                                                            }}
                                                            title={`Filter ${tableTitle}: Cabang=${cabang}`}
                                                        >
                                                            {(
                                                                row["Grand Total"] || 0
                                                            ).toLocaleString("id-ID")}
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {hasData ? (
                                                <tr>
                                                    <td className={`${foot} text-left`}>
                                                        Grand Total
                                                    </td>
                                                    {columns.map((z) => {
                                                        const n = grand[z] || 0;
                                                        const active = isPivotActive(
                                                            undefined,
                                                            z
                                                        );
                                                        return (
                                                            <td
                                                                key={z}
                                                                className={pivotFootCellClass(
                                                                    active
                                                                )}
                                                                onClick={() => {
                                                                    if (!n) return;
                                                                    applyPivotDrill(
                                                                        undefined,
                                                                        z
                                                                    );
                                                                }}
                                                                title={`Filter ${tableTitle}: Zone=${z}`}
                                                            >
                                                                {n.toLocaleString("id-ID")}
                                                            </td>
                                                        );
                                                    })}
                                                    <td
                                                        className={pivotFootCellClass(
                                                            false
                                                        )}
                                                        onClick={() => setPivotDrill(null)}
                                                        title={`Tampilkan semua ${tableTitle}`}
                                                    >
                                                        {(
                                                            grand["Grand Total"] || 0
                                                        ).toLocaleString("id-ID")}
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div id="inbound-table-card">
                                <ShipmentRowsTable
                                    title={tableTitle}
                                    dateLabel={formatIdDate(filterDate)}
                                    columns={detailColumns}
                                    items={tableItems}
                                    loading={loadingDetail}
                                    emptyMessage={emptyMsg}
                                    iconClassName={iconCls}
                                    hint={tableHint}
                                    externalFilters={pivotExternalFilters}
                                    externalFilterLabel={pivotExternalLabel}
                                    onClearExternalFilters={() => setPivotDrill(null)}
                                />
                            </div>
                        </>
                    );
                })()}
            </div>

            {modalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="inbound-upload-title"
                        className="w-full max-w-lg rounded-2xl border border-border bg-white shadow-lg"
                    >
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <h2
                                id="inbound-upload-title"
                                className="text-base font-semibold text-foreground"
                            >
                                Upload File APEX
                            </h2>
                            <button
                                type="button"
                                onClick={() => !uploading && setModalOpen(false)}
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
                                    className="rounded-xl border border-border px-3 py-2.5 text-sm"
                                />
                                <span className="text-xs text-secondary">
                                    Data APEX masuk ke tabel INBOUND / UN INBOUND
                                    (kolom AWB s/d TGL_TARIK_REPORT + lookup geo).
                                </span>
                            </label>

                            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
                                <Upload className="mx-auto size-7 text-secondary" />
                                <p className="mt-2 text-sm font-medium text-foreground">
                                    Upload File APEX
                                </p>
                                <p className="mt-1 text-xs text-secondary">
                                    Format file: CSV (.csv) — kolom mulai AWB hingga
                                    TGL_TARIK_REPORT. Tanda &apos; pada AWB &amp;
                                    ID_ACCOUNT akan dihapus otomatis.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="mt-3 inline-flex rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-muted"
                                >
                                    Browse File APEX
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,text/csv"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        if (file && !file.name.toLowerCase().endsWith(".csv")) {
                                            setSelectedFile(null);
                                            showToast(
                                                "Format file harus CSV (.csv).",
                                                "error"
                                            );
                                        } else {
                                            setSelectedFile(file);
                                        }
                                        e.target.value = "";
                                    }}
                                />
                                <p className="mt-3 break-all text-sm text-secondary">
                                    {selectedFile
                                        ? `${selectedFile.name} · ${formatBytes(selectedFile.size)}`
                                        : "Belum ada file APEX dipilih."}
                                </p>
                            </div>

                            {uploading || uploadProgress.phase !== "idle" ? (
                                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                                    <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                                        <span className="font-semibold text-foreground">
                                            {uploadProgress.phase === "uploading"
                                                ? "Mengunggah file…"
                                                : uploadProgress.phase === "processing"
                                                  ? "Memproses data di server…"
                                                  : uploadProgress.phase === "done"
                                                    ? "Selesai"
                                                    : "Menyiapkan…"}
                                        </span>
                                        <span className="tabular-nums font-semibold text-sky-700">
                                            {uploadProgress.percent}%
                                        </span>
                                    </div>
                                    <div
                                        className="h-2.5 w-full overflow-hidden rounded-full bg-black/10"
                                        role="progressbar"
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={uploadProgress.percent}
                                        aria-label="Progress upload"
                                    >
                                        <div
                                            className={`h-full rounded-full transition-[width] duration-150 ease-out ${
                                                uploadProgress.phase === "processing"
                                                    ? "animate-pulse bg-sky-500"
                                                    : "bg-sky-600"
                                            }`}
                                            style={{
                                                width: `${Math.max(2, uploadProgress.percent)}%`,
                                            }}
                                        />
                                    </div>
                                    <p className="mt-2 text-[11px] text-secondary">
                                        {uploadProgress.phase === "uploading" &&
                                        uploadProgress.total > 0
                                            ? `${formatBytes(uploadProgress.loaded)} / ${formatBytes(
                                                  uploadProgress.total
                                              )} terkirim`
                                            : uploadProgress.phase === "processing"
                                              ? "File sudah terkirim. Sedang parsing & menyimpan ke tabel INBOUND / UN INBOUND…"
                                              : uploadProgress.phase === "done"
                                                ? "Upload berhasil."
                                                : null}
                                    </p>
                                </div>
                            ) : null}

                            <div className="flex justify-end gap-2 border-t border-border pt-4">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    disabled={uploading}
                                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-muted disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleUpload()}
                                    disabled={uploading || !selectedFile}
                                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                                >
                                    {uploading ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <Upload className="size-4" />
                                    )}
                                    {uploading
                                        ? uploadProgress.phase === "processing"
                                            ? "Memproses…"
                                            : `Upload ${uploadProgress.percent}%`
                                        : "Submit"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </DashboardLayout>
    );
}
