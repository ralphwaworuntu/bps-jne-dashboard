"use client";

import { useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import Image from "next/image";
import { Building2, CheckCircle2, ChevronDown, LayoutList, Upload } from "lucide-react";

const CABANG_OPTIONS = ["Alor", "Waingapu", "Soe", "Kefamenanu", "Waikabubak"] as const;

const CTC_MENUS = [
    "Form Transfer",
    "CTC",
    "COD",
    "Penjualan",
    "Delivery Project",
    "Delivery",
    "By. Return",
    "By. Jemput",
    "GA",
] as const;

type CabangName = (typeof CABANG_OPTIONS)[number];

type CabangUploadState = {
    fileName: string;
    uploadedAt: string;
};

export default function ManagemenCtcPage() {
    const [selectedCabang, setSelectedCabang] = useState<CabangName>("Alor");
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [ctcUploads, setCtcUploads] = useState<Partial<Record<CabangName, CabangUploadState>>>({});

    const menuItems = useMemo(
        () =>
            CTC_MENUS.map((m, i) => ({
                id: `${selectedCabang}-${i + 1}`,
                label: m,
            })),
        [selectedCabang]
    );

    const currentCabangUpload = ctcUploads[selectedCabang] ?? null;

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

    const onUploadCtcCabang = (file: File | null) => {
        if (!file) return;
        setCtcUploads((prev) => ({
            ...prev,
            [selectedCabang]: {
                fileName: file.name,
                uploadedAt: formatUploadedAt(),
            },
        }));
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 p-6 lg:p-10">
                <div>
                    <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Managemen CTC</h1>
                    <p className="mt-2 text-sm text-secondary">
                        Pilih cabang untuk menampilkan daftar menu operasional.
                    </p>
                </div>

                <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-sm">
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(260px,360px)_1fr] xl:items-start">
                        <div className="flex flex-col gap-2">
                            <label htmlFor="cabang" className="text-sm font-semibold text-foreground">
                                Cabang
                            </label>
                            <div className="relative">
                                <select
                                    id="cabang"
                                    value={selectedCabang}
                                    onChange={(e) =>
                                        setSelectedCabang(e.target.value as (typeof CABANG_OPTIONS)[number])
                                    }
                                    className="w-full appearance-none rounded-xl border border-border bg-white px-4 py-3 pr-10 text-sm font-medium text-foreground"
                                >
                                    {CABANG_OPTIONS.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
                            </div>
                        </div>

                        <div className="w-full justify-self-stretch xl:justify-self-end xl:max-w-2xl">
                            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
                                <p className="text-sm font-semibold text-foreground">Upload data CTC Cabang</p>
                                <p className="mt-1 text-xs text-secondary">
                                    File upload disimpan terpisah untuk tiap cabang yang dipilih.
                                </p>

                                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted">
                                    <Upload className="size-4" aria-hidden />
                                    Pilih file data CTC ({selectedCabang})
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => onUploadCtcCabang(e.target.files?.[0] ?? null)}
                                    />
                                </label>

                                {currentCabangUpload ? (
                                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
                                        <div className="min-w-0">
                                            <p className="break-all text-sm font-medium text-foreground">
                                                {currentCabangUpload.fileName}
                                            </p>
                                            <p className="text-xs text-secondary">
                                                Upload: {currentCabangUpload.uploadedAt}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-3 text-xs text-secondary">
                                        Belum ada file untuk cabang {selectedCabang}.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                        <LayoutList className="size-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">Menu {selectedCabang}</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {menuItems.map((item) => (
                            <button
                                type="button"
                                key={item.id}
                                onClick={() => {
                                    if (
                                        item.label === "Form Transfer" ||
                                        item.label === "CTC" ||
                                        item.label === "COD" ||
                                        item.label === "Penjualan" ||
                                        item.label === "Delivery Project" ||
                                        item.label === "Delivery" ||
                                        item.label === "By. Return" ||
                                        item.label === "GA" ||
                                        item.label === "By. Jemput"
                                    ) {
                                        setActiveMenu(item.label);
                                    }
                                }}
                                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                                    item.label === activeMenu
                                        ? "border-primary/40 bg-primary/10"
                                        : "border-border bg-muted/30 hover:bg-muted"
                                }`}
                            >
                                <Building2 className="size-4 text-primary" />
                                <span className="font-medium text-foreground">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {activeMenu === "Form Transfer" && (
                <div className="px-6 pb-6 lg:px-10 lg:pb-10">
                    <div className="mx-auto max-w-5xl rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-base font-semibold text-foreground">
                                Form Transfer - {selectedCabang}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setActiveMenu(null)}
                                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-secondary hover:bg-muted"
                            >
                                Sembunyikan
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <div className="mx-auto min-w-[980px] border border-black/40 bg-white text-black">
                                <div className="grid grid-cols-[170px_1fr] border-b border-black/40">
                                    <div className="border-r border-black/40 p-2">
                                        <Image src="/jne_logo.png" alt="JNE" width={96} height={42} />
                                        <p className="mt-2 text-xl font-semibold leading-none">JNE KUPANG</p>
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
                                            <td className="w-[155px] border-r border-black/40 px-3 py-2 font-semibold">TANGGAL</td>
                                            <td className="w-[28px] border-r border-black/40 px-2 text-center">:</td>
                                            <td className="border-r border-black/40 px-3 py-2" />
                                            <td className="w-[100px] border-r border-black/40 px-3 py-2 text-right font-semibold">DEPT</td>
                                            <td className="w-[28px] border-r border-black/40 px-2 text-center">:</td>
                                            <td className="w-[220px] px-3 py-2" />
                                        </tr>
                                        <tr className="border-b border-black/40">
                                            <td className="border-r border-black/40 px-3 py-2 font-semibold">PENERIMA DANA</td>
                                            <td className="border-r border-black/40 px-2 text-center">:</td>
                                            <td colSpan={4} className="px-3 py-2" />
                                        </tr>
                                        <tr className="border-b border-black/40">
                                            <td className="border-r border-black/40 px-3 py-2 font-semibold">KEPERLUAN</td>
                                            <td className="border-r border-black/40 px-2 text-center">:</td>
                                            <td colSpan={4} className="px-3 py-2" />
                                        </tr>
                                        <tr className="border-b border-black/40">
                                            <td className="border-r border-black/40 px-3 py-2 font-semibold">NOMINAL</td>
                                            <td className="border-r border-black/40 px-2 text-center">:</td>
                                            <td className="w-[120px] border-r border-black/40 px-3 py-2 font-semibold">Rp.</td>
                                            <td colSpan={3} className="px-3 py-2" />
                                        </tr>
                                        <tr className="border-b border-black/40">
                                            <td className="border-r border-black/40 px-3 py-2 font-semibold">TERBILANG</td>
                                            <td className="border-r border-black/40 px-2 text-center">:</td>
                                            <td colSpan={4} className="px-3 py-2" />
                                        </tr>
                                        <tr className="border-b border-black/40">
                                            <td className="border-r border-black/40 px-3 py-2 font-semibold">REK. TUJUAN</td>
                                            <td className="border-r border-black/40 px-2 text-center">:</td>
                                            <td className="px-3 py-2 font-semibold">BANK :</td>
                                            <td className="px-3 py-2 font-semibold">NO REK :</td>
                                            <td colSpan={2} className="px-3 py-2 font-semibold">A.N :</td>
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
                                            <td className="px-3 py-2" />
                                        </tr>
                                        <tr className="border-b border-black/40">
                                            <td className="border-r border-black/40 px-3 py-2 font-semibold">TANGGAL</td>
                                            <td className="border-r border-black/40 px-2 text-center">:</td>
                                            <td className="px-3 py-2" />
                                        </tr>
                                        <tr className="border-b border-black/40">
                                            <td className="border-r border-black/40 px-3 py-2 font-semibold">OLEH</td>
                                            <td className="border-r border-black/40 px-2 text-center">:</td>
                                            <td className="px-3 py-2" />
                                        </tr>
                                        <tr className="border-b border-black/40">
                                            <td className="border-r border-black/40 px-3 py-2 font-semibold">STATUS</td>
                                            <td className="border-r border-black/40 px-2 text-center">:</td>
                                            <td className="px-3 py-2" />
                                        </tr>
                                        <tr className="border-b border-black/40">
                                            <td className="border-r border-black/40 px-3 py-2 font-semibold">BIAYA ADM</td>
                                            <td className="border-r border-black/40 px-2 text-center">:</td>
                                            <td className="px-3 py-2 text-right text-[11px]">*Di isi oleh Bendahara</td>
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
                                        <div className="mx-auto mt-10 w-[160px] border-t border-black/60 pt-2">INTAN TALU</div>
                                    </div>
                                    <div className="border-r border-black/40 pb-3 pt-10">
                                        <div className="mx-auto mt-10 w-[160px] border-t border-black/60 pt-2">EMI I KHILAFAH</div>
                                    </div>
                                    <div className="pb-3 pt-10">
                                        <div className="mx-auto mt-10 w-[160px] border-t border-black/60 pt-2">&nbsp;</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeMenu === "CTC" && (
                <div className="px-6 pb-6 lg:px-10 lg:pb-10">
                    <div className="mx-auto max-w-5xl rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-base font-semibold text-foreground">CTC - {selectedCabang}</h3>
                            <button
                                type="button"
                                onClick={() => setActiveMenu(null)}
                                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-secondary hover:bg-muted"
                            >
                                Sembunyikan
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <div className="mx-auto min-w-[980px] border border-black/40 bg-white text-black">
                                <div className="border-b border-black/40 px-4 py-4 text-center">
                                    <p className="text-2xl font-bold leading-tight">PERHITUNGAN HUTANG PIUTANG</p>
                                    <p className="text-2xl font-bold leading-tight">JNE KUPANG - JNE {selectedCabang.toUpperCase()}</p>
                                    <p className="text-2xl font-bold leading-tight">PERIODE FEBRUARI 2026</p>
                                </div>
                                <p className="border-b border-black/40 px-4 py-3 text-sm">
                                    Bersama ini kami kirimkan perhitungan hutang piutang JNE {selectedCabang.toUpperCase()} untuk
                                    Periode FEBRUARI 2026 dengan rincian sebagai berikut:
                                </p>

                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-amber-200/80">
                                            <th className="border-b border-r border-black/40 px-3 py-2 text-left font-bold">KETERANGAN</th>
                                            <th className="border-b border-r border-black/40 px-3 py-2 text-center font-bold">JNE KUPANG</th>
                                            <th className="border-b border-black/40 px-3 py-2 text-center font-bold">JNE {selectedCabang.toUpperCase()}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2 font-bold">OUTBOUND</td><td className="border-b border-r border-black/40 px-3 py-2" /><td className="border-b border-black/40 px-3 py-2" /></tr>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2">Total Penjualan</td><td className="border-b border-r border-black/40 px-3 py-2 text-right">Rp 42,678,000</td><td className="border-b border-black/40 px-3 py-2" /></tr>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2">- Komisi Agen</td><td className="border-b border-r border-black/40 px-3 py-2" /><td className="border-b border-black/40 px-3 py-2 text-right">Rp 10,330,400</td></tr>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2">- Sudah Transfer/ Setor</td><td className="border-b border-r border-black/40 px-3 py-2" /><td className="border-b border-black/40 px-3 py-2 text-right">Rp -</td></tr>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2">- Asuransi</td><td className="border-b border-r border-black/40 px-3 py-2 text-right">Rp 42,000</td><td className="border-b border-black/40 px-3 py-2" /></tr>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2">- NA/CASHLESS/CREDIT</td><td className="border-b border-r border-black/40 px-3 py-2" /><td className="border-b border-black/40 px-3 py-2 text-right">Rp 18,014,400</td></tr>

                                        <tr><td className="border-b border-r border-black/40 px-3 py-2 font-bold">INBOUND</td><td className="border-b border-r border-black/40 px-3 py-2" /><td className="border-b border-black/40 px-3 py-2" /></tr>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2">- Biaya Delivery</td><td className="border-b border-r border-black/40 px-3 py-2" /><td className="border-b border-black/40 px-3 py-2 text-right">Rp 16,411,500</td></tr>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2">- Biaya Delivery Project</td><td className="border-b border-r border-black/40 px-3 py-2" /><td className="border-b border-black/40 px-3 py-2 text-right">Rp 274,000</td></tr>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2">- Biaya Jemput</td><td className="border-b border-r border-black/40 px-3 py-2" /><td className="border-b border-black/40 px-3 py-2 text-right">Rp 3,440,000</td></tr>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2">- Biaya Retur</td><td className="border-b border-r border-black/40 px-3 py-2" /><td className="border-b border-black/40 px-3 py-2 text-right">Rp 937,500</td></tr>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2">- Beban OTS COD</td><td className="border-b border-r border-black/40 px-3 py-2 text-right">Rp -</td><td className="border-b border-black/40 px-3 py-2" /></tr>

                                        <tr><td className="border-b border-r border-black/40 px-3 py-2 font-bold">LAIN-LAIN</td><td className="border-b border-r border-black/40 px-3 py-2" /><td className="border-b border-black/40 px-3 py-2" /></tr>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2">- Pembelian Perlengkapan</td><td className="border-b border-r border-black/40 px-3 py-2 text-right">Rp -</td><td className="border-b border-black/40 px-3 py-2" /></tr>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2">- Biaya Transit</td><td className="border-b border-r border-black/40 px-3 py-2" /><td className="border-b border-black/40 px-3 py-2" /></tr>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2">- Biaya Internet / Speedy</td><td className="border-b border-r border-black/40 px-3 py-2" /><td className="border-b border-black/40 px-3 py-2" /></tr>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2">- Biaya subsidi kartu hallo hybrid</td><td className="border-b border-r border-black/40 px-3 py-2 text-right">Rp 10,000</td><td className="border-b border-black/40 px-3 py-2" /></tr>
                                        <tr><td className="border-b border-r border-black/40 px-3 py-2">- Biaya Tagihan Pulsa Paket ID ADRIANUS MILU-</td><td className="border-b border-r border-black/40 px-3 py-2 text-right">Rp 16,000</td><td className="border-b border-black/40 px-3 py-2" /></tr>

                                        <tr>
                                            <td className="border-b border-r border-black/40 px-3 py-2 font-bold">&nbsp;</td>
                                            <td className="border-b border-r border-black/40 px-3 py-2 text-right font-semibold">Rp 42,746,000</td>
                                            <td className="border-b border-black/40 px-3 py-2 text-right font-semibold">Rp 49,407,800</td>
                                        </tr>
                                        <tr>
                                            <td className="border-r border-black/40 px-3 py-2 text-xl font-bold">HAK JNE {selectedCabang.toUpperCase()}</td>
                                            <td className="border-r border-black/40 px-3 py-2 text-right text-xl font-bold">Rp 6,661,800</td>
                                            <td className="px-3 py-2" />
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="px-3 pb-6 pt-8 text-sm">
                                    <p>Kupang, 28 Februari 2026</p>
                                    <p className="mt-16 w-[220px] border-t border-black/60 pt-1">Emi Khilafah</p>
                                    <p>Kepala Cabang JNE Kupang</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeMenu === "COD" && (
                <div className="px-6 pb-6 lg:px-10 lg:pb-10">
                    <div className="mx-auto max-w-6xl rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-base font-semibold text-foreground">COD - {selectedCabang}</h3>
                            <button
                                type="button"
                                onClick={() => setActiveMenu(null)}
                                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-secondary hover:bg-muted"
                            >
                                Sembunyikan
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-max min-w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="bg-[#7f0000] text-white">
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">Runshet No</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">Tgl Runsheet</th>
                                        <th className="min-w-[180px] whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">Consignee</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">Status POD</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">Ket</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">Cnote No</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">Tgl Received</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">WUZ</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">Tgl WUZ</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">COD Amount</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">SCO</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">Tanggal Bayar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan={12} className="border border-black/20 px-4 py-10 text-center text-secondary">
                                            Belum ada data COD. Kolom sudah disiapkan sesuai format.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeMenu === "Penjualan" && (
                <div className="px-6 pb-6 lg:px-10 lg:pb-10">
                    <div className="mx-auto max-w-6xl rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-base font-semibold text-foreground">Penjualan - {selectedCabang}</h3>
                            <button
                                type="button"
                                onClick={() => setActiveMenu(null)}
                                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-secondary hover:bg-muted"
                            >
                                Sembunyikan
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-max min-w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="bg-white text-black">
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">KOMISI JTR</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">TGL_ENTRY</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">ORIGIN</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">CABANG</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">DEST</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">SERVICE</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">PAYMENT_TYPE</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">QTY</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">WEIGHT</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">INSURANCE</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">AMOUNT</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">KOMISI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan={12} className="border border-black/20 px-4 py-10 text-center text-secondary">
                                            Belum ada data Penjualan. Kolom sudah disiapkan sesuai format.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeMenu === "Delivery Project" && (
                <div className="px-6 pb-6 lg:px-10 lg:pb-10">
                    <div className="mx-auto max-w-6xl rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-base font-semibold text-foreground">
                                Delivery Project - {selectedCabang}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setActiveMenu(null)}
                                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-secondary hover:bg-muted"
                            >
                                Sembunyikan
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-max min-w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="bg-white text-black">
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">ID_ACCOUNT</th>
                                        <th className="min-w-[170px] whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">SHIPPER_NAME</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">TGL_ENTRY</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">ORIGIN</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">DEST</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">CNOTE_NO</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">RUNSHEET</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">SERVICE</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">QTY</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">WEIGHT</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">BY DELIVERY</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan={11} className="border border-black/20 px-4 py-10 text-center text-secondary">
                                            Belum ada data Delivery Project. Kolom sudah disiapkan sesuai format.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeMenu === "Delivery" && (
                <div className="px-6 pb-6 lg:px-10 lg:pb-10">
                    <div className="mx-auto max-w-6xl rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-base font-semibold text-foreground">
                                Delivery - {selectedCabang}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setActiveMenu(null)}
                                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-secondary hover:bg-muted"
                            >
                                Sembunyikan
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-max min-w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="bg-[#d6d6d6] text-black">
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">TGL ENTRY</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">DEST</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">KEC</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">ZONE</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">SERVICE</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">QTY</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">
                                            Weight (sementara)
                                        </th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">WEIGHT</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">BY DELIVERY</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">BY PENERUS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan={10} className="border border-black/20 px-4 py-10 text-center text-secondary">
                                            Belum ada data Delivery. Kolom sudah disiapkan sesuai format.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeMenu === "By. Return" && (
                <div className="px-6 pb-6 lg:px-10 lg:pb-10">
                    <div className="mx-auto max-w-6xl rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-base font-semibold text-foreground">
                                By. Return - {selectedCabang}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setActiveMenu(null)}
                                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-secondary hover:bg-muted"
                            >
                                Sembunyikan
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-max min-w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="bg-[#d6d6d6] text-black">
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">CONNOTE_RETURN_RT</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">AWB</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">ID_ACCOUNT</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">TGL_ENTRY</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">ORIGIN</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">DEST</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">SERVICE</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">QTY</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">WEIGHT</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">MAX WEIGHT</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">BY RETUR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan={11} className="border border-black/20 px-4 py-10 text-center text-secondary">
                                            Belum ada data By. Return. Kolom sudah disiapkan sesuai format.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeMenu === "GA" && (
                <div className="px-6 pb-6 lg:px-10 lg:pb-10">
                    <div className="mx-auto max-w-6xl rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-base font-semibold text-foreground">GA - {selectedCabang}</h3>
                            <button
                                type="button"
                                onClick={() => setActiveMenu(null)}
                                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-secondary hover:bg-muted"
                            >
                                Sembunyikan
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-max min-w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="bg-[#8ea3be] text-black">
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">TANGGAL</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">NAMA CABANG</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">NO DO</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">DUMMY</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">KODE ITEM</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">ITEM</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">BERAT (KG)</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">QTY</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">HARGA</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">TOTAL</th>
                                        <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">KET</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan={11} className="border border-black/20 px-4 py-10 text-center text-secondary">
                                            Belum ada data GA. Kolom sudah disiapkan sesuai format.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeMenu === "By. Jemput" && (
                <div className="px-6 pb-6 lg:px-10 lg:pb-10">
                    <div className="mx-auto max-w-6xl rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-base font-semibold text-foreground">By. Jemput - {selectedCabang}</h3>
                            <button
                                type="button"
                                onClick={() => setActiveMenu(null)}
                                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-secondary hover:bg-muted"
                            >
                                Sembunyikan
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="overflow-x-auto">
                                <table className="w-max min-w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="text-black">
                                            <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">DATE</th>
                                            <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">TANGGAL</th>
                                            <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">DESTINASI</th>
                                            <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">NOMOR</th>
                                            <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">NOMOR TM</th>
                                            <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">ACTUAL</th>
                                            <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">KETERANGAN SYSTEM</th>
                                            <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">KET</th>
                                            <th className="whitespace-nowrap border border-black/30 bg-[#9fb2d4] px-3 py-2 font-semibold">CN</th>
                                            <th className="whitespace-nowrap border border-black/30 bg-[#9fb2d4] px-3 py-2 font-semibold">USER</th>
                                            <th className="whitespace-nowrap border border-black/30 bg-[#9fb2d4] px-3 py-2 font-semibold">KETERANGAN</th>
                                            <th className="whitespace-nowrap border border-black/30 bg-[#9fb2d4] px-3 py-2 font-semibold">SMU</th>
                                            <th className="whitespace-nowrap border border-black/30 bg-[#9fb2d4] px-3 py-2 font-semibold">ETD</th>
                                            <th className="whitespace-nowrap border border-black/30 bg-[#9fb2d4] px-3 py-2 font-semibold">ETA</th>
                                            <th className="whitespace-nowrap border border-black/30 bg-[#9fb2d4] px-3 py-2 font-semibold">TOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td colSpan={15} className="border border-black/20 px-4 py-10 text-center text-secondary">
                                                Belum ada data By. Jemput (tabel 1). Kolom sudah disiapkan sesuai format.
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-max min-w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="bg-[#9fcd83] text-black">
                                            <th colSpan={6} className="border border-black/30 px-3 py-2 text-center text-3xl font-bold">
                                                Data Penerusan kiriman Outbound To {selectedCabang.toUpperCase()}
                                            </th>
                                        </tr>
                                        <tr className="bg-[#b6d89d] text-black">
                                            <th className="whitespace-nowrap border border-black/30 px-3 py-2 text-center font-semibold">NO</th>
                                            <th className="whitespace-nowrap border border-black/30 px-3 py-2 text-center font-semibold">TANGGAL</th>
                                            <th className="whitespace-nowrap border border-black/30 px-3 py-2 text-center font-semibold">SM</th>
                                            <th className="whitespace-nowrap border border-black/30 px-3 py-2 text-center font-semibold">VIA</th>
                                            <th className="whitespace-nowrap border border-black/30 px-3 py-2 text-center font-semibold">Qty</th>
                                            <th className="whitespace-nowrap border border-black/30 px-3 py-2 text-center font-semibold">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td colSpan={6} className="border border-black/20 px-4 py-10 text-center text-secondary">
                                                Belum ada data By. Jemput (tabel 2). Kolom sudah disiapkan sesuai format.
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

