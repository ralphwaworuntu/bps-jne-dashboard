"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import SyncedHorizontalTable from "@/components/dashboard/v2/SyncedHorizontalTable";
import { ChevronDown, Plus, UserRound, Phone, MapPin, BriefcaseBusiness, Loader2, X } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { createCandidate, listCandidates, type HCCandidate } from "@/lib/hcApi";

type CandidateStatus = "Baru" | "Screening" | "Interview" | "Offer" | "Diterima" | "Ditolak";

type Candidate = {
    id: string;
    nama: string;
    posisi: string;
    cabang: string;
    noHp: string;
    tanggalDaftar: string;
    status: CandidateStatus;
    sumber: "Walk-in" | "Referral" | "Job Portal" | "Internal";
};

type SelectAll = "";

function mapCandidateFromServer(r: HCCandidate): Candidate {
    const d = new Date(r.created_at);
    const tanggalDaftar = Number.isNaN(d.getTime())
        ? r.created_at
        : d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
    return {
        id: String(r.id),
        nama: r.nama,
        posisi: r.posisi,
        cabang: r.cabang,
        noHp: r.no_hp,
        tanggalDaftar,
        status: r.status as CandidateStatus,
        sumber: (r.sumber as Candidate["sumber"]) ?? "Internal",
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

export default function KelolaCalonKaryawanPage() {
    const router = useRouter();
    const { showToast } = useToast();

    const [rows, setRows] = useState<Candidate[]>([]);
    const [filters, setFilters] = useState({
        status: "" as SelectAll | CandidateStatus,
        posisi: "" as SelectAll | string,
        cabang: "" as SelectAll | string,
        sumber: "" as SelectAll | Candidate["sumber"],
    });
    const [loadingList, setLoadingList] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        nama: "",
        posisi: "",
        cabang: "",
        no_hp: "",
        email: "",
        alamat: "",
        tanggal_lahir: "",
        pendidikan_terakhir: "",
        pengalaman_singkat: "",
        sumber: "Internal",
        status: "Baru",
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
                const data = await listCandidates(token);
                if (cancelled) return;
                setRows(data.map(mapCandidateFromServer));
            } catch (e) {
                showToast(
                    `Gagal memuat calon karyawan: ${e instanceof Error ? e.message : "error"}`,
                    "error"
                );
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
            status: uniqueOptions(rows.map((r) => r.status)) as CandidateStatus[],
            posisi: uniqueOptions(rows.map((r) => r.posisi)),
            cabang: uniqueOptions(rows.map((r) => r.cabang)),
            sumber: uniqueOptions(rows.map((r) => r.sumber)) as Candidate["sumber"][],
        };
    }, [rows]);

    const filtered = useMemo(() => {
        return rows.filter((r) => {
            return (
                (filters.status === "" || r.status === filters.status) &&
                (filters.posisi === "" || r.posisi === filters.posisi) &&
                (filters.cabang === "" || r.cabang === filters.cabang) &&
                (filters.sumber === "" || r.sumber === filters.sumber)
            );
        });
    }, [rows, filters]);

    const submit = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            showToast("Tidak ada token login.", "error");
            return;
        }
        if (!form.nama.trim() || !form.posisi.trim() || !form.cabang.trim() || !form.no_hp.trim()) {
            showToast("Lengkapi field wajib: Nama, Posisi, Cabang, No. HP.", "error");
            return;
        }
        setSubmitting(true);
        try {
            const rec = await createCandidate(token, {
                nama: form.nama.trim(),
                posisi: form.posisi.trim(),
                cabang: form.cabang.trim(),
                no_hp: form.no_hp.trim(),
                email: form.email.trim() || null,
                alamat: form.alamat.trim() || null,
                tanggal_lahir: form.tanggal_lahir.trim() || null,
                pendidikan_terakhir: form.pendidikan_terakhir.trim() || null,
                pengalaman_singkat: form.pengalaman_singkat.trim() || null,
                sumber: form.sumber,
                status: form.status,
                catatan: form.catatan.trim() || null,
            });
            setRows((prev) => [mapCandidateFromServer(rec), ...prev]);
            setShowForm(false);
            setForm({
                nama: "",
                posisi: "",
                cabang: "",
                no_hp: "",
                email: "",
                alamat: "",
                tanggal_lahir: "",
                pendidikan_terakhir: "",
                pengalaman_singkat: "",
                sumber: "Internal",
                status: "Baru",
                catatan: "",
            });
            showToast("Pengajuan calon karyawan tersimpan.", "success");
        } catch (e) {
            showToast(
                `Gagal simpan calon karyawan: ${e instanceof Error ? e.message : "error"}`,
                "error"
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 p-6 lg:p-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Kelola Calon Karyawan</h1>
                        <p className="mt-2 text-sm text-secondary">
                            Pantau kandidat, filter per status/posisi/cabang, dan kelola pipeline rekrutmen.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                    >
                        <Plus className="size-4" aria-hidden />
                        Tambah
                    </button>
                </div>

                {showForm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
                        <div className="flex w-full max-w-2xl max-h-[82vh] flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-border px-5 py-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                                        Form
                                    </p>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        Pengajuan karyawan baru
                                    </h3>
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

                            <div className="flex-1 overflow-y-auto p-5">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <label className="flex flex-col gap-1 text-sm">
                                    <span className="font-semibold text-foreground">Nama *</span>
                                    <input
                                        value={form.nama}
                                        onChange={(e) => setForm((p) => ({ ...p, nama: e.target.value }))}
                                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="Nama lengkap"
                                    />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                    <span className="font-semibold text-foreground">No. HP *</span>
                                    <input
                                        value={form.no_hp}
                                        onChange={(e) => setForm((p) => ({ ...p, no_hp: e.target.value }))}
                                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="08xx-xxxx-xxxx"
                                    />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                    <span className="font-semibold text-foreground">Posisi *</span>
                                    <input
                                        value={form.posisi}
                                        onChange={(e) => setForm((p) => ({ ...p, posisi: e.target.value }))}
                                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="Kurir / Admin / ..."
                                    />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                    <span className="font-semibold text-foreground">Cabang *</span>
                                    <input
                                        value={form.cabang}
                                        onChange={(e) => setForm((p) => ({ ...p, cabang: e.target.value }))}
                                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="Jakarta Barat / Bandung / ..."
                                    />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                    <span className="font-semibold text-foreground">Email</span>
                                    <input
                                        value={form.email}
                                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="nama@email.com"
                                    />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                    <span className="font-semibold text-foreground">Tanggal lahir</span>
                                    <input
                                        value={form.tanggal_lahir}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, tanggal_lahir: e.target.value }))
                                        }
                                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="contoh: 1998-01-30"
                                    />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm md:col-span-2">
                                    <span className="font-semibold text-foreground">Alamat</span>
                                    <textarea
                                        value={form.alamat}
                                        onChange={(e) => setForm((p) => ({ ...p, alamat: e.target.value }))}
                                        className="min-h-[80px] rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="Alamat lengkap"
                                    />
                                    </label>
                                </div>

                                <div className="my-5 h-px w-full bg-border" />

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <label className="flex flex-col gap-1 text-sm">
                                    <span className="font-semibold text-foreground">Pendidikan terakhir</span>
                                    <input
                                        value={form.pendidikan_terakhir}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, pendidikan_terakhir: e.target.value }))
                                        }
                                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="SMA / D3 / S1 / ..."
                                    />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                    <span className="font-semibold text-foreground">Pengalaman singkat</span>
                                    <input
                                        value={form.pengalaman_singkat}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, pengalaman_singkat: e.target.value }))
                                        }
                                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="Ringkas 1-2 kalimat"
                                    />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                    <span className="font-semibold text-foreground">Sumber</span>
                                    <select
                                        value={form.sumber}
                                        onChange={(e) => setForm((p) => ({ ...p, sumber: e.target.value }))}
                                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                    >
                                        <option value="Internal">Internal</option>
                                        <option value="Walk-in">Walk-in</option>
                                        <option value="Referral">Referral</option>
                                        <option value="Job Portal">Job Portal</option>
                                    </select>
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                    <span className="font-semibold text-foreground">Status</span>
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                    >
                                        <option value="Baru">Baru</option>
                                        <option value="Screening">Screening</option>
                                        <option value="Interview">Interview</option>
                                        <option value="Offer">Offer</option>
                                        <option value="Diterima">Diterima</option>
                                        <option value="Ditolak">Ditolak</option>
                                    </select>
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm md:col-span-2">
                                    <span className="font-semibold text-foreground">Catatan (opsional)</span>
                                    <textarea
                                        value={form.catatan}
                                        onChange={(e) => setForm((p) => ({ ...p, catatan: e.target.value }))}
                                        className="min-h-[80px] rounded-xl border border-border bg-white px-4 py-3 text-sm"
                                        placeholder="Catatan tambahan"
                                    />
                                    </label>
                                </div>
                            </div>

                            <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border bg-white px-5 py-4">
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

                <div className="grid grid-cols-1 gap-4 rounded-[var(--radius-card)] border border-border bg-white p-4 lg:grid-cols-4">
                    <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3">
                        <UserRound className="size-5 text-primary" aria-hidden />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Total kandidat</p>
                            <p className="text-lg font-semibold text-foreground">{rows.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3">
                        <BriefcaseBusiness className="size-5 text-primary" aria-hidden />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Posisi</p>
                            <p className="text-lg font-semibold text-foreground">{options.posisi.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3">
                        <MapPin className="size-5 text-primary" aria-hidden />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Cabang</p>
                            <p className="text-lg font-semibold text-foreground">{options.cabang.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3">
                        <Phone className="size-5 text-primary" aria-hidden />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Tersaring</p>
                            <p className="text-lg font-semibold text-foreground">{filtered.length}</p>
                        </div>
                    </div>
                </div>

                <SyncedHorizontalTable>
                    <table className="w-max min-w-full border-collapse text-left text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/60 text-secondary">
                                <th className="whitespace-nowrap px-4 py-3 font-semibold">No</th>
                                <th className="min-w-[220px] whitespace-nowrap px-4 py-3 font-semibold">Nama</th>
                                <th className="whitespace-nowrap px-4 py-3 font-semibold">
                                    <div className="flex items-center gap-2">
                                        <span>Status</span>
                                        <HeaderArrowSelect
                                            value={filters.status}
                                            onChange={(v) => setFilters((p) => ({ ...p, status: v as CandidateStatus }))}
                                            options={options.status}
                                            ariaLabel="Filter Status"
                                        />
                                    </div>
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 font-semibold">
                                    <div className="flex items-center gap-2">
                                        <span>Posisi</span>
                                        <HeaderArrowSelect
                                            value={filters.posisi}
                                            onChange={(v) => setFilters((p) => ({ ...p, posisi: v }))}
                                            options={options.posisi}
                                            ariaLabel="Filter Posisi"
                                        />
                                    </div>
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 font-semibold">
                                    <div className="flex items-center gap-2">
                                        <span>Cabang</span>
                                        <HeaderArrowSelect
                                            value={filters.cabang}
                                            onChange={(v) => setFilters((p) => ({ ...p, cabang: v }))}
                                            options={options.cabang}
                                            ariaLabel="Filter Cabang"
                                        />
                                    </div>
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 font-semibold">
                                    <div className="flex items-center gap-2">
                                        <span>Sumber</span>
                                        <HeaderArrowSelect
                                            value={filters.sumber}
                                            onChange={(v) => setFilters((p) => ({ ...p, sumber: v as Candidate["sumber"] }))}
                                            options={options.sumber}
                                            ariaLabel="Filter Sumber"
                                        />
                                    </div>
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 font-semibold">No. HP</th>
                                <th className="whitespace-nowrap px-4 py-3 font-semibold">Tgl daftar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingList ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-secondary">
                                        Memuat…
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-secondary">
                                        Tidak ada data yang cocok dengan filter.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((r, i) => (
                                    <tr key={r.id} className="border-b border-border/80 hover:bg-muted/30">
                                        <td className="whitespace-nowrap px-4 py-3 text-secondary">{i + 1}</td>
                                        <td className="px-4 py-3 font-medium text-foreground">{r.nama}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{r.status}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{r.posisi}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{r.cabang}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{r.sumber}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{r.noHp}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{r.tanggalDaftar}</td>
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

