"use client";

import { useState } from "react";
import AlcPageShell from "@/components/dashboard/v2/alc/AlcPageShell";
import CabangSelect from "@/components/dashboard/v2/alc/CabangSelect";
import type { CabangName } from "@/components/dashboard/v2/alc/cabang";

export default function ByJemputPage() {
    const [selectedCabang, setSelectedCabang] = useState<CabangName>("Alor");

    return (
        <AlcPageShell
            title="By. Jemput"
            description={`Data biaya jemput cabang ${selectedCabang}.`}
            toolbar={<CabangSelect value={selectedCabang} onChange={setSelectedCabang} />}
        >
            <div className="space-y-6">
                <div className="overflow-x-auto">
                    <table className="w-max min-w-full border-collapse text-left text-sm">
                        <thead>
                            <tr className="text-black">
                                <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">
                                    DATE
                                </th>
                                <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">
                                    TANGGAL
                                </th>
                                <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">
                                    DESTINASI
                                </th>
                                <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">
                                    NOMOR
                                </th>
                                <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">
                                    NOMOR TM
                                </th>
                                <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">
                                    ACTUAL
                                </th>
                                <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">
                                    KETERANGAN SYSTEM
                                </th>
                                <th className="whitespace-nowrap border border-black/30 bg-[#c56f2b] px-3 py-2 font-semibold">
                                    KET
                                </th>
                                <th className="whitespace-nowrap border border-black/30 bg-[#9fb2d4] px-3 py-2 font-semibold">
                                    CN
                                </th>
                                <th className="whitespace-nowrap border border-black/30 bg-[#9fb2d4] px-3 py-2 font-semibold">
                                    USER
                                </th>
                                <th className="whitespace-nowrap border border-black/30 bg-[#9fb2d4] px-3 py-2 font-semibold">
                                    KETERANGAN
                                </th>
                                <th className="whitespace-nowrap border border-black/30 bg-[#9fb2d4] px-3 py-2 font-semibold">
                                    SMU
                                </th>
                                <th className="whitespace-nowrap border border-black/30 bg-[#9fb2d4] px-3 py-2 font-semibold">
                                    ETD
                                </th>
                                <th className="whitespace-nowrap border border-black/30 bg-[#9fb2d4] px-3 py-2 font-semibold">
                                    ETA
                                </th>
                                <th className="whitespace-nowrap border border-black/30 bg-[#9fb2d4] px-3 py-2 font-semibold">
                                    TOTAL
                                </th>
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
                                <th className="whitespace-nowrap border border-black/30 px-3 py-2 text-center font-semibold">
                                    NO
                                </th>
                                <th className="whitespace-nowrap border border-black/30 px-3 py-2 text-center font-semibold">
                                    TANGGAL
                                </th>
                                <th className="whitespace-nowrap border border-black/30 px-3 py-2 text-center font-semibold">
                                    SM
                                </th>
                                <th className="whitespace-nowrap border border-black/30 px-3 py-2 text-center font-semibold">
                                    VIA
                                </th>
                                <th className="whitespace-nowrap border border-black/30 px-3 py-2 text-center font-semibold">
                                    Qty
                                </th>
                                <th className="whitespace-nowrap border border-black/30 px-3 py-2 text-center font-semibold">
                                    Total
                                </th>
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
        </AlcPageShell>
    );
}
