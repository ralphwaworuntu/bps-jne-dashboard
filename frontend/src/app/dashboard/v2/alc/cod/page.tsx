"use client";

import { useState } from "react";
import AlcPageShell from "@/components/dashboard/v2/alc/AlcPageShell";
import CabangSelect from "@/components/dashboard/v2/alc/CabangSelect";
import type { CabangName } from "@/components/dashboard/v2/alc/cabang";

export default function CodPage() {
    const [selectedCabang, setSelectedCabang] = useState<CabangName>("Alor");

    return (
        <AlcPageShell
            title="COD"
            description={`Data COD cabang ${selectedCabang}.`}
            toolbar={<CabangSelect value={selectedCabang} onChange={setSelectedCabang} />}
        >
            <div className="overflow-x-auto">
                <table className="w-max min-w-full border-collapse text-left text-sm">
                    <thead>
                        <tr className="bg-[#7f0000] text-white">
                            <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">Runshet No</th>
                            <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">Tgl Runsheet</th>
                            <th className="min-w-[180px] whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">
                                Consignee
                            </th>
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
        </AlcPageShell>
    );
}
