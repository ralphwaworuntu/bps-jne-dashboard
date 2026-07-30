"use client";

import { useState } from "react";
import AlcPageShell from "@/components/dashboard/v2/alc/AlcPageShell";
import CabangSelect from "@/components/dashboard/v2/alc/CabangSelect";
import type { CabangName } from "@/components/dashboard/v2/alc/cabang";

export default function ByReturnPage() {
    const [selectedCabang, setSelectedCabang] = useState<CabangName>("Alor");

    return (
        <AlcPageShell
            title="By. Return"
            description={`Data biaya return cabang ${selectedCabang}.`}
            toolbar={<CabangSelect value={selectedCabang} onChange={setSelectedCabang} />}
        >
            <div className="overflow-x-auto">
                <table className="w-max min-w-full border-collapse text-left text-sm">
                    <thead>
                        <tr className="bg-[#d6d6d6] text-black">
                            <th className="whitespace-nowrap border border-black/30 px-3 py-2 font-semibold">
                                CONNOTE_RETURN_RT
                            </th>
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
        </AlcPageShell>
    );
}
