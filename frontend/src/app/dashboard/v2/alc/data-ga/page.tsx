"use client";

import { useState } from "react";
import AlcPageShell from "@/components/dashboard/v2/alc/AlcPageShell";
import CabangSelect from "@/components/dashboard/v2/alc/CabangSelect";
import type { CabangName } from "@/components/dashboard/v2/alc/cabang";

export default function DataGaPage() {
    const [selectedCabang, setSelectedCabang] = useState<CabangName>("Alor");

    return (
        <AlcPageShell
            title="Data GA"
            description={`Data GA cabang ${selectedCabang}.`}
            toolbar={<CabangSelect value={selectedCabang} onChange={setSelectedCabang} />}
        >
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
        </AlcPageShell>
    );
}
