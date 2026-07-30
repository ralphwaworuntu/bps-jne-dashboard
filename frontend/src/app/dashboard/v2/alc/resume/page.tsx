"use client";

import { useState } from "react";
import AlcPageShell from "@/components/dashboard/v2/alc/AlcPageShell";
import CabangSelect from "@/components/dashboard/v2/alc/CabangSelect";
import type { CabangName } from "@/components/dashboard/v2/alc/cabang";

export default function ResumePage() {
    const [selectedCabang, setSelectedCabang] = useState<CabangName>("Alor");
    const cabangUpper = selectedCabang.toUpperCase();

    return (
        <AlcPageShell
            title="Resume"
            description={`Perhitungan hutang piutang JNE Kupang — JNE ${selectedCabang}.`}
            toolbar={<CabangSelect value={selectedCabang} onChange={setSelectedCabang} />}
            contentClassName="mx-auto max-w-5xl"
        >
            <div className="overflow-x-auto">
                <div className="mx-auto min-w-[980px] border border-black/40 bg-white text-black">
                    <div className="border-b border-black/40 px-4 py-4 text-center">
                        <p className="text-2xl font-bold leading-tight">PERHITUNGAN HUTANG PIUTANG</p>
                        <p className="text-2xl font-bold leading-tight">JNE KUPANG - JNE {cabangUpper}</p>
                        <p className="text-2xl font-bold leading-tight">PERIODE FEBRUARI 2026</p>
                    </div>
                    <p className="border-b border-black/40 px-4 py-3 text-sm">
                        Bersama ini kami kirimkan perhitungan hutang piutang JNE {cabangUpper} untuk Periode FEBRUARI
                        2026 dengan rincian sebagai berikut:
                    </p>

                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-amber-200/80">
                                <th className="border-b border-r border-black/40 px-3 py-2 text-left font-bold">
                                    KETERANGAN
                                </th>
                                <th className="border-b border-r border-black/40 px-3 py-2 text-center font-bold">
                                    JNE KUPANG
                                </th>
                                <th className="border-b border-black/40 px-3 py-2 text-center font-bold">
                                    JNE {cabangUpper}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2 font-bold">OUTBOUND</td>
                                <td className="border-b border-r border-black/40 px-3 py-2" />
                                <td className="border-b border-black/40 px-3 py-2" />
                            </tr>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2">Total Penjualan</td>
                                <td className="border-b border-r border-black/40 px-3 py-2 text-right">Rp 42,678,000</td>
                                <td className="border-b border-black/40 px-3 py-2" />
                            </tr>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2">- Komisi Agen</td>
                                <td className="border-b border-r border-black/40 px-3 py-2" />
                                <td className="border-b border-black/40 px-3 py-2 text-right">Rp 10,330,400</td>
                            </tr>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2">- Sudah Transfer/ Setor</td>
                                <td className="border-b border-r border-black/40 px-3 py-2" />
                                <td className="border-b border-black/40 px-3 py-2 text-right">Rp -</td>
                            </tr>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2">- Asuransi</td>
                                <td className="border-b border-r border-black/40 px-3 py-2 text-right">Rp 42,000</td>
                                <td className="border-b border-black/40 px-3 py-2" />
                            </tr>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2">- NA/CASHLESS/CREDIT</td>
                                <td className="border-b border-r border-black/40 px-3 py-2" />
                                <td className="border-b border-black/40 px-3 py-2 text-right">Rp 18,014,400</td>
                            </tr>

                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2 font-bold">INBOUND</td>
                                <td className="border-b border-r border-black/40 px-3 py-2" />
                                <td className="border-b border-black/40 px-3 py-2" />
                            </tr>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2">- Biaya Delivery</td>
                                <td className="border-b border-r border-black/40 px-3 py-2" />
                                <td className="border-b border-black/40 px-3 py-2 text-right">Rp 16,411,500</td>
                            </tr>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2">- Biaya Delivery Project</td>
                                <td className="border-b border-r border-black/40 px-3 py-2" />
                                <td className="border-b border-black/40 px-3 py-2 text-right">Rp 274,000</td>
                            </tr>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2">- Biaya Jemput</td>
                                <td className="border-b border-r border-black/40 px-3 py-2" />
                                <td className="border-b border-black/40 px-3 py-2 text-right">Rp 3,440,000</td>
                            </tr>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2">- Biaya Retur</td>
                                <td className="border-b border-r border-black/40 px-3 py-2" />
                                <td className="border-b border-black/40 px-3 py-2 text-right">Rp 937,500</td>
                            </tr>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2">- Beban OTS COD</td>
                                <td className="border-b border-r border-black/40 px-3 py-2 text-right">Rp -</td>
                                <td className="border-b border-black/40 px-3 py-2" />
                            </tr>

                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2 font-bold">LAIN-LAIN</td>
                                <td className="border-b border-r border-black/40 px-3 py-2" />
                                <td className="border-b border-black/40 px-3 py-2" />
                            </tr>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2">- Pembelian Perlengkapan</td>
                                <td className="border-b border-r border-black/40 px-3 py-2 text-right">Rp -</td>
                                <td className="border-b border-black/40 px-3 py-2" />
                            </tr>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2">- Biaya Transit</td>
                                <td className="border-b border-r border-black/40 px-3 py-2" />
                                <td className="border-b border-black/40 px-3 py-2" />
                            </tr>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2">- Biaya Internet / Speedy</td>
                                <td className="border-b border-r border-black/40 px-3 py-2" />
                                <td className="border-b border-black/40 px-3 py-2" />
                            </tr>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2">
                                    - Biaya subsidi kartu hallo hybrid
                                </td>
                                <td className="border-b border-r border-black/40 px-3 py-2 text-right">Rp 10,000</td>
                                <td className="border-b border-black/40 px-3 py-2" />
                            </tr>
                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2">
                                    - Biaya Tagihan Pulsa Paket ID ADRIANUS MILU-
                                </td>
                                <td className="border-b border-r border-black/40 px-3 py-2 text-right">Rp 16,000</td>
                                <td className="border-b border-black/40 px-3 py-2" />
                            </tr>

                            <tr>
                                <td className="border-b border-r border-black/40 px-3 py-2 font-bold">&nbsp;</td>
                                <td className="border-b border-r border-black/40 px-3 py-2 text-right font-semibold">
                                    Rp 42,746,000
                                </td>
                                <td className="border-b border-black/40 px-3 py-2 text-right font-semibold">
                                    Rp 49,407,800
                                </td>
                            </tr>
                            <tr>
                                <td className="border-r border-black/40 px-3 py-2 text-xl font-bold">
                                    HAK JNE {cabangUpper}
                                </td>
                                <td className="border-r border-black/40 px-3 py-2 text-right text-xl font-bold">
                                    Rp 6,661,800
                                </td>
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
        </AlcPageShell>
    );
}
