"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import { CABANG_OPTIONS } from "@/components/dashboard/v2/alc/cabang";
import {
    loadCabangAgenRecords,
    saveCabangAgenRecords,
    type CabangAgenEntityType,
    type CabangAgenRecord,
} from "@/components/dashboard/v2/alc/cabangAgenStorage";

type EntityType = CabangAgenEntityType;

type FormState = {
    tipe: EntityType;
    nama: string;
    owner: string;
    bank: string;
    noRekening: string;
    namaPemilikRekening: string;
};

type ColumnFilters = {
    tipe: string;
    nama: string;
    owner: string;
    bank: string;
    noRekening: string;
    namaPemilikRekening: string;
};

type OpenFilter = {
    key: keyof ColumnFilters;
    label: string;
    options: string[];
    x: number;
    y: number;
};

const ALL = "";

const emptyForm = (): FormState => ({
    tipe: "Cabang",
    nama: CABANG_OPTIONS[0],
    owner: "",
    bank: "",
    noRekening: "",
    namaPemilikRekening: "",
});

const emptyColumnFilters = (): ColumnFilters => ({
    tipe: ALL,
    nama: ALL,
    owner: ALL,
    bank: ALL,
    noRekening: ALL,
    namaPemilikRekening: ALL,
});

function loadRecords(): CabangAgenRecord[] {
    return loadCabangAgenRecords();
}

function saveRecords(records: CabangAgenRecord[]) {
    saveCabangAgenRecords(records);
}

function uniqueSorted(values: string[]) {
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "id", { sensitivity: "base" })
    );
}

export default function DataCabangAgenPage() {
    const [records, setRecords] = useState<CabangAgenRecord[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>(emptyColumnFilters);
    const [openFilter, setOpenFilter] = useState<OpenFilter | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setRecords(loadRecords());
            setHydrated(true);
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        saveRecords(records);
    }, [records, hydrated]);

    useEffect(() => {
        const close = () => setOpenFilter(null);
        window.addEventListener("resize", close);
        window.addEventListener("scroll", close, true);
        return () => {
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", close, true);
        };
    }, []);

    const filterOptions = useMemo(
        () => ({
            tipe: uniqueSorted(records.map((r) => r.tipe)),
            nama: uniqueSorted(records.map((r) => r.nama)),
            owner: uniqueSorted(records.map((r) => r.owner)),
            bank: uniqueSorted(records.map((r) => r.bank)),
            noRekening: uniqueSorted(records.map((r) => r.noRekening)),
            namaPemilikRekening: uniqueSorted(records.map((r) => r.namaPemilikRekening)),
        }),
        [records]
    );

    const filteredRecords = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        return records.filter((row) => {
            if (columnFilters.tipe && row.tipe !== columnFilters.tipe) return false;
            if (columnFilters.nama && row.nama !== columnFilters.nama) return false;
            if (columnFilters.owner && row.owner !== columnFilters.owner) return false;
            if (columnFilters.bank && row.bank !== columnFilters.bank) return false;
            if (columnFilters.noRekening && row.noRekening !== columnFilters.noRekening) return false;
            if (
                columnFilters.namaPemilikRekening &&
                row.namaPemilikRekening !== columnFilters.namaPemilikRekening
            ) {
                return false;
            }

            if (!q) return true;

            const haystack = [
                row.tipe,
                row.nama,
                row.owner,
                row.bank,
                row.noRekening,
                row.namaPemilikRekening,
            ]
                .join(" ")
                .toLowerCase();

            return haystack.includes(q);
        });
    }, [records, searchTerm, columnFilters]);

    const hasActiveFilters =
        Boolean(searchTerm.trim()) || Object.values(columnFilters).some((v) => Boolean(v));

    const clearFilters = () => {
        setSearchTerm("");
        setColumnFilters(emptyColumnFilters());
        setOpenFilter(null);
    };

    const applyColumnFilter = (key: keyof ColumnFilters, value: string) => {
        setColumnFilters((prev) => ({ ...prev, [key]: value }));
        setOpenFilter(null);
    };

    const openAddModal = () => {
        setEditingId(null);
        setForm(emptyForm());
        setError(null);
        setModalOpen(true);
    };

    const openEditModal = (record: CabangAgenRecord) => {
        setEditingId(record.id);
        setForm({
            tipe: record.tipe,
            nama: record.nama,
            owner: record.owner,
            bank: record.bank,
            noRekening: record.noRekening,
            namaPemilikRekening: record.namaPemilikRekening,
        });
        setError(null);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setError(null);
    };

    const handleDelete = (record: CabangAgenRecord) => {
        const confirmed = window.confirm(
            `Hapus data ${record.tipe} "${record.nama}"? Tindakan ini tidak dapat dibatalkan.`
        );
        if (!confirmed) return;
        setRecords((prev) => prev.filter((r) => r.id !== record.id));
    };

    const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => {
            if (key === "tipe") {
                const nextTipe = value as EntityType;
                return {
                    ...prev,
                    tipe: nextTipe,
                    nama: nextTipe === "Cabang" ? CABANG_OPTIONS[0] : "",
                };
            }
            return { ...prev, [key]: value };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const nama = form.nama.trim();
        const owner = form.owner.trim();
        const bank = form.bank.trim();
        const noRekening = form.noRekening.trim();
        const namaPemilikRekening = form.namaPemilikRekening.trim();

        if (!nama || !owner || !bank || !noRekening || !namaPemilikRekening) {
            setError("Semua field wajib diisi.");
            return;
        }

        if (editingId) {
            setRecords((prev) =>
                prev.map((r) =>
                    r.id === editingId
                        ? {
                              ...r,
                              tipe: form.tipe,
                              nama,
                              owner,
                              bank,
                              noRekening,
                              namaPemilikRekening,
                          }
                        : r
                )
            );
        } else {
            const next: CabangAgenRecord = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                tipe: form.tipe,
                nama,
                owner,
                bank,
                noRekening,
                namaPemilikRekening,
            };
            setRecords((prev) => [next, ...prev]);
        }

        closeModal();
    };

    const toggleFilterMenu = (
        e: React.MouseEvent<HTMLButtonElement>,
        key: keyof ColumnFilters,
        label: string,
        options: string[]
    ) => {
        if (openFilter?.key === key) {
            setOpenFilter(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        setOpenFilter({ key, label, options, x: rect.left, y: rect.bottom + 4 });
    };

    const headerCell = (key: keyof ColumnFilters, label: string, options: string[]) => {
        const active = Boolean(columnFilters[key]);
        return (
            <th className="border border-border px-3 py-2 font-semibold">
                <div className="flex items-center justify-between gap-2">
                    <span className="whitespace-nowrap">{label}</span>
                    <button
                        type="button"
                        onClick={(e) => toggleFilterMenu(e, key, label, options)}
                        title={active ? `Filter: ${columnFilters[key]}` : `Filter ${label}`}
                        aria-label={`Filter ${label}`}
                        className={`inline-flex size-5 shrink-0 items-center justify-center rounded transition ${
                            active
                                ? "bg-primary text-primary-foreground"
                                : "text-secondary hover:bg-black/5 hover:text-foreground"
                        }`}
                    >
                        <ChevronDown className="size-3.5" aria-hidden />
                    </button>
                </div>
            </th>
        );
    };

    return (
        <>
            <DashboardLayout>
                <div className="flex flex-col gap-6 p-6 lg:p-10">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Data Cabang/Agen</h1>
                            <p className="mt-2 text-sm text-secondary">
                                Kelola data cabang dan agen beserta informasi rekening.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={openAddModal}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                        >
                            <Plus className="size-4" aria-hidden />
                            Tambah Data
                        </button>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full sm:max-w-md">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Cari tipe, nama, owner, bank, rekening..."
                                className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-4 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div className="flex items-center gap-3 text-sm text-secondary">
                            <span>
                                Menampilkan {filteredRecords.length} dari {records.length} data
                            </span>
                            {hasActiveFilters ? (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="font-semibold text-foreground underline-offset-2 hover:underline"
                                >
                                    Reset filter
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                            <thead>
                                <tr className="bg-muted text-foreground">
                                    {headerCell("tipe", "Tipe", filterOptions.tipe)}
                                    {headerCell("nama", "Cabang / Agen", filterOptions.nama)}
                                    {headerCell("owner", "Owner", filterOptions.owner)}
                                    {headerCell("bank", "Bank", filterOptions.bank)}
                                    {headerCell("noRekening", "No. Rekening", filterOptions.noRekening)}
                                    {headerCell(
                                        "namaPemilikRekening",
                                        "Nama Pemilik Rekening",
                                        filterOptions.namaPemilikRekening
                                    )}
                                    <th className="whitespace-nowrap border border-border px-3 py-2 font-semibold">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="border border-border px-4 py-10 text-center text-secondary"
                                        >
                                            Belum ada data. Klik Tambah Data untuk menambah.
                                        </td>
                                    </tr>
                                ) : filteredRecords.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="border border-border px-4 py-10 text-center text-secondary"
                                        >
                                            Tidak ada data yang cocok dengan pencarian/filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRecords.map((row) => (
                                        <tr key={row.id} className="hover:bg-muted/40">
                                            <td className="border border-border px-3 py-2">{row.tipe}</td>
                                            <td className="border border-border px-3 py-2">{row.nama}</td>
                                            <td className="border border-border px-3 py-2">{row.owner}</td>
                                            <td className="border border-border px-3 py-2">{row.bank}</td>
                                            <td className="border border-border px-3 py-2">{row.noRekening}</td>
                                            <td className="border border-border px-3 py-2">
                                                {row.namaPemilikRekening}
                                            </td>
                                            <td className="border border-border px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(row)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                                                    >
                                                        <Pencil className="size-3.5" aria-hidden />
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(row)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                                    >
                                                        <Trash2 className="size-3.5" aria-hidden />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </DashboardLayout>

            {openFilter && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpenFilter(null)}
                        aria-hidden
                    />
                    <div
                        role="menu"
                        style={{ left: openFilter.x, top: openFilter.y }}
                        className="fixed z-50 max-h-72 w-56 overflow-y-auto rounded-xl border border-border bg-white py-1 shadow-lg"
                    >
                        <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">
                            {openFilter.label}
                        </p>
                        <button
                            type="button"
                            onClick={() => applyColumnFilter(openFilter.key, ALL)}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
                        >
                            <span>(Semua)</span>
                            {!columnFilters[openFilter.key] ? (
                                <Check className="size-4 text-primary" aria-hidden />
                            ) : null}
                        </button>
                        {openFilter.options.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-secondary">Belum ada pilihan.</p>
                        ) : (
                            openFilter.options.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => applyColumnFilter(openFilter.key, opt)}
                                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
                                >
                                    <span className="truncate">{opt}</span>
                                    {columnFilters[openFilter.key] === opt ? (
                                        <Check className="size-4 shrink-0 text-primary" aria-hidden />
                                    ) : null}
                                </button>
                            ))
                        )}
                    </div>
                </>
            )}

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cabang-agen-modal-title"
                        className="w-full max-w-lg rounded-[var(--radius-card)] border border-border bg-white shadow-lg"
                    >
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <h2 id="cabang-agen-modal-title" className="text-base font-semibold text-foreground">
                                {editingId ? "Edit Data Cabang/Agen" : "Tambah Data Cabang/Agen"}
                            </h2>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-lg p-1.5 text-secondary transition hover:bg-muted hover:text-foreground"
                                aria-label="Tutup"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
                            <fieldset className="flex flex-col gap-2">
                                <legend className="text-sm font-semibold text-foreground">Pilihan</legend>
                                <div className="flex flex-wrap gap-4">
                                    {(["Cabang", "Agen"] as const).map((tipe) => (
                                        <label key={tipe} className="inline-flex cursor-pointer items-center gap-2 text-sm">
                                            <input
                                                type="radio"
                                                name="tipe"
                                                value={tipe}
                                                checked={form.tipe === tipe}
                                                onChange={() => updateField("tipe", tipe)}
                                                className="size-4 accent-primary"
                                            />
                                            <span className="font-medium text-foreground">{tipe}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-foreground">{form.tipe}</span>
                                {form.tipe === "Cabang" ? (
                                    <select
                                        value={form.nama}
                                        onChange={(e) => updateField("nama", e.target.value)}
                                        className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                                    >
                                        {CABANG_OPTIONS.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={form.nama}
                                        onChange={(e) => updateField("nama", e.target.value)}
                                        placeholder="Nama agen"
                                        className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                                    />
                                )}
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-foreground">Owner</span>
                                <input
                                    type="text"
                                    value={form.owner}
                                    onChange={(e) => updateField("owner", e.target.value)}
                                    className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                                />
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-foreground">Bank</span>
                                <input
                                    type="text"
                                    value={form.bank}
                                    onChange={(e) => updateField("bank", e.target.value)}
                                    className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                                />
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-foreground">No. Rekening</span>
                                <input
                                    type="text"
                                    value={form.noRekening}
                                    onChange={(e) => updateField("noRekening", e.target.value)}
                                    className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                                />
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-foreground">Nama Pemilik Rekening</span>
                                <input
                                    type="text"
                                    value={form.namaPemilikRekening}
                                    onChange={(e) => updateField("namaPemilikRekening", e.target.value)}
                                    className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                                />
                            </label>

                            {error ? <p className="text-sm text-red-600">{error}</p> : null}

                            <div className="mt-1 flex justify-end gap-2 border-t border-border pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-secondary transition hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                                >
                                    {editingId ? "Simpan Perubahan" : "Simpan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
