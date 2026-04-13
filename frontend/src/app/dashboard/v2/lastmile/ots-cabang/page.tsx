"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, RefreshCw, FolderTree, ChevronDown, Loader2, Package, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/v2/DashboardLayout';
import StatsCard from '@/components/dashboard/v2/StatsCard';
import { API_URL } from '../../../../../config';

export default function OtsCabangLastmilePageV2() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error("No authentication token");

            const res = await fetch(`${API_URL}/api/ots-lastmile-cabang`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to fetch data");
            const json = await res.json();
            setData(json.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDownload = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Not authenticated');
            return;
        }

        setDownloading(true);

        try {
            const response = await fetch(`${API_URL}/export/ots-lastmile-cabang`, {
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
            let filename = 'database_ots_cabang.csv';
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
            setDownloading(false);
        }
    };

    const [filters, setFilters] = useState({
        awb: '',
        date: '',
        origin: '',
        dest: '',
        lt: '',
        shipment: '',
        type2: '',
        val_fm: '',
        val_lm: '',
        val_cabang: ''
    });

    const [filterUnReceiving, setFilterUnReceiving] = useState(false);

    const filteredData = data.filter(row => {
        // If UN Receiving filter is active, only show rows where RECEIVING is empty/null
        if (filterUnReceiving) {
            if (row["RECEIVING"]) return false; // If has value, skip
        }

        return (
            (filters.awb === '' || String(row["AWB"] || '') === filters.awb) &&
            (filters.date === '' || String(row["TGL_ENTRY"] || '') === filters.date) &&
            (filters.origin === '' || String(row["Cabang Origin"] || '') === filters.origin) &&
            (filters.dest === '' || String(row["Cabang Destinasi"] || '') === filters.dest) &&
            (filters.lt === '' || String(row["LT"] || '') === filters.lt) &&
            (filters.shipment === '' || String(row["Shipment Type"] || '') === filters.shipment) &&
            (filters.type2 === '' || String(row["Shipment Type 2"] || '') === filters.type2) &&
            (filters.val_fm === '' || String(row["Validasi Status Proses Firstmile"] || '') === filters.val_fm) &&
            (filters.val_lm === '' || String(row["Validasi Status Proses Lastmile Destinasi"] || '') === filters.val_lm) &&
            (filters.val_cabang === '' || String(row["Validasi Cabang"] || '') === filters.val_cabang)
        );
    });

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const getUniqueOptions = (key: string) => {
        const unique = new Set<string>();
        data.forEach(row => {
            const val = String(row[key] || '');
            if (val) unique.add(val);
        });
        return Array.from(unique).sort();
    };

    const topScrollRef = useRef<HTMLDivElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [scrollWidth, setScrollWidth] = useState(0);

    useEffect(() => {
        if (tableContainerRef.current) {
            setScrollWidth(tableContainerRef.current.scrollWidth);
        }
    }, [data, loading]);

    const handleScrollTop = (e: React.UIEvent<HTMLDivElement>) => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    const handleScrollTable = (e: React.UIEvent<HTMLDivElement>) => {
        if (topScrollRef.current) {
            topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/dashboard/v2/lastmile" className="inline-flex items-center text-muted-foreground hover:text-primary mb-4 transition-colors group">
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Back to Lastmile Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">Lastmile OTS Cabang</h1>
                    </div>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div onClick={() => setFilterUnReceiving(!filterUnReceiving)} className="cursor-pointer transition-transform hover:scale-105 active:scale-95">
                        <StatsCard
                            title="UN RECEIVING"
                            count={data.filter(r => !r["RECEIVING"]).length}
                            icon={Package}
                            href="#"
                            colorClass={filterUnReceiving ? "text-white bg-blue-500" : "text-blue-500"}
                            subtext="Menunggu Receiving (Klik untuk filter)"
                        />
                    </div>
                    <StatsCard
                        title="UN OM"
                        count={data.filter(r => r["Validasi Status Proses Firstmile"] === "UN OM").length}
                        icon={Clock}
                        href="#"
                        colorClass="text-orange-500"
                        subtext="Menunggu Outbound"
                    />
                    <StatsCard
                        title="UN IM"
                        count={data.filter(r => r["Validasi Status Proses Firstmile"] === "UN IM").length}
                        icon={AlertCircle}
                        href="#"
                        colorClass="text-purple-500"
                        subtext="Menunggu Inbound"
                    />
                    <StatsCard
                        title="UN SM"
                        count={data.filter(r => r["Validasi Status Proses Firstmile"] === "UN SM").length}
                        icon={CheckCircle}
                        href="#"
                        colorClass="text-emerald-500"
                        subtext="Menunggu SM"
                    />
                </div>

                <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 rounded-xl">
                                <FolderTree className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Database OTS Cabang</h2>
                                <p className="text-muted-foreground text-sm">Filtered Lastmile data for Branch Operations</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleDownload}
                                disabled={downloading}
                                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download className={`w-4 h-4 mr-2 ${downloading ? 'animate-bounce' : ''}`} />
                                {downloading ? "Downloading..." : "Download Database"}
                            </motion.button>
                            <button
                                onClick={fetchData}
                                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                                title="Refresh Data"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-600" />
                            <p>Loading data...</p>
                        </div>
                    ) : error ? (
                        <div className="h-64 flex flex-col items-center justify-center text-red-500">
                            <p>Error: {error}</p>
                            <button onClick={fetchData} className="mt-4 text-primary underline">Try Again</button>
                        </div>
                    ) : (
                        <>
                            {/* Top Scrollbar */}
                            <div
                                ref={topScrollRef}
                                className="overflow-x-auto pb-2 mb-1 custom-scrollbar"
                                onScroll={handleScrollTop}
                            >
                                <div style={{ width: scrollWidth, height: '1px' }}></div>
                            </div>

                            <div
                                ref={tableContainerRef}
                                className="overflow-x-auto rounded-xl border border-border custom-scrollbar"
                                onScroll={handleScrollTable}
                            >
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-muted/50 text-muted-foreground sticky top-0 bg-white z-10">
                                        <tr>
                                            {[
                                                { label: "AWB", key: "awb", col: "AWB" },
                                                { label: "TGL ENTRY", key: "date", col: "TGL_ENTRY" },
                                                { label: "Origin", key: "origin", col: "Cabang Origin" },
                                                { label: "Dest", key: "dest", col: "Cabang Destinasi" },
                                                { label: "Status LT", key: "lt", col: "LT" },
                                                { label: "Shipment", key: "shipment", col: "Shipment Type" },
                                                { label: "Type 2", key: "type2", col: "Shipment Type 2" },
                                                { label: "Val FM", key: "val_fm", col: "Validasi Status Proses Firstmile" },
                                                { label: "Val LM", key: "val_lm", col: "Validasi Status Proses Lastmile Destinasi" },
                                                { label: "Val Cabang", key: "val_cabang", col: "Validasi Cabang" },
                                            ].map((header) => (
                                                <th key={header.key} className="px-6 py-4 whitespace-nowrap bg-muted/30">
                                                    <div className="flex items-center gap-4 group cursor-pointer">
                                                        <span>{header.label}</span>
                                                        <div className="relative">
                                                            <div className={`p-1 rounded ${filters[header.key as keyof typeof filters] ? 'bg-emerald-100 text-emerald-600' : 'text-muted-foreground group-hover:text-foreground'} transition-colors`}>
                                                                <ChevronDown className="w-4 h-4" />
                                                            </div>
                                                            <select
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-foreground"
                                                                value={filters[header.key as keyof typeof filters]}
                                                                onChange={(e) => handleFilterChange(header.key, e.target.value)}
                                                            >
                                                                <option value="">All</option>
                                                                {getUniqueOptions(header.col).map((opt, i) => (
                                                                    <option key={i} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border text-foreground">
                                        {filteredData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 font-medium">{row["AWB"]}</td>
                                                <td className="px-6 py-4 text-muted-foreground">{row["TGL_ENTRY"]}</td>
                                                <td className="px-6 py-4">{row["Cabang Origin"]}</td>
                                                <td className="px-6 py-4">{row["Cabang Destinasi"]}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${(() => {
                                                        const lt = String(row["LT"] || "");
                                                        if (lt === "H+0") return "bg-emerald-100 text-emerald-600 border border-emerald-200";
                                                        return "bg-red-100 text-red-600 border border-red-200";
                                                    })()
                                                        }`}>
                                                        {row["LT"]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">{row["Shipment Type"]}</td>
                                                <td className="px-6 py-4">{row["Shipment Type 2"]}</td>
                                                <td className="px-6 py-4">{row["Validasi Status Proses Firstmile"]}</td>
                                                <td className="px-6 py-4">{row["Validasi Status Proses Lastmile Destinasi"]}</td>
                                                <td className="px-6 py-4">{row["Validasi Cabang"]}</td>
                                            </tr>
                                        ))}
                                        {data.length === 0 && (
                                            <tr>
                                                <td colSpan={10} className="px-6 py-12 text-center text-muted-foreground">
                                                    No data available matching filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
