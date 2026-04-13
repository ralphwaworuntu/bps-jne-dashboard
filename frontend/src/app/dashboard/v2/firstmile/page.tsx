"use client";

import { motion } from 'framer-motion';
import { ArrowLeft, FileSpreadsheet, Database, FolderTree, Download } from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/v2/DashboardLayout';
import { API_URL } from '../../../../config';
import { useState } from 'react';

export default function FirstmilePageV2() {
    const [downloadingAll, setDownloadingAll] = useState(false);
    const [downloadingOTS, setDownloadingOTS] = useState(false);

    const handleDownloadAll = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Not authenticated');
            return;
        }

        setDownloadingAll(true);
        try {
            const response = await fetch(`${API_URL}/download/firstmile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'allshipment_firstmile.xlsx';
            if (contentDisposition) {
                const matches = /filename="?([^"]+)"?/.exec(contentDisposition);
                if (matches && matches[1]) {
                    filename = matches[1];
                }
            }

            const date = new Date();
            const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

            const dotIndex = filename.lastIndexOf('.');
            if (dotIndex !== -1) {
                const name = filename.substring(0, dotIndex);
                const ext = filename.substring(dotIndex);
                filename = `${name}_${dateStr}${ext}`;
            } else {
                filename = `${filename}_${dateStr}`;
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error: any) {
            console.error("Download error:", error);
            alert(`Download failed: ${error.message}`);
        } finally {
            setDownloadingAll(false);
        }
    };

    const handleDownloadOTS = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Not authenticated');
            return;
        }

        setDownloadingOTS(true);
        try {
            const response = await fetch(`${API_URL}/export/ots-firstmile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'database_ots_firstmile.csv';
            if (contentDisposition) {
                const matches = /filename="?([^"]+)"?/.exec(contentDisposition);
                if (matches && matches[1]) {
                    filename = matches[1];
                }
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error: any) {
            console.error("Download error:", error);
            alert(`Download failed: ${error.message}`);
        } finally {
            setDownloadingOTS(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <Link href="/dashboard/v2" className="inline-flex items-center text-muted-foreground hover:text-primary mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Link>

                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-foreground">
                        Data Firstmile
                    </h1>
                    <p className="text-muted-foreground mt-2">Upload raw Excel data to automatically clean and filter based on strict business rules.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                    {/* OPTION 1: All Database */}
                    <div className="group relative overflow-hidden bg-white border border-border rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Database className="w-32 h-32 text-purple-600" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full min-h-[200px] justify-between">
                            <div className="p-4 bg-purple-50 w-fit rounded-2xl mb-6">
                                <Database className="w-8 h-8 text-purple-600" />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-foreground mb-2">All Database</h2>
                                <p className="text-muted-foreground mb-6">
                                    Download data Firstmile yang sudah di upload sebelumnya.
                                </p>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleDownloadAll}
                                    disabled={downloadingAll}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {downloadingAll ? (
                                        <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Loading...</span>
                                    ) : (
                                        <>
                                            <FileSpreadsheet className="w-4 h-4" />
                                            Download Database
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    {/* OPTION 2: Database OTS */}
                    <div className="group relative overflow-hidden bg-white border border-border rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <FileSpreadsheet className="w-32 h-32 text-orange-600" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full min-h-[200px] justify-between">
                            <div className="p-4 bg-orange-50 w-fit rounded-2xl mb-6">
                                <FileSpreadsheet className="w-8 h-8 text-orange-600" />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-foreground mb-2">Database OTS</h2>
                                <p className="text-muted-foreground mb-6">
                                    Operational Time Service data for Firstmile process.
                                </p>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleDownloadOTS}
                                    disabled={downloadingOTS}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg text-white font-medium hover:from-orange-500 hover:to-red-500 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {downloadingOTS ? (
                                        <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Loading...</span>
                                    ) : (
                                        <>
                                            <FileSpreadsheet className="w-4 h-4" />
                                            Download Database
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    {/* OPTION 3: Database OTS Cabang */}
                    <Link href="/dashboard/v2/firstmile/ots-cabang">
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
                                        Branch-specific Firstmile OTS data breakdown.
                                    </p>
                                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg w-fit border border-emerald-100">
                                        View Data & Download
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
