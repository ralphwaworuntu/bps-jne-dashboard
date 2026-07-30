"use client";

import { useState, useEffect, useMemo, Fragment, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Search, Loader2, Upload, X, Plus, Minus } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/v2/DashboardLayout';
import { useToast } from '@/context/ToastContext';
import { API_URL } from '../../../../config';

interface GeotaggingRow {
    'Cnote': string;
    'Status': string;
    'Address': string;
    'URL Photo': string;
    'KET POD': string;
    'KONFIRMASI FOTO POD': string;
    'UPDATE GEOTAGG': string;
    'KET GEOTAGG': string;
    'KONFIRMASI/ISSUE/KENDALA': string;
    'Status Code': string;
    'Courier Name': string;
}

export default function GeotaggingPage() {
    const [data, setData] = useState<GeotaggingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [totalRows, setTotalRows] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [facets, setFacets] = useState<{ Status: string[]; "Status Code": string[]; "Courier Name": string[] }>({
        Status: [],
        "Status Code": [],
        "Courier Name": [],
    });
    const { showToast } = useToast();

    // Pagination (server-side)
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    // Image Modal State
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Upload State
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Edit State for Dropdowns
    // Key: Cnote, Value: { [fieldName]: newValue }
    const [editedFields, setEditedFields] = useState<Record<string, Record<string, string>>>({});

    // Expanded Rows State
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (cnote: string) => {
        setExpandedRows(prev => ({
            ...prev,
            [cnote]: !prev[cnote]
        }));
    };

    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [filterStatusCode, setFilterStatusCode] = useState<string>("ALL");
    const [filterCourierName, setFilterCourierName] = useState<string>("ALL");

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => window.clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, filterStatus, filterStatusCode, filterCourierName, rowsPerPage]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                page: String(currentPage),
                limit: String(rowsPerPage),
            });
            if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
            if (filterStatus !== 'ALL') params.set('status', filterStatus);
            if (filterStatusCode !== 'ALL') params.set('status_code', filterStatusCode);
            if (filterCourierName !== 'ALL') params.set('courier', filterCourierName);
            const res = await fetch(`${API_URL}/api/geotagging?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                throw new Error("Gagal mengambil data geotagging.");
            }
            const result = await res.json();
            const items = Array.isArray(result) ? result : (result.items || []);
            setData(items);
            setTotalRows(Array.isArray(result) ? items.length : (result.total || 0));
            setTotalPages(Array.isArray(result) ? 1 : (result.pages || 0));
            if (result.facets) setFacets(result.facets);
            setError(null);
        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan.");
        } finally {
            setLoading(false);
        }
    }, [currentPage, rowsPerPage, debouncedSearch, filterStatus, filterStatusCode, filterCourierName]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openUploadModal = () => {
        setSelectedUploadFile(null);
        setIsDraggingFile(false);
        setIsUploadModalOpen(true);
    };

    const closeUploadModal = () => {
        if (uploading) return;
        setIsUploadModalOpen(false);
        setSelectedUploadFile(null);
        setIsDraggingFile(false);
        if (uploadInputRef.current) uploadInputRef.current.value = "";
    };

    const acceptUploadFile = (file: File | null | undefined) => {
        if (!file) return;

        const lower = file.name.toLowerCase();
        if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
            showToast("Format file harus .csv / .xlsx", "error");
            return;
        }
        setSelectedUploadFile(file);
    };

    const handleUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        e.target.value = "";
        acceptUploadFile(file);
    };

    const handleDropZoneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (uploading) return;
        setIsDraggingFile(true);
    };

    const handleDropZoneDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingFile(false);
    };

    const handleDropZoneDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingFile(false);
        if (uploading) return;
        acceptUploadFile(e.dataTransfer.files?.[0]);
    };

    const handleUploadSubmit = async () => {
        if (!selectedUploadFile) {
            showToast("Pilih file Geotaging terlebih dahulu", "error");
            return;
        }

        setUploading(true);
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("file", selectedUploadFile);
            const res = await fetch(`${API_URL}/upload-geotagging`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Upload gagal" }));
                throw new Error(err.detail || "Upload gagal");
            }
            showToast("Upload Geotaging berhasil", "success");
            setIsUploadModalOpen(false);
            setSelectedUploadFile(null);
            if (currentPage === 1) {
                await fetchData();
            } else {
                setCurrentPage(1);
            }
        } catch (err: any) {
            showToast(err.message || "Upload gagal", "error");
        } finally {
            setUploading(false);
        }
    };

    const uniqueStatuses = facets.Status || [];
    const uniqueStatusCodes = facets["Status Code"] || [];
    const uniqueCouriers = facets["Courier Name"] || [];

    const filteredData = data;

    const groupedData = useMemo(() => {
        const result: { parent: GeotaggingRow, children: GeotaggingRow[] }[] = [];
        const groupIndexMap: Record<string, number> = {};

        filteredData.forEach(row => {
            const photo = row['URL Photo'] || '';
            const geotagg = row['UPDATE GEOTAGG'] || '';

            if (photo && geotagg) {
                const key = `${photo}|${geotagg}`;
                if (groupIndexMap[key] !== undefined) {
                    result[groupIndexMap[key]].children.push(row);
                } else {
                    groupIndexMap[key] = result.length;
                    result.push({ parent: row, children: [] });
                }
            } else {
                result.push({ parent: row, children: [] });
            }
        });
        return result;
    }, [filteredData]);

    const handleFieldChange = (cnote: string, field: 'KET GEOTAGG' | 'KET POD' | 'KONFIRMASI/ISSUE/KENDALA' | 'KONFIRMASI FOTO POD', value: string) => {
        setEditedFields(prev => ({
            ...prev,
            [cnote]: {
                ...prev[cnote],
                [field]: value
            }
        }));
    };

    const handleSaveField = async (cnote: string, field: string, value: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/geotagging/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    Cnote: cnote,
                    Field: field,
                    Value: value
                })
            });

            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.detail || "Gagal menyimpan perubahan");
            }

            showToast(result.message || `Berhasil menyimpan ${field}`, 'success');
        } catch (err: any) {
            showToast(err.message || "Gagal menyimpan perubahan", 'error');
        }
    };

    // Pagination: data sudah dipotong di server; grouping hanya pada halaman ini
    const currentGroups = groupedData;
    const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
    const indexOfLastRow = Math.min(currentPage * rowsPerPage, totalRows);
    const pageCount = Math.max(totalPages, 1);
    const TABLE_COLS = 12;

    return (
        <DashboardLayout>
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-5 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Link
                        href="/dashboard/v2/lastmile"
                        className="inline-flex items-center text-muted-foreground transition-colors hover:text-primary"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Lastmile Data
                    </Link>

                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Database Geotaging</h1>
                            <p className="text-secondary mt-1">Kelola dan pantau data koordinat lokasi agen dan cabang.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={openUploadModal}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-sm font-semibold transition-colors border border-emerald-100"
                            >
                                <Upload className="w-4 h-4" />
                                Upload Data Geotag
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        showToast("Memproses data ekspor...", "info");
                                        const token = localStorage.getItem('token');
                                        const res = await fetch(`${API_URL}/api/geotagging/export`, {
                                            headers: {
                                                'Authorization': `Bearer ${token}`
                                            }
                                        });

                                        if (!res.ok) {
                                            const errorData = await res.json().catch(() => ({}));
                                            throw new Error(errorData.detail || "Gagal mengunduh file ekspor");
                                        }

                                        const blob = await res.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = "Geotagging_Updated_Data.csv";
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        document.body.removeChild(a);

                                        showToast("Berhasil mengunduh data ekspor", "success");
                                    } catch (err: any) {
                                        showToast(err.message || "Gagal mengekspor data", "error");
                                    }
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-sm font-semibold transition-colors border border-indigo-100"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Export Data
                            </button>
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">

                        {/* Toolbar */}
                        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                                <input
                                    type="text"
                                    placeholder="Cari Cnote, Status, Keterangan..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1); // Reset to page 1 on search
                                    }}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>

                            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => {
                                        setFilterStatus(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="px-3 py-2 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shrink-0"
                                >
                                    <option value="ALL">Semua Status</option>
                                    {uniqueStatuses.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>

                                <select
                                    value={filterStatusCode}
                                    onChange={(e) => {
                                        setFilterStatusCode(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="px-3 py-2 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shrink-0"
                                >
                                    <option value="ALL">Semua Status Code</option>
                                    {uniqueStatusCodes.map(code => (
                                        <option key={code} value={code}>{code}</option>
                                    ))}
                                </select>

                                <select
                                    value={filterCourierName}
                                    onChange={(e) => {
                                        setFilterCourierName(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="px-3 py-2 bg-white border border-border rounded-xl text-sm max-w-[200px] truncate focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shrink-0"
                                >
                                    <option value="ALL">Semua Kurir</option>
                                    {uniqueCouriers.map(courier => (
                                        <option key={courier} value={courier}>{courier}</option>
                                    ))}
                                </select>

                                <div className="hidden md:block w-px h-8 bg-border"></div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-sm text-secondary">Tampilkan:</span>
                                    <select
                                        value={rowsPerPage}
                                        onChange={(e) => {
                                            setRowsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="px-3 py-1.5 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 border-l border-border pl-3">
                                    <span className="text-sm font-semibold text-purple-700 px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-lg">
                                        Total Data: {totalRows} Group
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] border border-border rounded-xl shadow-sm bg-white">
                            <table className="w-full text-sm text-left relative">
                                <thead className="bg-gray-50 text-secondary font-medium whitespace-nowrap sticky top-0 z-20 shadow-[0_1px_0_0_#e5e7eb]">
                                    <tr>
                                        <th className="px-6 py-4 bg-gray-50 w-12"></th>
                                        <th className="px-6 py-4 bg-gray-50">CNOTE</th>
                                        <th className="px-6 py-4 bg-gray-50">STATUS</th>
                                        <th className="px-6 py-4 bg-gray-50">FOTO POD</th>
                                        <th className="px-6 py-4 bg-gray-50">KET POD</th>
                                        <th className="px-6 py-4 bg-gray-50">KONFIRMASI FOTO POD</th>
                                        <th className="px-6 py-4 bg-gray-50">UPDATE GEOTAGG</th>
                                        <th className="px-6 py-4 bg-gray-50 bg-gray-50 min-w-[250px]">ADDRESS</th>
                                        <th className="px-6 py-4 bg-gray-50">KET GEOTAGG</th>
                                        <th className="px-6 py-4 bg-gray-50">KONFIRMASI GEOTAGG</th>
                                        <th className="px-6 py-4 bg-gray-50">STATUS CODE</th>
                                        <th className="px-6 py-4 bg-gray-50 min-w-[200px]">COURIER NAME</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={TABLE_COLS} className="py-16 text-center">
                                                <div className="flex flex-col items-center justify-center p-6 text-center">
                                                    <Loader2 className="size-8 text-primary animate-spin mb-4" />
                                                    <h3 className="text-lg font-semibold text-foreground mb-1">Memuat Data Geotaging</h3>
                                                    <p className="text-secondary text-sm max-w-sm mb-6">Harap tunggu sebentar...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : error ? (
                                        <tr>
                                            <td colSpan={TABLE_COLS} className="py-16 text-center">
                                                <div className="flex flex-col items-center justify-center p-6 text-center">
                                                    <div className="size-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
                                                        <MapPin className="size-8" />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-foreground mb-1">Gagal Memuat</h3>
                                                    <p className="text-secondary text-sm max-w-sm mb-6">{error}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : currentGroups.length === 0 ? (
                                        <tr>
                                            <td colSpan={TABLE_COLS} className="py-16 text-center">
                                                <div className="flex flex-col items-center justify-center p-6 text-center">
                                                    <div className="size-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
                                                        <MapPin className="size-8" />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-foreground mb-1">Tidak Ada Data</h3>
                                                    <p className="text-secondary text-sm max-w-sm mb-6">
                                                        {searchTerm ? "Data yang Anda cari tidak ditemukan." : "Silakan unggah file Excel Geotaging melalui menu Upload Center untuk melihat data."}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        currentGroups.map((group, idx) => {
                                            const row = group.parent;
                                            const hasChildren = group.children.length > 0;
                                            return (
                                                <Fragment key={idx}>
                                                    <tr className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap border-r border-border/50 text-center">
                                                            {hasChildren ? (
                                                                <button
                                                                    onClick={() => toggleRow(row['Cnote'])}
                                                                    className="p-1 rounded-lg hover:bg-gray-200 text-secondary transition-colors"
                                                                    title={expandedRows[row['Cnote']] ? "Tutup detail" : "Buka detail"}
                                                                >
                                                                    {expandedRows[row['Cnote']] ? <Minus size={18} /> : <Plus size={18} />}
                                                                </button>
                                                            ) : (
                                                                <span className="text-secondary opacity-30">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    onClick={() => hasChildren && toggleRow(row['Cnote'])}
                                                                    className={hasChildren ? "cursor-pointer hover:text-primary hover:underline underline-offset-2 transition-all" : ""}
                                                                    title={hasChildren ? (expandedRows[row['Cnote']] ? "Tutup detail" : "Buka detail") : undefined}
                                                                >
                                                                    {row['Cnote']}
                                                                </span>
                                                                {hasChildren && (
                                                                    <span
                                                                        onClick={() => toggleRow(row['Cnote'])}
                                                                        className="cursor-pointer px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 rounded-md text-xs font-semibold transition-all"
                                                                        title={`Terdapat ${group.children.length} resi tambahan. Klik untuk ${expandedRows[row['Cnote']] ? "tutup" : "buka"} detail.`}
                                                                    >
                                                                        (+{group.children.length})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${row['Status']?.toUpperCase() === 'VALID' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-700 border-gray-100'}`}>
                                                                {row['Status']?.toUpperCase() || 'UNKNOWN'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {row['URL Photo'] ? (
                                                                <div
                                                                    className="w-16 h-16 relative rounded-lg overflow-hidden border border-border shadow-sm cursor-pointer group"
                                                                    onClick={() => setSelectedImage(row['URL Photo'])}
                                                                    title="Klik untuk memperbesar gambar"
                                                                >
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img
                                                                        src={row['URL Photo']}
                                                                        alt={`Foto ${row['Cnote']}`}
                                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <span className="text-secondary text-xs italic">Tidak ada foto</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 min-w-[200px] text-sm text-secondary">
                                                            <select
                                                                value={editedFields[row['Cnote']]?.['KET POD']?.toUpperCase() || row['KET POD']?.toUpperCase() || ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.toUpperCase();
                                                                    handleFieldChange(row['Cnote'], 'KET POD', val);
                                                                    handleSaveField(row['Cnote'], 'KET POD', val);
                                                                }}
                                                                className="w-full px-3 py-1.5 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                                                            >
                                                                <option value="">PILIH STATUS</option>
                                                                <option value="VALID">VALID</option>
                                                                <option value="TIDAK VALID">TIDAK VALID</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-6 py-4 min-w-[200px] text-sm text-secondary">
                                                            <input
                                                                type="text"
                                                                placeholder="KETIK KONFIRMASI..."
                                                                value={editedFields[row['Cnote']]?.['KONFIRMASI FOTO POD'] ?? row['KONFIRMASI FOTO POD'] ?? ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.toUpperCase();
                                                                    handleFieldChange(row['Cnote'], 'KONFIRMASI FOTO POD', val);
                                                                }}
                                                                onBlur={(e) => handleSaveField(row['Cnote'], 'KONFIRMASI FOTO POD', e.target.value.toUpperCase())}
                                                                className="w-full px-3 py-1.5 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {row['UPDATE GEOTAGG'] ? (
                                                                <a
                                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row['UPDATE GEOTAGG'])}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors border border-indigo-100"
                                                                >
                                                                    <MapPin className="w-4 h-4" /> Cek Peta
                                                                </a>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-secondary min-w-[250px]">
                                                            {row['Address'] || '-'}
                                                        </td>
                                                        <td className="px-6 py-4 min-w-[200px] text-sm text-secondary">
                                                            <select
                                                                value={editedFields[row['Cnote']]?.['KET GEOTAGG']?.toUpperCase() || row['KET GEOTAGG']?.toUpperCase() || ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.toUpperCase();
                                                                    handleFieldChange(row['Cnote'], 'KET GEOTAGG', val);
                                                                    handleSaveField(row['Cnote'], 'KET GEOTAGG', val);
                                                                }}
                                                                className="w-full px-3 py-1.5 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                                                            >
                                                                <option value="">PILIH STATUS</option>
                                                                <option value="VALID">VALID</option>
                                                                <option value="TIDAK VALID">TIDAK VALID</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-6 py-4 min-w-[200px] text-sm text-secondary">
                                                            <input
                                                                type="text"
                                                                placeholder="KETIK KONFIRMASI..."
                                                                value={editedFields[row['Cnote']]?.['KONFIRMASI/ISSUE/KENDALA'] ?? row['KONFIRMASI/ISSUE/KENDALA'] ?? ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.toUpperCase();
                                                                    handleFieldChange(row['Cnote'], 'KONFIRMASI/ISSUE/KENDALA', val);
                                                                }}
                                                                onBlur={(e) => handleSaveField(row['Cnote'], 'KONFIRMASI/ISSUE/KENDALA', e.target.value.toUpperCase())}
                                                                className="w-full px-3 py-1.5 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                                                            {row['Status Code'] || '-'}
                                                        </td>
                                                        <td className="px-6 py-4 min-w-[200px] text-sm text-secondary">
                                                            {row['Courier Name'] || '-'}
                                                        </td>
                                                    </tr>
                                                    {expandedRows[row['Cnote']] && hasChildren && (
                                                        <tr className="bg-gray-50/40 border-b border-border">
                                                            <td colSpan={TABLE_COLS} className="p-0">
                                                                <div className="overflow-x-auto bg-gray-50 p-4 border-t border-b border-border shadow-inner">
                                                                    <table className="w-full text-sm text-left border border-border/50 rounded-lg bg-white overflow-hidden shadow-sm">
                                                                        <thead className="bg-gray-100/50 text-secondary font-medium border-b border-border/50 whitespace-nowrap text-xs">
                                                                            <tr>
                                                                                <th className="px-4 py-3">CNOTE</th>
                                                                                <th className="px-4 py-3">STATUS</th>
                                                                                <th className="px-4 py-3">FOTO POD</th>
                                                                                <th className="px-4 py-3">KET POD</th>
                                                                                <th className="px-4 py-3">KONFIRMASI FOTO POD</th>
                                                                                <th className="px-4 py-3">UPDATE GEOTAGG</th>
                                                                                <th className="px-4 py-3 min-w-[250px]">ADDRESS</th>
                                                                                <th className="px-4 py-3">KET GEOTAGG</th>
                                                                                <th className="px-4 py-3">KONFIRMASI GEOTAGG</th>
                                                                                <th className="px-4 py-3">STATUS CODE</th>
                                                                                <th className="px-4 py-3 min-w-[200px]">COURIER NAME</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-border/50">
                                                                            {group.children.map((childRow, childIdx) => (
                                                                                <tr key={childIdx} className="hover:bg-gray-50/80 transition-colors">
                                                                                    <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">{childRow['Cnote']}</td>
                                                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                                                        <span className={`px-2 py-1 rounded-full text-[11px] font-semibold border ${childRow['Status']?.toUpperCase() === 'VALID' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-700 border-gray-100'}`}>
                                                                                            {childRow['Status']?.toUpperCase() || 'UNKNOWN'}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-4 py-3">
                                                                                        {childRow['URL Photo'] ? (
                                                                                            <div
                                                                                                className="w-12 h-12 relative rounded-lg overflow-hidden border border-border shadow-sm cursor-pointer group"
                                                                                                onClick={() => setSelectedImage(childRow['URL Photo'])}
                                                                                                title="Klik untuk memperbesar gambar"
                                                                                            >
                                                                                                <img
                                                                                                    src={childRow['URL Photo']}
                                                                                                    alt={`Foto ${childRow['Cnote']}`}
                                                                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                                                                />
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className="text-secondary text-[11px] italic">Tidak ada foto</span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 min-w-[150px] text-sm text-secondary">
                                                                                        <select
                                                                                            value={editedFields[childRow['Cnote']]?.['KET POD']?.toUpperCase() || childRow['KET POD']?.toUpperCase() || ""}
                                                                                            onChange={(e) => {
                                                                                                const val = e.target.value.toUpperCase();
                                                                                                handleFieldChange(childRow['Cnote'], 'KET POD', val);
                                                                                                handleSaveField(childRow['Cnote'], 'KET POD', val);
                                                                                            }}
                                                                                            className="w-full px-2 py-1.5 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                                                                                        >
                                                                                            <option value="">PILIH STATUS</option>
                                                                                            <option value="VALID">VALID</option>
                                                                                            <option value="TIDAK VALID">TIDAK VALID</option>
                                                                                        </select>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 min-w-[150px] text-sm text-secondary">
                                                                                        <input
                                                                                            type="text"
                                                                                            placeholder="KETIK KONFIRMASI..."
                                                                                            value={editedFields[childRow['Cnote']]?.['KONFIRMASI FOTO POD'] ?? childRow['KONFIRMASI FOTO POD'] ?? ""}
                                                                                            onChange={(e) => {
                                                                                                const val = e.target.value.toUpperCase();
                                                                                                handleFieldChange(childRow['Cnote'], 'KONFIRMASI FOTO POD', val);
                                                                                            }}
                                                                                            onBlur={(e) => handleSaveField(childRow['Cnote'], 'KONFIRMASI FOTO POD', e.target.value.toUpperCase())}
                                                                                            className="w-full px-2 py-1.5 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                                                                                        />
                                                                                    </td>
                                                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                                                        {childRow['UPDATE GEOTAGG'] ? (
                                                                                            <a
                                                                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(childRow['UPDATE GEOTAGG'])}`}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-medium transition-colors border border-indigo-100"
                                                                                            >
                                                                                                <MapPin className="w-3.5 h-3.5" /> Cek Peta
                                                                                            </a>
                                                                                        ) : '-'}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-sm text-secondary min-w-[250px]">
                                                                                        {childRow['Address'] || '-'}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 min-w-[150px] text-sm text-secondary">
                                                                                        <select
                                                                                            value={editedFields[childRow['Cnote']]?.['KET GEOTAGG']?.toUpperCase() || childRow['KET GEOTAGG']?.toUpperCase() || ""}
                                                                                            onChange={(e) => {
                                                                                                const val = e.target.value.toUpperCase();
                                                                                                handleFieldChange(childRow['Cnote'], 'KET GEOTAGG', val);
                                                                                                handleSaveField(childRow['Cnote'], 'KET GEOTAGG', val);
                                                                                            }}
                                                                                            className="w-full px-2 py-1.5 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                                                                                        >
                                                                                            <option value="">PILIH STATUS</option>
                                                                                            <option value="VALID">VALID</option>
                                                                                            <option value="TIDAK VALID">TIDAK VALID</option>
                                                                                        </select>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 min-w-[150px] text-sm text-secondary">
                                                                                        <input
                                                                                            type="text"
                                                                                            placeholder="KETIK KONFIRMASI..."
                                                                                            value={editedFields[childRow['Cnote']]?.['KONFIRMASI/ISSUE/KENDALA'] ?? childRow['KONFIRMASI/ISSUE/KENDALA'] ?? ""}
                                                                                            onChange={(e) => {
                                                                                                const val = e.target.value.toUpperCase();
                                                                                                handleFieldChange(childRow['Cnote'], 'KONFIRMASI/ISSUE/KENDALA', val);
                                                                                            }}
                                                                                            onBlur={(e) => handleSaveField(childRow['Cnote'], 'KONFIRMASI/ISSUE/KENDALA', e.target.value.toUpperCase())}
                                                                                            className="w-full px-2 py-1.5 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                                                                                        />
                                                                                    </td>
                                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">
                                                                                        {childRow['Status Code'] || '-'}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 min-w-[200px] text-sm text-secondary">
                                                                                        {childRow['Courier Name'] || '-'}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {!loading && !error && filteredData.length > 0 && (
                            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50 border-t border-border">
                                <span className="text-sm text-secondary">
                                    Displaying <span className="font-medium text-foreground">{Math.min(indexOfFirstRow + 1, totalRows)}</span> to <span className="font-medium text-foreground">{Math.min(indexOfLastRow, totalRows)}</span> of <span className="font-medium text-foreground">{totalRows}</span> groups
                                </span>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 rounded-lg border border-border bg-white text-sm font-medium text-secondary hover:bg-gray-50 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Previous
                                    </button>

                                    <div className="flex items-center px-2 text-sm font-medium text-foreground">
                                        Page {currentPage} of {pageCount}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageCount))}
                                        disabled={currentPage === pageCount}
                                        className="px-3 py-1.5 rounded-lg border border-border bg-white text-sm font-medium text-secondary hover:bg-gray-50 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Upload Modal Popup */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                <Upload className="w-5 h-5 text-emerald-600" />
                                Upload Data Geotag
                            </h3>
                            <button
                                type="button"
                                onClick={closeUploadModal}
                                disabled={uploading}
                                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Tarik file ke area di bawah atau pilih manual, lalu klik Upload.
                            </p>

                            <div
                                onDragOver={handleDropZoneDragOver}
                                onDragLeave={handleDropZoneDragLeave}
                                onDrop={handleDropZoneDrop}
                                onClick={() => {
                                    if (!uploading) uploadInputRef.current?.click();
                                }}
                                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                                    isDraggingFile
                                        ? "border-emerald-400 bg-emerald-50"
                                        : selectedUploadFile
                                            ? "border-emerald-200 bg-emerald-50/40"
                                            : "border-border bg-gray-50/60 hover:border-emerald-300 hover:bg-emerald-50/40"
                                } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                            >
                                <div className="rounded-2xl bg-emerald-50 p-3">
                                    <Upload className="h-6 w-6 text-emerald-600" />
                                </div>
                                {selectedUploadFile ? (
                                    <div className="space-y-1">
                                        <p className="max-w-[280px] truncate text-sm font-semibold text-foreground">
                                            {selectedUploadFile.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {(selectedUploadFile.size / 1024 / 1024).toFixed(2)} MB — klik untuk ganti file
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-foreground">
                                            {isDraggingFile ? "Lepaskan file di sini" : "Drag & drop file di sini"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            atau klik untuk memilih — .csv / .xlsx / .xls
                                        </p>
                                    </div>
                                )}
                                <input
                                    ref={uploadInputRef}
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    className="hidden"
                                    onChange={handleUploadFileChange}
                                    disabled={uploading}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeUploadModal}
                                    disabled={uploading}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUploadSubmit}
                                    disabled={!selectedUploadFile || uploading}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 transition-colors"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Mengunggah...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" />
                                            Upload
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Modal Popup */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
                    onClick={() => setSelectedImage(null)}
                >
                    <div
                        className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <h3 className="text-lg font-semibold text-gray-900">Detail Foto</h3>
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50/50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={selectedImage}
                                alt="Foto Geotagging Diperbesar"
                                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm border border-gray-200"
                            />
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
