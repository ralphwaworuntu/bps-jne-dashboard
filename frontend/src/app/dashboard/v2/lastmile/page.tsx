"use client";

import { motion } from 'framer-motion';
import { Database, FolderTree, ArrowLeft, ShieldAlert, Download, Loader2, Package, CalendarClock, MapPin, MapPinned, PackageCheck } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/v2/DashboardLayout';
import { API_URL } from '../../../../config';

export default function LastmilePageV2() {
    const [isDownloadingPotensiClaim, setIsDownloadingPotensiClaim] = useState(false);
    const [lastUpdateAllShipment, setLastUpdateAllShipment] = useState<string>('-');

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const res = await fetch(`${API_URL}/system-info`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
                if (res.ok) {
                    const data = await res.json();
                    const ts =
                        data.all_shipment_master_inbound_last_update ||
                        data.lastmile_last_update;
                    if (ts) {
                        const d = new Date(ts);
                        setLastUpdateAllShipment(
                            d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
                            ' • ' +
                            d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                        );
                    }
                }
            } catch (e) {
                console.error('Failed to fetch system info', e);
            }
        };
        fetchInfo();
    }, []);

    const handleDownloadPotensiClaim = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            setIsDownloadingPotensiClaim(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/download-potensi-claim`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ detail: 'Download failed' }));
                throw new Error(err.detail || 'Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;

            const disposition = response.headers.get('content-disposition');
            let filename = 'Database_Potensi_Claim.xlsx';
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Download error:', error);
            alert(error.message || 'Failed to download Database Potensi Claim');
        } finally {
            setIsDownloadingPotensiClaim(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-7xl">
                {/* Header Navigation */}
                <Link href="/dashboard/v2" className="inline-flex items-center text-muted-foreground hover:text-primary mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Link>

                <header className="mb-12">
                    <h1 className="text-4xl font-bold text-foreground">
                        Data Lastmile
                    </h1>
                    <p className="text-muted-foreground mt-2">Select a database to view or manage reports.</p>
                </header>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">

                    {/* All Shipment */}
                    <Link href="/dashboard/v2/lastmile/all-shipment" className="h-full">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative h-full overflow-hidden bg-white border border-border rounded-3xl p-6 cursor-pointer hover:shadow-lg transition-all"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Package className="w-32 h-32 text-indigo-600" />
                            </div>

                            <div className="relative z-10 flex flex-col h-full min-h-[200px] justify-between">
                                <div className="p-4 bg-indigo-50 w-fit rounded-2xl mb-6">
                                    <Package className="w-8 h-8 text-indigo-600" />
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">All Shipment</h2>
                                    <p className="text-muted-foreground mb-4">
                                        Database lengkap dari seluruh kiriman Lastmile.
                                    </p>

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-5">
                                        <CalendarClock className="w-3.5 h-3.5" />
                                        <span>Data Update : {lastUpdateAllShipment}</span>
                                    </div>

                                    <div className="flex w-fit items-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 px-5 py-2.5 rounded-xl border border-indigo-200">
                                        Lihat Database <Database className="w-4 h-4 ml-1" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>

                    {/* OPTION 2: Database OTS Cabang */}
                    <Link href="/dashboard/v2/lastmile/ots-cabang" className="h-full">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative h-full overflow-hidden bg-white border border-border rounded-3xl p-6 cursor-pointer hover:shadow-lg transition-all"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <FolderTree className="w-32 h-32 text-emerald-600" />
                            </div>

                            <div className="relative z-10 flex flex-col h-full min-h-[200px] justify-between">
                                <div className="p-4 bg-emerald-50 w-fit rounded-2xl mb-6">
                                    <FolderTree className="w-8 h-8 text-emerald-600" />
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">Database OTS Cabang</h2>
                                    <p className="text-muted-foreground mb-6">
                                        Branch-specific OTS data with granular breakdown and regional performance tracking.
                                    </p>
                                    <div className="flex w-fit items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-5 py-2.5 rounded-xl border border-emerald-200">
                                        Lihat Database <Database className="w-4 h-4 ml-1" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>

                    {/* OPTION 4: Potensi Claim Breach */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative h-full overflow-hidden bg-white border border-border rounded-3xl p-6 cursor-pointer hover:shadow-lg transition-all"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ShieldAlert className="w-32 h-32 text-rose-600" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full min-h-[200px] justify-between">
                            <div className="p-4 bg-rose-50 w-fit rounded-2xl mb-6">
                                <ShieldAlert className="w-8 h-8 text-rose-600" />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-foreground mb-2">Potensi Claim Breach</h2>
                                <p className="text-muted-foreground mb-6">
                                    Database pemantauan indikasi dan potensi klaim breach pada proses Lastmile.
                                </p>
                                <button
                                    onClick={handleDownloadPotensiClaim}
                                    disabled={isDownloadingPotensiClaim}
                                    className="flex w-fit items-center gap-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 px-5 py-2.5 rounded-xl transition-colors"
                                >
                                    {isDownloadingPotensiClaim ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Sedang Mengunduh...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" /> Download Database
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* OPTION 5: Cakupan Area Delivery KOE */}
                    <Link href="/dashboard/v2/lastmile/cakupan-area-delivery" className="h-full">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative h-full overflow-hidden bg-white border border-border rounded-3xl p-6 cursor-pointer hover:shadow-lg transition-all"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <MapPinned className="w-32 h-32 text-orange-600" />
                            </div>

                            <div className="relative z-10 flex flex-col h-full min-h-[200px] justify-between">
                                <div className="p-4 bg-orange-50 w-fit rounded-2xl mb-6">
                                    <MapPinned className="w-8 h-8 text-orange-600" />
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">
                                        Cakupan Area Delivery KOE
                                    </h2>
                                    <p className="text-muted-foreground mb-6">
                                        Master cakupan area delivery — upload & lihat data kecamatan/cabang.
                                    </p>
                                    <div className="flex items-center gap-2 text-sm font-medium text-orange-600 bg-orange-50 px-4 py-2 rounded-lg w-fit border border-orange-100">
                                        View Data & Upload
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>

                    {/* OPTION 6: Database Kiriman Yes */}
                    <Link href="/dashboard/v2/lastmile/database-kiriman-yes" className="h-full">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative h-full overflow-hidden bg-white border border-border rounded-3xl p-6 cursor-pointer hover:shadow-lg transition-all"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <PackageCheck className="w-32 h-32 text-emerald-600" />
                            </div>

                            <div className="relative z-10 flex flex-col h-full min-h-[200px] justify-between">
                                <div className="p-4 bg-emerald-50 w-fit rounded-2xl mb-6">
                                    <PackageCheck className="w-8 h-8 text-emerald-600" />
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">
                                        Database Kiriman Yes
                                    </h2>
                                    <p className="text-muted-foreground mb-6">
                                        Pivot DATABASE &amp; OTS per Cabang dengan filter STATUS POD.
                                    </p>
                                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg w-fit border border-emerald-100">
                                        View Data & Upload
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>

                    {/* Geotaging */}
                    <Link href="/dashboard/v2/geotagging" className="h-full">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative h-full overflow-hidden bg-white border border-border rounded-3xl p-6 cursor-pointer hover:shadow-lg transition-all"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <MapPin className="w-32 h-32 text-purple-600" />
                            </div>

                            <div className="relative z-10 flex flex-col h-full min-h-[200px] justify-between">
                                <div className="p-4 bg-purple-50 w-fit rounded-2xl mb-6">
                                    <MapPin className="w-8 h-8 text-purple-600" />
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">
                                        Geotaging
                                    </h2>
                                    <p className="text-muted-foreground mb-6">
                                        Kelola dan pantau data koordinat lokasi agen dan cabang.
                                    </p>
                                    <div className="flex items-center gap-2 text-sm font-medium text-purple-600 bg-purple-50 px-4 py-2 rounded-lg w-fit border border-purple-100">
                                        Lihat Database
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>

                </div>
            </div>
        </DashboardLayout>
    );
}
