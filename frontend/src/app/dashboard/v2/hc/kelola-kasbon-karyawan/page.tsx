"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import SyncedHorizontalTable from "@/components/dashboard/v2/SyncedHorizontalTable";
import { ChevronDown, Plus, Wallet, BadgeCheck, BadgeX, Calendar, Loader2, X } from "lucide-react";
import { createKasbon, listKasbon, type HCKasbon } from "@/lib/hcApi";
import { useToast } from "@/context/ToastContext";

type KasbonStatus = "Diajukan" | "Disetujui" | "Ditolak" | "Lunas";

type KasbonRow = {
    id: string;
    namaKaryawan: string;
    nik: string;
    divisi: string;
    nominal: string;
    sisa: string;
    tenor: string;
    tanggalPengajuan: string;
    status: KasbonStatus;
};

type SelectAll = "";

function mapKasbonFromServer(r: HCKasbon): KasbonRow {
    const tanggal = new Date(r.tanggal_pengajuan);
    const tanggalPengajuan = Number.isNaN(tanggal.getTime())
        ? r.tanggal_pengajuan
        : tanggal.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
    return {
        id: String(r.id),
        namaKaryawan: r.nama_karyawan,
        nik: r.nik,
        divisi: r.divisi,
        nominal: r.nominal.toLocaleString("id-ID"),
        sisa: r.sisa.toLocaleString("id-ID"),
        tenor: `${r.tenor_bulan} bulan`,
        tanggalPengajuan,
        status: r.status as KasbonStatus,
    };
}

function uniqueOptions(values: string[], max = 250) {
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
}

function HeaderArrowSelect({
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
    return (
        <span className="relative inline-flex items-center">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={ariaLabel}
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
            {value !== "" && <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-primary" aria-hidden />}
        </span>
    );
}

export default function KelolaKasbonKaryawanPage() {
    const router = useRouter();
    const { showToast } = useToast();

    const [rows, setRows] = useState<KasbonRow[]>([]);
    const [filters, setFilters] = useState({
        status: "" as SelectAll | KasbonStatus,
        divisi: "" as SelectAll | string,
    });
    const [loadingList, setLoadingList] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        nama_karyawan: "",
        nik: "",
        divisi: "",
        nominal: "",
        tenor_bulan: "3",
        alasan: "",
        catatan: "",
    });

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) router.push("/");
    }, [router]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        let cancelled = false;
        setLoadingList(true);
        (async () => {
            try {
                const data = await listKasbon(token);
                if (cancelled) return;
                setRows(data.map(mapKasbonFromServer));
            } catch (e) {
                showToast(`Gagal memuat data kasbon: ${e instanceof Error ? e.message : "error"}`, "error");
            } finally {
                if (!cancelled) setLoadingList(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [showToast]);

    const options = useMemo(() => {
        return {
            status: uniqueOptions(rows.map((r) => r.status)) as KasbonStatus[],
            divisi: uniqueOptions(rows.map((r) => r.divisi)),
        };
    }, [rows]);

    const filtered = useMemo(() => {
        return rows.filter((r) => {
            return (filters.status === "" || r.status === filters.status) && (filters.divisi === "" || r.divisi === filters.divisi);
        });
    }, [rows, filters]);

    const totals = useMemo(() => {
        const parse = (s: string) => Number(String(s).replace(/[^\d]/g, "")) || 0;
        const totalNominal = rows.reduce((a, r) => a + parse(r.nominal), 0);
        const totalSisa = rows.reduce((a, r) => a + parse(r.sisa), 0);
        return {
            totalNominal: totalNominal.toLocaleString("id-ID"),
            totalSisa: totalSisa.toLocaleString("id-ID"),
        };
    }, [rows]);

    const submit = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            showToast("Tidak ada token login.", "error");
            return;
        }
        const nominalInt = Number(String(form.nominal).replace(/[^\d]/g, ""));
        const tenorInt = Number(String(form.tenor_bulan).replace(/[^\d]/g, ""));
        if (!form.nama_karyawan.trim() || !form.nik.trim() || !form.divisi.trim() || !form.alasan.trim()) {
            showToast("Lengkapi field wajib: Nama, NIK, Divisi, Nominal, Tenor, Alasan.", "error");
            return;
        }
        if (!Number.isFinite(nominalInt) || nominalInt <= 0 || !Number.isFinite(tenorInt) || tenorInt <= 0) {
            showToast("Nominal dan Tenor harus valid.", "error");
            return;
        }
        setSubmitting(true);
        try {
            const rec = await createKasbon(token, {
                nama_karyawan: form.nama_karyawan.trim(),
                nik: form.nik.trim(),
                divisi: form.divisi.trim(),
                nominal: nominalInt,
                tenor_bulan: tenorInt,
                alasan: form.alasan.trim(),
                catatan: form.catatan.trim() || null,
            });
            setRows((prev) => [mapKasbonFromServer(rec), ...prev]);
            setShowForm(false);
            setForm({
                nama_karyawan: "",
                nik: "",
                divisi: "",
                nominal: "",
                tenor_bulan: "3",
                alasan: "",
                catatan: "",
            });
            showToast("Pengajuan kasbon tersimpan.", "success");
        } catch (e) {
            showToast(`Gagal simpan kasbon: ${e instanceof Error ? e.message : "error"}`, "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 p-6 lg:p-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Kelola Kasbon Karyawan</h1>
                        <p className="mt-2 text-sm text-secondary">
                            Kelola pengajuan kasbon, pantau sisa cicilan, dan filter per status/divisi.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                    >
                        <Plus className="size-4" aria-hidden />
                        Buat pengajuan
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-[var(--radius-card)] border border-border bg-white p-4 lg:grid-cols-4">
                    <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3">
                        <Wallet className="size-5 text-primary" aria-hidden />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Total kasbon</p>
                            <p className="text-lg font-semibold text-foreground">{totals.totalNominal}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3">
                        <Calendar className="size-5 text-primary" aria-hidden />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Total sisa</p>
                            <p className="text-lg font-semibold text-foreground">{totals.totalSisa}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3">
                        <BadgeCheck className="size-5 text-primary" aria-hidden />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Disetujui</p>
                            <p className="text-lg font-semibold text-foreground">
                                {rows.filter((r) => r.status === "Disetujui").length}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3">
                        <BadgeX className="size-5 text-primary" aria-hidden />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Diajukan</p>
                            <p className="text-lg font-semibold text-foreground">
                                {rows.filter((r) => r.status === "Diajukan").length}
                            </p>
                        </div>
                    </div>
                </div>

                {showForm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-2xl rounded-[var(--radius-card)] border border-border bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-border px-5 py-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                                        Form
                                    </p>
                                    <h3 className="text-lg font-semibold text-foreground">Pengajuan kasbon</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="rounded-xl border border-border bg-white p-2 text-secondary transition hover:bg-muted"
                                    aria-label="Tutup"
                                >
                                    <X className="size-5" aria-hidden />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                                <label className="flex flex-col gap-1 text-sm">
                                    <span className="font-semibold text-foreground">Nama karyawan *</span>
                                    <input
                                        value={form.nama_karyawan}
                                        onChange={(e) => setForm((p) => ({ ...p, nama_karyawan: e.target.value }))}
                                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="Nama lengkap"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span className="font-semibold text-foreground">NIK *</span>
                                    <input
                                        value={form.nik}
                                        onChange={(e) => setForm((p) => ({ ...p, nik: e.target.value }))}
                                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="EMP-xxxx"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span className="font-semibold text-foreground">Divisi *</span>
                                    <input
                                        value={form.divisi}
                                        onChange={(e) => setForm((p) => ({ ...p, divisi: e.target.value }))}
                                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="Operasional / Finance / ..."
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span className="font-semibold text-foreground">Nominal (Rp) *</span>
                                    <input
                                        inputMode="numeric"
                                        value={form.nominal}
                                        onChange={(e) => setForm((p) => ({ ...p, nominal: e.target.value }))}
                                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="contoh: 2000000"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span className="font-semibold text-foreground">Tenor (bulan) *</span>
                                    <input
                                        inputMode="numeric"
                                        value={form.tenor_bulan}
                                        onChange={(e) => setForm((p) => ({ ...p, tenor_bulan: e.target.value }))}
                                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="contoh: 3"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm md:col-span-2">
                                    <span className="font-semibold text-foreground">Alasan *</span>
                                    <textarea
                                        value={form.alasan}
                                        onChange={(e) => setForm((p) => ({ ...p, alasan: e.target.value }))}
                                        className="min-h-[100px] rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="Jelaskan kebutuhan kasbon"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm md:col-span-2">
                                    <span className="font-semibold text-foreground">Catatan (opsional)</span>
                                    <textarea
                                        value={form.catatan}
                                        onChange={(e) => setForm((p) => ({ ...p, catatan: e.target.value }))}
                                        className="min-h-[80px] rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="Tambahan informasi"
                                    />
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={submit}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
                                >
                                    {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                                    Simpan
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <SyncedHorizontalTable>
                    <table className="w-max min-w-full border-collapse text-left text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/60 text-secondary">
                                <th className="whitespace-nowrap px-4 py-3 font-semibold">No</th>
                                <th className="min-w-[200px] whitespace-nowrap px-4 py-3 font-semibold">Nama</th>
                                <th className="whitespace-nowrap px-4 py-3 font-semibold">NIK</th>
                                <th className="whitespace-nowrap px-4 py-3 font-semibold">
                                    <div className="flex items-center gap-2">
                                        <span>Divisi</span>
                                        <HeaderArrowSelect
                                            value={filters.divisi}
                                            onChange={(v) => setFilters((p) => ({ ...p, divisi: v }))}
                                            options={options.divisi}
                                            ariaLabel="Filter Divisi"
                                        />
                                    </div>
                                </th>
                                <th className="min-w-[140px] whitespace-nowrap px-4 py-3 text-right font-semibold">
                                    Nominal
                                </th>
                                <th className="min-w-[140px] whitespace-nowrap px-4 py-3 text-right font-semibold">
                                    Sisa
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 font-semibold">Tenor</th>
                                <th className="whitespace-nowrap px-4 py-3 font-semibold">Tgl pengajuan</th>
                                <th className="whitespace-nowrap px-4 py-3 font-semibold">
                                    <div className="flex items-center gap-2">
                                        <span>Status</span>
                                        <HeaderArrowSelect
                                            value={filters.status}
                                            onChange={(v) => setFilters((p) => ({ ...p, status: v as KasbonStatus }))}
                                            options={options.status}
                                            ariaLabel="Filter Status"
                                        />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingList ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-10 text-center text-secondary">
                                        Memuat…
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-10 text-center text-secondary">
                                        Tidak ada data yang cocok dengan filter.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((r, i) => (
                                    <tr key={r.id} className="border-b border-border/80 hover:bg-muted/30">
                                        <td className="whitespace-nowrap px-4 py-3 text-secondary">{i + 1}</td>
                                        <td className="px-4 py-3 font-medium text-foreground">{r.namaKaryawan}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{r.nik}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{r.divisi}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{r.nominal}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{r.sisa}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{r.tenor}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{r.tanggalPengajuan}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{r.status}</td>
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

