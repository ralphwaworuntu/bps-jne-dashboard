"use client";

import { useState } from "react";
import AlcPageShell from "@/components/dashboard/v2/alc/AlcPageShell";
import CabangSelect from "@/components/dashboard/v2/alc/CabangSelect";
import type { CabangName } from "@/components/dashboard/v2/alc/cabang";

export default function DeliveryPage() {
    const [selectedCabang, setSelectedCabang] = useState<CabangName>("Alor");

    return (
        <AlcPageShell
            title="Delivery"
            description={`Data delivery cabang ${selectedCabang}.`}
            toolbar={<CabangSelect value={selectedCabang} onChange={setSelectedCabang} />}
        >
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
        </AlcPageShell>
    );
}
