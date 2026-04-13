"use client";

import { motion } from 'framer-motion';
import { Database, FolderTree, FileText, ArrowLeft, ShieldAlert, Download, Loader2, Package, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/v2/DashboardLayout';
import { API_URL } from '../../../../config';

export default function LastmilePageV2() {
    const [isDownloadingAllShipment, setIsDownloadingAllShipment] = useState(false);
    const [isDownloadingOts, setIsDownloadingOts] = useState(false);
    const [isDownloadingTransit, setIsDownloadingTransit] = useState(false);
    const [isDownloadingPotensiClaim, setIsDownloadingPotensiClaim] = useState(false);
    const [lastUpdateAllShipment, setLastUpdateAllShipment] = useState<string>('-');

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const res = await fetch(`${API_URL}/system-info`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.lastmile_last_update) {
                        const d = new Date(data.lastmile_last_update);
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

    const handleDownloadAllShipment = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const token = localStorage.getItem('token');
        // Direct stream download — no blob buffering for large files
        window.open(`${API_URL}/download/lastmile?token=${token}`, '_blank');
    };


    const handleDownloadOts = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            setIsDownloadingOts(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/download-database-ots`, {
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
            let filename = 'Database_OTS_Filtered.xlsx';
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
            alert(error.message || 'Failed to download Database OTS');
        } finally {
            setIsDownloadingOts(false);
        }
    };

    const handleDownloadTransit = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            setIsDownloadingTransit(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/download-database-transit`, {
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
            let filename = 'Database_Transit_Manifest.xlsx';
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
            alert(error.message || 'Failed to download Database Transit Manifest');
        } finally {
            setIsDownloadingTransit(false);
        }
    };

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
            <div className="max-w-6xl mx-auto">
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                    {/* All Shipment */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative overflow-hidden bg-white border border-border rounded-3xl p-8 cursor-pointer hover:shadow-lg transition-all"
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

                                <button
                                    onClick={handleDownloadAllShipment}
                                    disabled={isDownloadingAllShipment}
                                    className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-5 py-2.5 rounded-xl transition-colors"
                                >
                                    {isDownloadingAllShipment ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Sedang Mengunduh...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" /> Download All Shipment
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Database OTS */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative overflow-hidden bg-white border border-border rounded-3xl p-8 cursor-pointer hover:shadow-lg transition-all"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Database className="w-32 h-32 text-primary" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full min-h-[200px] justify-between">
                            <div className="p-4 bg-blue-50 w-fit rounded-2xl mb-6">
                                <Database className="w-8 h-8 text-blue-600" />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-foreground mb-2">Database OTS</h2>
                                <p className="text-muted-foreground mb-6">
                                    Centralized Operational Time Service database for overall performance monitoring.
                                </p>

                                <button
                                    onClick={handleDownloadOts}
                                    disabled={isDownloadingOts}
                                    className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-5 py-2.5 rounded-xl transition-colors"
                                >
                                    {isDownloadingOts ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Sedang Mengunduh...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" /> Download Database OTS
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* OPTION 2: Database OTS Cabang */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative overflow-hidden bg-white border border-border rounded-3xl p-8 cursor-pointer hover:shadow-lg transition-all"
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
                                <Link
                                    href="/dashboard/v2/lastmile/ots-cabang"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex w-fit items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-5 py-2.5 rounded-xl transition-colors border border-emerald-200"
                                >
                                    Lihat Database <Database className="w-4 h-4 ml-1" />
                                </Link>
                            </div>
                        </div>
                    </motion.div>

                    {/* OPTION 3: Database Transit Manifest */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative overflow-hidden bg-white border border-border rounded-3xl p-8 cursor-pointer hover:shadow-lg transition-all md:col-span-2 lg:col-span-1"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <FileText className="w-32 h-32 text-purple-600" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full min-h-[200px] justify-between">
                            <div className="p-4 bg-purple-50 w-fit rounded-2xl mb-6">
                                <FileText className="w-8 h-8 text-purple-600" />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-foreground mb-2">Database Transit Manifest</h2>
                                <p className="text-muted-foreground mb-6">
                                    Comprehensive records of transit manifests for tracking shipment movements between hubs.
                                </p>
                                <button
                                    onClick={handleDownloadTransit}
                                    disabled={isDownloadingTransit}
                                    className="flex items-center gap-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 px-5 py-2.5 rounded-xl transition-colors"
                                >
                                    {isDownloadingTransit ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Sedang Mengunduh...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" /> Download Transit Manifest
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* OPTION 4: Potensi Claim Breach */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative overflow-hidden bg-white border border-border rounded-3xl p-8 cursor-pointer hover:shadow-lg transition-all"
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

                </div>
            </div>
        </DashboardLayout>
    );
}
