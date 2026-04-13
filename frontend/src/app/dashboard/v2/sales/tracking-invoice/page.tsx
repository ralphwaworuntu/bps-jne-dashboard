"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import SyncedHorizontalTable from "@/components/dashboard/v2/SyncedHorizontalTable";
import { useToast } from "@/context/ToastContext";
import { fetchInvoiceByNo, uploadInvoicePdf, type InvoiceDetail } from "@/lib/salesApi";
import { FileSearch, Loader2, ReceiptText, Upload } from "lucide-react";

function formatMoney(n: number): string {
    return (n ?? 0).toLocaleString("id-ID");
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function daysBetween(a: Date, b: Date): number {
    const ms = b.getTime() - a.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default function TrackingInvoicePage() {
    const router = useRouter();
    const { showToast } = useToast();

    const [invoiceNo, setInvoiceNo] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [data, setData] = useState<InvoiceDetail | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) router.push("/");
    }, [router]);

    const status = useMemo(() => {
        if (!data) return null;
        const now = new Date();
        const due = new Date(data.due_date);
        if (Number.isNaN(due.getTime())) return { label: "Unknown", tone: "bg-muted text-secondary" };
        const diff = daysBetween(now, due);
        if (diff < 0) return { label: "Overdue", tone: "bg-red-500/10 text-red-700" };
        if (diff === 0) return { label: "Due today", tone: "bg-amber-500/10 text-amber-700" };
        return { label: `Due in ${diff} hari`, tone: "bg-emerald-500/10 text-emerald-700" };
    }, [data]);

    const paymentBadge = useMemo(() => {
        if (!data) return null;
        const st = (data.payment_status || "").toLowerCase();
        if (st.includes("lunas")) return { label: "Lunas", tone: "bg-emerald-500/10 text-emerald-700" };
        if (st.includes("belum")) return { label: "Belum Lunas", tone: "bg-amber-500/10 text-amber-700" };
        return { label: data.payment_status || "—", tone: "bg-muted text-secondary" };
    }, [data]);

    const onSearch = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            showToast("Tidak ada token login.", "error");
            return;
        }
        const q = invoiceNo.trim();
        if (!q) {
            showToast("Masukkan nomor invoice.", "error");
            return;
        }
        setLoading(true);
        try {
            const res = await fetchInvoiceByNo(token, q);
            setData(res);
        } catch (e) {
            setData(null);
            showToast(`Gagal mencari invoice: ${e instanceof Error ? e.message : "error"}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const onUploadPdf = async (f: File | null) => {
        if (!f) return;
        const token = localStorage.getItem("token");
        if (!token) {
            showToast("Tidak ada token login.", "error");
            return;
        }
        if (!f.name.toLowerCase().endsWith(".pdf")) {
            showToast("File harus PDF.", "error");
            return;
        }
        setUploading(true);
        try {
            const res = await uploadInvoicePdf(token, f);
            setData(res);
            setInvoiceNo(res.invoice_no);
            showToast("PDF diproses (OCR) dan invoice tersimpan.", "success");
        } catch (e) {
            showToast(
                `Gagal proses PDF invoice: ${e instanceof Error ? e.message : "error"}`,
                "error"
            );
        } finally {
            setUploading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 p-6 lg:p-10">
                <div>
                    <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Tracking Invoice</h1>
                    <p className="mt-2 text-sm text-secondary">
                        Masukkan nomor invoice untuk melihat detail tagihan, TOP, due date, dan rincian item.
                    </p>
                </div>

                <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <label className="flex w-full flex-col gap-1 md:max-w-xl">
                            <span className="text-sm font-semibold text-foreground">Nomor Invoice</span>
                            <div className="flex items-center gap-2">
                                <input
                                    value={invoiceNo}
                                    onChange={(e) => setInvoiceNo(e.target.value)}
                                    className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                    placeholder="contoh: INV-2026-0001"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") void onSearch();
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => void onSearch()}
                                    disabled={loading}
                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
                                >
                                    {loading ? (
                                        <Loader2 className="size-4 animate-spin" aria-hidden />
                                    ) : (
                                        <FileSearch className="size-4" aria-hidden />
                                    )}
                                    Cari
                                </button>
                            </div>
                        </label>

                        <div className="flex w-full flex-col gap-1 md:w-auto">
                            <span className="text-sm font-semibold text-foreground">Upload PDF (scan)</span>
                            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted">
                                {uploading ? (
                                    <Loader2 className="size-4 animate-spin" aria-hidden />
                                ) : (
                                    <Upload className="size-4" aria-hidden />
                                )}
                                {uploading ? "Memproses OCR…" : "Pilih PDF"}
                                <input
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    className="hidden"
                                    onChange={(e) => void onUploadPdf(e.target.files?.[0] ?? null)}
                                />
                            </label>
                            <p className="text-xs text-secondary">
                                Untuk PDF hasil scan, sistem akan OCR lalu simpan ke database.
                            </p>
                        </div>

                        {data && (
                            <div className="flex items-center gap-2 self-start md:self-end">
                                <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
                                    Status
                                </span>
                                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${status?.tone ?? ""}`}>
                                    {status?.label ?? "—"}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {!data ? (
                    <div className="rounded-[var(--radius-card)] border border-border bg-muted/30 p-10 text-center text-secondary">
                        Masukkan nomor invoice lalu klik <span className="font-medium text-foreground">Cari</span>.
                        Contoh data tersedia:{" "}
                        <button
                            type="button"
                            className="font-semibold text-primary underline-offset-4 hover:underline"
                            onClick={() => {
                                setInvoiceNo("INV-2026-0001");
                                void onSearch();
                            }}
                        >
                            INV-2026-0001
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-4 rounded-[var(--radius-card)] border border-border bg-white p-5 lg:grid-cols-4">
                            <div className="flex items-start gap-3 rounded-2xl bg-muted/40 px-4 py-4">
                                <ReceiptText className="mt-0.5 size-5 text-primary" aria-hidden />
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                                        Nominal
                                    </p>
                                    <p className="text-xl font-semibold text-foreground">{formatMoney(data.nominal_total)}</p>
                                    <p className="mt-1 text-xs text-secondary">Invoice: {data.invoice_no}</p>
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
                                            Status
                                        </span>
                                        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${paymentBadge?.tone ?? ""}`}>
                                            {paymentBadge?.label ?? "—"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-muted/40 px-4 py-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                                    Faktur Pajak / NPWP
                                </p>
                                <div className="mt-2 space-y-1 text-sm">
                                    <p className="text-secondary">
                                        Nomor Seri Faktur Pajak:{" "}
                                        <span className="font-semibold text-foreground">
                                            {data.tax_info.nomor_seri_faktur_pajak || "—"}
                                        </span>
                                    </p>
                                    <p className="text-secondary">
                                        NPWP ID:{" "}
                                        <span className="font-semibold text-foreground">
                                            {data.tax_info.npwp_id || "—"}
                                        </span>
                                    </p>
                                    <p className="text-secondary">
                                        NPWP Name:{" "}
                                        <span className="font-semibold text-foreground">
                                            {data.tax_info.npwp_name || "—"}
                                        </span>
                                    </p>
                                    <p className="text-secondary">
                                        NPWP Address:{" "}
                                        <span className="font-semibold text-foreground">
                                            {data.tax_info.npwp_address || "—"}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-muted/40 px-4 py-4 lg:col-span-2">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                                        Invoice date
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">
                                        {formatDate(data.invoice_date)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">TOP</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">{data.top_days} hari</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                                        Due date
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">
                                        {formatDate(data.due_date)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                                        Periode
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">{data.periode || "—"}</p>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-muted/40 px-4 py-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                                    Billed to
                                </p>
                                <div className="mt-2 space-y-1 text-sm">
                                    <p className="font-semibold text-foreground">
                                        {data.billed_to.customer_name}
                                    </p>
                                    <p className="text-secondary">
                                        Customer ID:{" "}
                                        <span className="font-medium text-foreground">{data.billed_to.customer_id}</span>
                                    </p>
                                    <p className="text-secondary">{data.billed_to.address}</p>
                                    <p className="text-secondary">Phone: {data.billed_to.phone}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-foreground">Rincian Item</h2>
                            <p className="text-sm text-secondary">{data.items.length} baris</p>
                        </div>

                        <SyncedHorizontalTable>
                            <table className="w-max min-w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/60 text-secondary">
                                        <th className="whitespace-nowrap px-4 py-3 font-semibold">No</th>
                                        <th className="min-w-[320px] whitespace-nowrap px-4 py-3 font-semibold">
                                            Description
                                        </th>
                                        <th className="min-w-[140px] whitespace-nowrap px-4 py-3 text-right font-semibold">
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-10 text-center text-secondary">
                                                Tidak ada item.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.items.map((it) => (
                                            <tr
                                                key={`${it.no}-${it.description}`}
                                                className="border-b border-border/80 hover:bg-muted/30"
                                            >
                                                <td className="whitespace-nowrap px-4 py-3 text-secondary">{it.no}</td>
                                                <td className="px-4 py-3">{it.description}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                                                    {formatMoney(it.amount)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </SyncedHorizontalTable>

                        <div className="rounded-[var(--radius-card)] border border-border bg-white p-5">
                            <h3 className="text-base font-semibold text-foreground">Ringkasan</h3>
                            <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                                <table className="w-full border-collapse text-sm">
                                    <tbody>
                                        {[
                                            ["Gross Total", data.summary.gross_total],
                                            ["Discount", data.summary.discount],
                                            ["Total After Discount", data.summary.total_after_discount],
                                            ["Tax Base", data.summary.tax_base],
                                            ["VAT", data.summary.vat],
                                            ["Insurance", data.summary.insurance],
                                            ["Stamp", data.summary.stamp],
                                        ].map(([label, value]) => (
                                            <tr key={String(label)} className="border-b border-border/80">
                                                <td className="px-4 py-3 font-semibold text-foreground">{label}</td>
                                                <td className="w-[80px] px-4 py-3 text-right font-semibold text-secondary">
                                                    Rp.
                                                </td>
                                                <td className="w-[180px] px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                                                    {formatMoney(Number(value))}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-amber-500/15">
                                            <td className="px-4 py-3 font-semibold text-foreground">Total Paid</td>
                                            <td className="px-4 py-3 text-right font-semibold text-secondary">Rp.</td>
                                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                                                {formatMoney(data.summary.total_paid)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 font-semibold text-foreground">Be Regarded As:</td>
                                            <td colSpan={2} className="px-4 py-3 text-secondary">
                                                {data.summary.be_regarded_as || "—"}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}

