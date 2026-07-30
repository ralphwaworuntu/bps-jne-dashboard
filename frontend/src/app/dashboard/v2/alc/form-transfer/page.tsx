"use client";

import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import Image from "next/image";
import { ChevronDown, FileText, Pencil, Save, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import {
    loadCabangAgenRecords,
    type CabangAgenEntityType,
    type CabangAgenRecord,
} from "@/components/dashboard/v2/alc/cabangAgenStorage";
import { formatNominalInput, parseNominalDigits, terbilangId } from "@/components/dashboard/v2/alc/terbilang";

type FilterTipe = CabangAgenEntityType;

type FormTransferFields = {
    tanggal: string;
    dept: string;
    penerimaDana: string;
    keperluan: string;
    nominal: string;
    terbilang: string;
    bank: string;
    noRekening: string;
    atasNama: string;
    ditransferDari: string;
    tanggalProses: string;
    oleh: string;
    status: string;
    biayaAdm: string;
};

type FormTransferRecord = FormTransferFields & {
    id: string;
    filterTipe: FilterTipe;
    filterNama: string;
    updatedAt: string;
};

const STORAGE_KEY = "alc-form-transfer";

const BULAN_ID = [
    "JANUARI",
    "FEBRUARI",
    "MARET",
    "APRIL",
    "MEI",
    "JUNI",
    "JULI",
    "AGUSTUS",
    "SEPTEMBER",
    "OKTOBER",
    "NOVEMBER",
    "DESEMBER",
] as const;

/** Periode CTC selalu bulan sebelum tanggal form (mis. tanggal Agustus -> periode Juli). */
function periodeFromTanggal(tanggal: string): string {
    if (!tanggal) return "";
    const d = new Date(`${tanggal}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "";

    const monthIndex = d.getMonth();
    const isJanuary = monthIndex === 0;
    const periodeMonth = isJanuary ? 11 : monthIndex - 1;
    const periodeYear = isJanuary ? d.getFullYear() - 1 : d.getFullYear();

    return `${BULAN_ID[periodeMonth]} ${periodeYear}`;
}

function buildKeperluan(tipe: FilterTipe, nama: string, tanggal: string): string {
    if (!nama) return "";
    const periode = periodeFromTanggal(tanggal);
    const tipeLabel = tipe.toUpperCase();
    const namaLabel = nama.toUpperCase();
    if (!periode) return `CTC ${tipeLabel} ${namaLabel}`;
    return `CTC ${tipeLabel} ${namaLabel} PERIODE ${periode}`;
}

const emptyFields = (): FormTransferFields => ({
    tanggal: new Date().toISOString().slice(0, 10),
    dept: "ALC",
    penerimaDana: "",
    keperluan: "",
    nominal: "",
    terbilang: "",
    bank: "",
    noRekening: "",
    atasNama: "",
    ditransferDari: "",
    tanggalProses: "",
    oleh: "",
    status: "",
    biayaAdm: "",
});

function loadSavedForms(): FormTransferRecord[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as FormTransferRecord[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveSavedForms(records: FormTransferRecord[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function applyEntityToFields(
    entity: CabangAgenRecord | null,
    prev: FormTransferFields,
    filterTipe: FilterTipe,
    filterNama: string
): FormTransferFields {
    const keperluan = buildKeperluan(filterTipe, filterNama || entity?.nama || "", prev.tanggal);

    if (!entity) {
        return {
            ...prev,
            penerimaDana: "",
            keperluan,
            bank: "",
            noRekening: "",
            atasNama: "",
        };
    }
    return {
        ...prev,
        penerimaDana: entity.owner,
        keperluan,
        bank: entity.bank,
        noRekening: entity.noRekening,
        atasNama: entity.namaPemilikRekening,
    };
}

function cellInput(props: InputHTMLAttributes<HTMLInputElement>) {
    const { className = "", ...rest } = props;
    return (
        <input
            {...rest}
            className={`w-full bg-transparent px-1 py-0.5 text-xs text-black outline-none focus:bg-amber-50 ${className}`}
        />
    );
}

export default function FormTransferPage() {
    const [entities, setEntities] = useState<CabangAgenRecord[]>([]);
    const [savedForms, setSavedForms] = useState<FormTransferRecord[]>([]);
    const [hydrated, setHydrated] = useState(false);

    const [filterTipe, setFilterTipe] = useState<FilterTipe>("Cabang");
    const [filterNama, setFilterNama] = useState("");
    const [fields, setFields] = useState<FormTransferFields>(emptyFields);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            const loadedEntities = loadCabangAgenRecords();
            setEntities(loadedEntities);
            setSavedForms(loadSavedForms());
            setHydrated(true);
        }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        saveSavedForms(savedForms);
    }, [savedForms, hydrated]);

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

    const updateField = <K extends keyof FormTransferFields>(key: K, value: FormTransferFields[K]) => {
        setFields((prev) => {
            if (key === "nominal") {
                const formatted = formatNominalInput(String(value));
                return {
                    ...prev,
                    nominal: formatted,
                    terbilang: terbilangId(parseNominalDigits(formatted)),
                };
            }
            if (key === "tanggal") {
                const tanggal = String(value);
                return {
                    ...prev,
                    tanggal,
                    keperluan: buildKeperluan(filterTipe, filterNama, tanggal),
                };
            }
            return { ...prev, [key]: value };
        });
    };

    const onChangeFilterTipe = (tipe: FilterTipe) => {
        setFilterTipe(tipe);
        setFilterNama("");
        setFields(emptyFields());
        setEditingId(null);
        setIsFormOpen(false);
        setMessage(null);
        setError(null);
    };

    const onChangeFilterNama = (nama: string) => {
        setFilterNama(nama);
        const entity = entities.find((e) => e.tipe === filterTipe && e.nama === nama) ?? null;
        setFields((prev) => applyEntityToFields(entity, prev, filterTipe, nama));
        setEditingId(null);
        setIsFormOpen(false);
        setMessage(null);
        setError(null);
    };

    const openNewForm = () => {
        if (!selectedEntity) {
            setError(`Pilih ${filterTipe} terlebih dahulu.`);
            setMessage(null);
            return;
        }
        setEditingId(null);
        setError(null);
        setMessage(null);
        setFields(applyEntityToFields(selectedEntity, emptyFields(), filterTipe, filterNama));
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setEditingId(null);
        setIsFormOpen(false);
        setError(null);
        setMessage(null);
    };

    const handleSave = () => {
        if (!filterNama) {
            setError(`Pilih ${filterTipe} terlebih dahulu dari Data Cabang/Agen.`);
            setMessage(null);
            return;
        }
        if (!fields.penerimaDana.trim() || !fields.keperluan.trim() || !fields.nominal.trim()) {
            setError("Penerima dana, keperluan, dan nominal wajib diisi.");
            setMessage(null);
            return;
        }
        if (!fields.bank.trim() || !fields.noRekening.trim() || !fields.atasNama.trim()) {
            setError("Data rekening belum lengkap. Pastikan Data Cabang/Agen sudah diisi.");
            setMessage(null);
            return;
        }

        const now = new Date().toISOString();
        if (editingId) {
            setSavedForms((prev) =>
                prev.map((row) =>
                    row.id === editingId
                        ? {
                              ...row,
                              ...fields,
                              filterTipe,
                              filterNama,
                              updatedAt: now,
                          }
                        : row
                )
            );
            setMessage("Perubahan form transfer berhasil disimpan.");
        } else {
            const next: FormTransferRecord = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                filterTipe,
                filterNama,
                ...fields,
                updatedAt: now,
            };
            setSavedForms((prev) => [next, ...prev]);
            setEditingId(next.id);
            setMessage("Form transfer berhasil disimpan.");
        }
        setError(null);
        setIsFormOpen(false);
    };

    const handleEditSaved = (row: FormTransferRecord) => {
        setEditingId(row.id);
        setIsFormOpen(true);
        setFilterTipe(row.filterTipe);
        setFilterNama(row.filterNama);
        setFields({
            tanggal: row.tanggal,
            dept: row.dept,
            penerimaDana: row.penerimaDana,
            keperluan: row.keperluan,
            nominal: row.nominal,
            terbilang: row.terbilang,
            bank: row.bank,
            noRekening: row.noRekening,
            atasNama: row.atasNama,
            ditransferDari: row.ditransferDari,
            tanggalProses: row.tanggalProses,
            oleh: row.oleh,
            status: row.status,
            biayaAdm: row.biayaAdm,
        });
        setMessage(null);
        setError(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDeleteSaved = (row: FormTransferRecord) => {
        const ok = window.confirm(`Hapus form transfer untuk ${row.filterTipe} "${row.filterNama}"?`);
        if (!ok) return;
        setSavedForms((prev) => prev.filter((r) => r.id !== row.id));
        if (editingId === row.id) closeForm();
    };

    const inputClass =
        "w-full bg-transparent px-1 py-0.5 text-xs text-black outline-none focus:bg-amber-50";

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 p-6 lg:p-10">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Form Transfer</h1>
                        <p className="mt-2 text-sm text-secondary">
                            Pilih filter Cabang/Agen, lalu buka form transfer. Daftar form tersimpan selalu
                            tampil di bawah.
                        </p>
                    </div>
                    {isFormOpen && (
                        <button
                            type="button"
                            onClick={handleSave}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                        >
                            <Save className="size-4" aria-hidden />
                            {editingId ? "Simpan Perubahan" : "Simpan"}
                        </button>
                    )}
                </div>

                <div className="rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-foreground">Filter form by</p>
                    <p className="mt-1 text-xs text-secondary">
                        Pilih apakah form difilter by Cabang atau by Agen, lalu pilih nama yang tersedia di
                        Data Cabang/Agen.
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <fieldset className="flex flex-col gap-2">
                            <legend className="text-sm font-semibold text-foreground">Filter By :</legend>
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
                                    onChange={(e) => onChangeFilterNama(e.target.value)}
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
                            Belum ada data {filterTipe} di Data Cabang/Agen. Tambahkan dulu agar rekening
                            bisa terisi otomatis.
                        </p>
                    ) : selectedEntity ? (
                        <p className="mt-3 text-xs text-secondary">
                            Auto-isi dari {selectedEntity.tipe} <strong>{selectedEntity.nama}</strong> —
                            Owner {selectedEntity.owner}, Bank {selectedEntity.bank}, Rek.{" "}
                            {selectedEntity.noRekening}, a.n. {selectedEntity.namaPemilikRekening}.
                        </p>
                    ) : null}

                    {!isFormOpen && (
                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={openNewForm}
                                disabled={!selectedEntity}
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <FileText className="size-4" aria-hidden />
                                Buka Form Transfer
                            </button>
                        </div>
                    )}
                    {isFormOpen && (
                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
                            >
                                Tutup Form
                            </button>
                        </div>
                    )}
                </div>

                {(error || message) && (
                    <div
                        className={`rounded-xl border px-4 py-3 text-sm ${
                            error
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800"
                        }`}
                    >
                        {error || message}
                    </div>
                )}

                {isFormOpen && (
                <div className="overflow-x-auto">
                    <div className="mx-auto min-w-[980px] border border-black/40 bg-white text-black">
                        <div className="grid grid-cols-[170px_1fr] border-b border-black/40">
                            <div className="flex items-center justify-center border-r border-black/40 p-2">
                                <Image src="/jne_logo.png" alt="JNE" width={96} height={42} />
                            </div>
                            <div className="p-2 text-center">
                                <p className="text-2xl font-bold leading-tight">FORM PERMINTAAN TRANSFER BANK</p>
                                <p className="mt-1 text-xs">
                                    Jl. Urip Sumoharjo No. 3 Telp. (0380) 820066 / 831574, Kupang - NTT
                                </p>
                            </div>
                        </div>

                        <table className="w-full border-collapse text-xs">
                            <tbody>
                                <tr className="border-b border-black/40">
                                    <td className="w-[155px] border-r border-black/40 px-3 py-2 font-semibold">
                                        TANGGAL
                                    </td>
                                    <td className="w-[28px] border-r border-black/40 px-2 text-center">:</td>
                                    <td className="border-r border-black/40 px-3 py-2">
                                        <input
                                            type="date"
                                            value={fields.tanggal}
                                            onChange={(e) => updateField("tanggal", e.target.value)}
                                            className={inputClass}
                                        />
                                    </td>
                                    <td className="w-[100px] border-r border-black/40 px-3 py-2 text-right font-semibold">
                                        DEPT
                                    </td>
                                    <td className="w-[28px] border-r border-black/40 px-2 text-center">:</td>
                                    <td className="w-[220px] px-3 py-2">
                                        {cellInput({
                                            value: fields.dept,
                                            onChange: (e) => updateField("dept", e.target.value),
                                        })}
                                    </td>
                                </tr>
                                <tr className="border-b border-black/40">
                                    <td className="border-r border-black/40 px-3 py-2 font-semibold">
                                        PENERIMA DANA
                                    </td>
                                    <td className="border-r border-black/40 px-2 text-center">:</td>
                                    <td colSpan={4} className="px-3 py-2">
                                        {cellInput({
                                            value: fields.penerimaDana,
                                            onChange: (e) => updateField("penerimaDana", e.target.value),
                                        })}
                                    </td>
                                </tr>
                                <tr className="border-b border-black/40">
                                    <td className="border-r border-black/40 px-3 py-2 font-semibold">KEPERLUAN</td>
                                    <td className="border-r border-black/40 px-2 text-center">:</td>
                                    <td colSpan={4} className="px-3 py-2">
                                        {cellInput({
                                            value: fields.keperluan,
                                            onChange: (e) => updateField("keperluan", e.target.value),
                                        })}
                                    </td>
                                </tr>
                                <tr className="border-b border-black/40">
                                    <td className="border-r border-black/40 px-3 py-2 font-semibold">NOMINAL</td>
                                    <td className="border-r border-black/40 px-2 text-center">:</td>
                                    <td colSpan={4} className="px-3 py-2">
                                        <div className="flex items-center gap-1">
                                            <span className="shrink-0 font-semibold">Rp.</span>
                                            {cellInput({
                                                value: fields.nominal,
                                                onChange: (e) => updateField("nominal", e.target.value),
                                                inputMode: "numeric",
                                                placeholder: "0",
                                                className: "flex-1",
                                            })}
                                        </div>
                                    </td>
                                </tr>
                                <tr className="border-b border-black/40">
                                    <td className="border-r border-black/40 px-3 py-2 font-semibold">TERBILANG</td>
                                    <td className="border-r border-black/40 px-2 text-center">:</td>
                                    <td colSpan={4} className="px-3 py-2">
                                        <input
                                            type="text"
                                            value={fields.terbilang}
                                            readOnly
                                            tabIndex={-1}
                                            placeholder="Otomatis dari nominal"
                                            className="w-full cursor-default bg-transparent px-1 py-0.5 text-xs text-black outline-none"
                                            title="Terisi otomatis dari field Nominal"
                                        />
                                    </td>
                                </tr>
                                <tr className="border-b border-black/40">
                                    <td className="border-r border-black/40 px-3 py-2 font-semibold">
                                        REK. TUJUAN
                                    </td>
                                    <td className="border-r border-black/40 px-2 text-center">:</td>
                                    <td colSpan={4} className="px-3 py-2">
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                            <div className="flex min-w-[180px] max-w-[240px] flex-1 items-center gap-1">
                                                <span className="shrink-0 font-semibold">BANK :</span>
                                                {cellInput({
                                                    value: fields.bank,
                                                    onChange: (e) => updateField("bank", e.target.value),
                                                    className: "flex-1",
                                                })}
                                            </div>
                                            <div className="flex min-w-[200px] max-w-[280px] flex-1 items-center gap-1">
                                                <span className="shrink-0 font-semibold">NO REK :</span>
                                                {cellInput({
                                                    value: fields.noRekening,
                                                    onChange: (e) => updateField("noRekening", e.target.value),
                                                    className: "flex-1",
                                                })}
                                            </div>
                                            <div className="flex min-w-[220px] flex-[1.4] items-center gap-1">
                                                <span className="shrink-0 font-semibold">A.N :</span>
                                                {cellInput({
                                                    value: fields.atasNama,
                                                    onChange: (e) => updateField("atasNama", e.target.value),
                                                    className: "flex-1",
                                                })}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <table className="w-full border-collapse text-xs">
                            <tbody>
                                <tr className="border-b border-black/40">
                                    <td className="w-[420px] border-r border-black/40 px-3 py-2 text-center font-semibold">
                                        DITRANSFER DARI REK. BANK
                                    </td>
                                    <td className="w-[28px] border-r border-black/40 px-2 text-center">:</td>
                                    <td className="px-3 py-2">
                                        {cellInput({
                                            value: fields.ditransferDari,
                                            onChange: (e) => updateField("ditransferDari", e.target.value),
                                        })}
                                    </td>
                                </tr>
                                <tr className="border-b border-black/40">
                                    <td className="border-r border-black/40 px-3 py-2 font-semibold">TANGGAL</td>
                                    <td className="border-r border-black/40 px-2 text-center">:</td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="date"
                                            value={fields.tanggalProses}
                                            onChange={(e) => updateField("tanggalProses", e.target.value)}
                                            className={inputClass}
                                        />
                                    </td>
                                </tr>
                                <tr className="border-b border-black/40">
                                    <td className="border-r border-black/40 px-3 py-2 font-semibold">OLEH</td>
                                    <td className="border-r border-black/40 px-2 text-center">:</td>
                                    <td className="px-3 py-2">
                                        {cellInput({
                                            value: fields.oleh,
                                            onChange: (e) => updateField("oleh", e.target.value),
                                        })}
                                    </td>
                                </tr>
                                <tr className="border-b border-black/40">
                                    <td className="border-r border-black/40 px-3 py-2 font-semibold">STATUS</td>
                                    <td className="border-r border-black/40 px-2 text-center">:</td>
                                    <td className="px-3 py-2">
                                        {cellInput({
                                            value: fields.status,
                                            onChange: (e) => updateField("status", e.target.value),
                                        })}
                                    </td>
                                </tr>
                                <tr className="border-b border-black/40">
                                    <td className="border-r border-black/40 px-3 py-2 font-semibold">BIAYA ADM</td>
                                    <td className="border-r border-black/40 px-2 text-center">:</td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center justify-between gap-2">
                                            {cellInput({
                                                value: fields.biayaAdm,
                                                onChange: (e) => updateField("biayaAdm", e.target.value),
                                                className: "flex-1",
                                            })}
                                            <span className="shrink-0 text-[11px]">*Di isi oleh Bendahara</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="grid grid-cols-3 border-b border-black/40 text-center text-xs font-semibold">
                            <div className="border-r border-black/40 py-3">PEMOHON</div>
                            <div className="border-r border-black/40 py-3">DI SETUJUI OLEH</div>
                            <div className="py-3">DI PROSES OLEH</div>
                        </div>
                        <div className="grid grid-cols-3 text-center text-xs">
                            <div className="border-r border-black/40 pb-3 pt-10">
                                <div className="mx-auto mt-10 w-[160px] border-t border-black/60 pt-2">
                                    INTAN TALU
                                </div>
                            </div>
                            <div className="border-r border-black/40 pb-3 pt-10">
                                <div className="mx-auto mt-10 w-[160px] border-t border-black/60 pt-2">
                                    EMI I KHILAFAH
                                </div>
                            </div>
                            <div className="pb-3 pt-10">
                                <div className="mx-auto mt-10 w-[160px] border-t border-black/60 pt-2">
                                    &nbsp;
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                )}

                <div>
                    <h2 className="mb-3 text-lg font-semibold text-foreground">Form yang tersimpan</h2>
                    <div className="w-full overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                            <thead>
                                <tr className="bg-muted text-foreground">
                                    <th className="border border-border px-3 py-2 font-semibold">Filter</th>
                                    <th className="border border-border px-3 py-2 font-semibold">Penerima</th>
                                    <th className="border border-border px-3 py-2 font-semibold">Keperluan</th>
                                    <th className="border border-border px-3 py-2 font-semibold">Nominal</th>
                                    <th className="border border-border px-3 py-2 font-semibold">Bank / Rek</th>
                                    <th className="border border-border px-3 py-2 font-semibold">Update</th>
                                    <th className="border border-border px-3 py-2 font-semibold">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {savedForms.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="border border-border px-4 py-8 text-center text-secondary"
                                        >
                                            Belum ada form tersimpan. Pilih filter, buka form, lalu klik
                                            Simpan.
                                        </td>
                                    </tr>
                                ) : (
                                    savedForms.map((row) => (
                                        <tr
                                            key={row.id}
                                            className={`hover:bg-muted/40 ${
                                                editingId === row.id ? "bg-primary/5" : ""
                                            }`}
                                        >
                                            <td className="border border-border px-3 py-2">
                                                {row.filterTipe}: {row.filterNama}
                                            </td>
                                            <td className="border border-border px-3 py-2">{row.penerimaDana}</td>
                                            <td className="border border-border px-3 py-2">{row.keperluan}</td>
                                            <td className="border border-border px-3 py-2">Rp {row.nominal}</td>
                                            <td className="border border-border px-3 py-2">
                                                {row.bank} / {row.noRekening}
                                            </td>
                                            <td className="border border-border px-3 py-2 text-xs text-secondary">
                                                {new Date(row.updatedAt).toLocaleString("id-ID")}
                                            </td>
                                            <td className="border border-border px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditSaved(row)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                                                    >
                                                        <Pencil className="size-3.5" aria-hidden />
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteSaved(row)}
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
            </div>
        </DashboardLayout>
    );
}
