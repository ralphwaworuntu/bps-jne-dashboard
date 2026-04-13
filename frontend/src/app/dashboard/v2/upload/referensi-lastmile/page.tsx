"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Database,
    Upload,
    CheckCircle,
    FileText,
    Search,
    Filter,
    Loader2
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/v2/DashboardLayout';
import { API_URL } from '../../../../../config';
import { useToast } from '../../../../../context/ToastContext';

interface UploadCardProps {
    title: string;
    icon: any;
    description: string;
    colorClass: 'blue' | 'emerald' | 'orange' | 'purple' | 'rose' | 'cyan';
    file: File | null;
    uploading: boolean;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUpload: () => void;
    acceptedFiles?: string;
    isUploaded?: boolean;
    lastUpdated?: string;
    filename?: string;
}

function ReferenceUploadCard({ title, icon: Icon, description, colorClass, file, uploading, onFileChange, onUpload, acceptedFiles = ".xlsx, .xls, .csv", isUploaded, lastUpdated, filename }: UploadCardProps) {
    const colors = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', hoverborder: 'hover:border-blue-300', btn: 'bg-blue-600 hover:bg-blue-700' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', hoverborder: 'hover:border-emerald-300', btn: 'bg-emerald-600 hover:bg-emerald-700' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', hoverborder: 'hover:border-orange-300', btn: 'bg-orange-600 hover:bg-orange-700' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', hoverborder: 'hover:border-purple-300', btn: 'bg-purple-600 hover:bg-purple-700' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', hoverborder: 'hover:border-rose-300', btn: 'bg-rose-600 hover:bg-rose-700' },
        cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100', hoverborder: 'hover:border-cyan-300', btn: 'bg-cyan-600 hover:bg-cyan-700' },
    };

    const theme = colors[colorClass];

    return (
        <div className={`p-6 bg-white border ${theme.border} ${theme.hoverborder} rounded-2xl transition-all shadow-sm flex flex-col`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${theme.bg}`}>
                    <Icon className={`w-6 h-6 ${theme.text}`} />
                </div>
            </div>

            {/* Info */}
            <div className="mb-4 flex-1">
                <h3 className="font-bold text-foreground text-lg mb-1">{title}</h3>
                <p className="text-secondary text-sm">{description}</p>
            </div>

            {/* Simulated Status */}
            <div className={`mb-5 p-3 rounded-xl border flex items-start gap-2 ${isUploaded ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium mb-1 ${isUploaded ? 'text-emerald-700' : 'text-gray-400'}`}>
                        {isUploaded ? 'Status Upload' : 'Status Integrasi Tabel'}
                    </p>
                    {isUploaded ? (
                        <>
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800 mb-0.5 truncate">
                                <CheckCircle className="w-4 h-4" />
                                <span>Berhasil Diunggah</span>
                            </div>
                            <p className="text-xs text-emerald-600/80 truncate" title={filename || ''}>
                                {filename || 'File diunggah'}
                            </p>
                            <p className="text-[11px] text-emerald-600/60 mt-1">
                                {lastUpdated}
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-gray-500 truncate">Sistem Menunggu File</p>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-auto">
                <label className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl ${theme.bg} ${theme.text} hover:opacity-80 font-medium cursor-pointer transition-colors shadow-sm`}>
                    <Upload className="w-4 h-4" />
                    <span className="text-sm truncate">{file ? file.name : "Pilih File..."}</span>
                    <input type="file" accept={acceptedFiles} onChange={onFileChange} className="hidden" disabled={uploading} />
                </label>

                {file && (
                    <button
                        onClick={onUpload}
                        disabled={uploading}
                        className={`w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white ${theme.btn} transition-all disabled:opacity-70 disabled:cursor-not-allowed`}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Upload className="-ml-1 mr-2 h-4 w-4" />
                                Unggah Sekarang
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

export default function ReferensiLastmilePage() {
    const { showToast } = useToast();

    // File States
    const [slaLazadaFile, setSlaLazadaFile] = useState<File | null>(null);
    const [uploadingSlaLazada, setUploadingSlaLazada] = useState(false);

    const [serviceFile, setServiceFile] = useState<File | null>(null);
    const [uploadingService, setUploadingService] = useState(false);

    const [slaShopeeFile, setSlaShopeeFile] = useState<File | null>(null);
    const [uploadingSlaShopee, setUploadingSlaShopee] = useState(false);

    const [db1File, setDb1File] = useState<File | null>(null);
    const [uploadingDb1, setUploadingDb1] = useState(false);

    const [db2File, setDb2File] = useState<File | null>(null);
    const [uploadingDb2, setUploadingDb2] = useState(false);

    const [accountFile, setAccountFile] = useState<File | null>(null);
    const [uploadingAccount, setUploadingAccount] = useState(false);

    // Persistence State
    const [lastUpdateSlaLazada, setLastUpdateSlaLazada] = useState<string>("-");
    const [lastUpdateService, setLastUpdateService] = useState<string>("-");
    const [lastUpdateSlaShopee, setLastUpdateSlaShopee] = useState<string>("-");
    const [lastUpdateDb1, setLastUpdateDb1] = useState<string>("-");
    const [lastUpdateDb2, setLastUpdateDb2] = useState<string>("-");
    const [lastUpdateAccount, setLastUpdateAccount] = useState<string>("-");

    const [filenameSlaLazada, setFilenameSlaLazada] = useState<string>("-");
    const [filenameService, setFilenameService] = useState<string>("-");
    const [filenameSlaShopee, setFilenameSlaShopee] = useState<string>("-");
    const [filenameDb1, setFilenameDb1] = useState<string>("-");
    const [filenameDb2, setFilenameDb2] = useState<string>("-");
    const [filenameAccount, setFilenameAccount] = useState<string>("-");

    const [uploadProgress, setUploadProgress] = useState({
        slaLazada: false,
        service: false,
        slaShopee: false,
        db1: false,
        db2: false,
        account: false
    });

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + " • " + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    const fetchSystemInfo = async () => {
        try {
            const res = await fetch(`${API_URL}/system-info`);
            if (res.ok) {
                const data = await res.json();

                if (data.ref_sla_lazada_last_update) {
                    setLastUpdateSlaLazada(formatTime(data.ref_sla_lazada_last_update));
                    setUploadProgress(prev => ({ ...prev, slaLazada: true }));
                }
                setFilenameSlaLazada(data.ref_sla_lazada_filename || "-");

                if (data.ref_service_last_update) {
                    setLastUpdateService(formatTime(data.ref_service_last_update));
                    setUploadProgress(prev => ({ ...prev, service: true }));
                }
                setFilenameService(data.ref_service_filename || "-");

                if (data.ref_sla_shopee_last_update) {
                    setLastUpdateSlaShopee(formatTime(data.ref_sla_shopee_last_update));
                    setUploadProgress(prev => ({ ...prev, slaShopee: true }));
                }
                setFilenameSlaShopee(data.ref_sla_shopee_filename || "-");

                if (data.ref_db_1_last_update) {
                    setLastUpdateDb1(formatTime(data.ref_db_1_last_update));
                    setUploadProgress(prev => ({ ...prev, db1: true }));
                }
                setFilenameDb1(data.ref_db_1_filename || "-");

                if (data.ref_db_2_last_update) {
                    setLastUpdateDb2(formatTime(data.ref_db_2_last_update));
                    setUploadProgress(prev => ({ ...prev, db2: true }));
                }
                setFilenameDb2(data.ref_db_2_filename || "-");

                if (data.ref_account_last_update) {
                    setLastUpdateAccount(formatTime(data.ref_account_last_update));
                    setUploadProgress(prev => ({ ...prev, account: true }));
                }
                setFilenameAccount(data.ref_account_filename || "-");
            }
        } catch (error) {
            console.error("Failed fetching system info", error);
        }
    };

    useEffect(() => {
        fetchSystemInfo();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFileState: React.Dispatch<React.SetStateAction<File | null>>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFileState(e.target.files[0]);
        }
    };

    const uploadFile = async (
        file: File | null,
        endpoint: string,
        setUploading: React.Dispatch<React.SetStateAction<boolean>>,
        setFileState: React.Dispatch<React.SetStateAction<File | null>>,
        successMessage: string
    ) => {
        if (!file) {
            showToast("Batal: Pilih file untuk diunggah terlebih dahulu", 'error');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                showToast(successMessage, 'success');
                setFileState(null);
                fetchSystemInfo();
            } else {
                const err = await res.json();
                showToast(`Failed: ${err.detail || 'Data upload error'}`, 'error');
            }
        } catch (error) {
            console.error("Upload Error", error);
            showToast("Error gagal menghubungi server", 'error');
        } finally {
            setUploading(false);
        }
    };

    const [activeTab, setActiveTab] = useState('SLA Lazada');
    const tabs = ['SLA Lazada', 'SERVICE', 'SLA Shopee', 'Database 1', 'Database 2', 'Account'];
    const activeTabMap: Record<string, string> = {
        'SLA Lazada': 'sla_lazada',
        'SERVICE': 'service',
        'SLA Shopee': 'sla_shopee',
        'Database 1': 'db_1',
        'Database 2': 'db_2',
        'Account': 'account'
    };

    // Table State
    const [tableData, setTableData] = useState<any[]>([]);
    const [tableColumns, setTableColumns] = useState<string[]>([]);
    const [isLoadingTable, setIsLoadingTable] = useState(false);
    const [tableMessage, setTableMessage] = useState<string>("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchTableData = async (tabName: string) => {
        setIsLoadingTable(true);
        setTableData([]);
        setTableColumns([]);
        setTableMessage("");
        try {
            const refType = activeTabMap[tabName];
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/reference-data/${refType}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.data && data.data.length > 0) {
                    setTableData(data.data);
                    setTableColumns(data.columns);
                } else {
                    setTableMessage(data.message || "Tidak ada data.");
                }
            } else {
                setTableMessage("Gagal memuat data dari server.");
            }
        } catch (error) {
            console.error("Failed fetching table data", error);
            setTableMessage("Terjadi kesalahan jaringan.");
        } finally {
            setIsLoadingTable(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1); // Reset page when tab changes
        setSearchQuery(""); // Reset search when tab changes
        fetchTableData(activeTab);
    }, [activeTab]);

    // Data Processing for Pagination & Search
    const filteredData = tableData.filter(row => {
        if (!searchQuery) return true;
        return tableColumns.some(col =>
            String(row[col] || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

    return (
        <DashboardLayout>
            <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-gray-50/50">
                <div className="max-w-7xl mx-auto">
                    {/* Header Section */}
                    <div className="mb-8">
                        <Link href="/dashboard/v2/upload">
                            <button className="inline-flex items-center text-secondary hover:text-primary mb-2 transition-colors text-sm font-medium">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Upload Center
                            </button>
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Data Referensi Lastmile</h1>
                        <p className="text-secondary">Kelola file rujukan untuk otomatisasi rumus pada laporan Lastmile.</p>
                    </div>

                    {/* Upload Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-10">

                        <ReferenceUploadCard
                            title="Database SLA Lazada"
                            icon={Database}
                            description="Referensi referensi SLA khusus Lazada (.xlsx)"
                            colorClass="blue"
                            file={slaLazadaFile}
                            uploading={uploadingSlaLazada}
                            isUploaded={uploadProgress.slaLazada}
                            lastUpdated={lastUpdateSlaLazada}
                            filename={filenameSlaLazada}
                            onFileChange={(e) => handleFileChange(e, setSlaLazadaFile)}
                            onUpload={() => uploadFile(slaLazadaFile, 'upload-reference/sla_lazada', setUploadingSlaLazada, setSlaLazadaFile, "Database SLA Lazada diunggah!")}
                        />

                        <ReferenceUploadCard
                            title="Database SERVICE"
                            icon={FileText}
                            description="Tabel referensi master SERVICE JNE (.xlsx)"
                            colorClass="emerald"
                            file={serviceFile}
                            uploading={uploadingService}
                            isUploaded={uploadProgress.service}
                            lastUpdated={lastUpdateService}
                            filename={filenameService}
                            onFileChange={(e) => handleFileChange(e, setServiceFile)}
                            onUpload={() => uploadFile(serviceFile, 'upload-reference/service', setUploadingService, setServiceFile, "Database Service diunggah!")}
                        />

                        <ReferenceUploadCard
                            title="Database SLA Shopee"
                            icon={Database}
                            description="Referensi SLA khusus pengiriman Shopee (.xlsx)"
                            colorClass="orange"
                            file={slaShopeeFile}
                            uploading={uploadingSlaShopee}
                            isUploaded={uploadProgress.slaShopee}
                            lastUpdated={lastUpdateSlaShopee}
                            filename={filenameSlaShopee}
                            onFileChange={(e) => handleFileChange(e, setSlaShopeeFile)}
                            onUpload={() => uploadFile(slaShopeeFile, 'upload-reference/sla_shopee', setUploadingSlaShopee, setSlaShopeeFile, "Database SLA Shopee diunggah!")}
                        />

                        <ReferenceUploadCard
                            title="Database 1"
                            icon={FileText}
                            description="Tabel referensi tambahan 1 (.xlsx)"
                            colorClass="purple"
                            file={db1File}
                            uploading={uploadingDb1}
                            isUploaded={uploadProgress.db1}
                            lastUpdated={lastUpdateDb1}
                            filename={filenameDb1}
                            onFileChange={(e) => handleFileChange(e, setDb1File)}
                            onUpload={() => uploadFile(db1File, 'upload-reference/db_1', setUploadingDb1, setDb1File, "Database 1 diunggah!")}
                        />

                        <ReferenceUploadCard
                            title="Database 2"
                            icon={FileText}
                            description="Tabel referensi tambahan 2 (.xlsx)"
                            colorClass="rose"
                            file={db2File}
                            uploading={uploadingDb2}
                            isUploaded={uploadProgress.db2}
                            lastUpdated={lastUpdateDb2}
                            filename={filenameDb2}
                            onFileChange={(e) => handleFileChange(e, setDb2File)}
                            onUpload={() => uploadFile(db2File, 'upload-reference/db_2', setUploadingDb2, setDb2File, "Database 2 diunggah!")}
                        />

                        <ReferenceUploadCard
                            title="Account"
                            icon={Database}
                            description="Referensi akun dan pelanggan Lastmile (.xlsx)"
                            colorClass="cyan"
                            file={accountFile}
                            uploading={uploadingAccount}
                            isUploaded={uploadProgress.account}
                            lastUpdated={lastUpdateAccount}
                            filename={filenameAccount}
                            onFileChange={(e) => handleFileChange(e, setAccountFile)}
                            onUpload={() => uploadFile(accountFile, 'upload-reference/account', setUploadingAccount, setAccountFile, "Account diunggah!")}
                        />

                    </div>

                    {/* Table Section */}
                    <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden mb-10">
                        {/* Tabs Header */}
                        <div className="border-b border-border bg-gray-50/50">
                            <div className="flex overflow-x-auto hide-scrollbar">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`whitespace-nowrap px-6 py-4 text-sm font-semibold transition-colors border-b-2
                                            ${activeTab === tab
                                                ? 'border-blue-600 text-blue-600 bg-white'
                                                : 'border-transparent text-secondary hover:text-foreground hover:bg-gray-100/50'
                                            }
                                        `}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-secondary whitespace-nowrap">Show entries:</span>
                                <select
                                    className="text-sm border border-border rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-foreground"
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative w-full sm:w-64">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={`Search in ${activeTab}...`}
                                        className="w-full pl-10 pr-4 py-2 border border-border rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all bg-gray-50 text-foreground"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                    />
                                </div>
                                <button className="p-2 border border-border rounded-xl text-secondary hover:bg-gray-50 hover:text-foreground transition-all">
                                    <Filter className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-border">
                                        {tableColumns.length > 0 ? (
                                            tableColumns.map((col, i) => (
                                                <th key={i} className="py-4 px-6 text-sm font-semibold text-foreground whitespace-nowrap">
                                                    {col}
                                                </th>
                                            ))
                                        ) : (
                                            <>
                                                <th className="py-4 px-6 text-sm font-semibold text-foreground whitespace-nowrap">ID</th>
                                                <th className="py-4 px-6 text-sm font-semibold text-foreground whitespace-nowrap">Data Source</th>
                                                <th className="py-4 px-6 text-sm font-semibold text-foreground whitespace-nowrap">Key</th>
                                                <th className="py-4 px-6 text-sm font-semibold text-foreground whitespace-nowrap text-right">Value</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoadingTable ? (
                                        <tr>
                                            <td colSpan={tableColumns.length || 4} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center text-secondary">
                                                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
                                                    <p className="text-sm">Memuat data referensi...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginatedData.length > 0 ? (
                                        paginatedData.map((row, rowIndex) => (
                                            <tr key={rowIndex} className="border-b border-border hover:bg-gray-50/50 transition-colors">
                                                {tableColumns.map((col, colIndex) => (
                                                    <td key={colIndex} className="py-3 px-6 text-sm text-secondary truncate max-w-[200px]" title={String(row[col] || '')}>
                                                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={tableColumns.length || 4} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center text-secondary">
                                                    <Database className="w-12 h-12 text-gray-300 mb-3" />
                                                    <h3 className="text-lg font-medium text-gray-900 mb-1">Belum Ada Data</h3>
                                                    <p className="text-sm max-w-[250px]">{tableMessage || `Data untuk referensi ${activeTab} belum diunggah.`}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between text-sm text-secondary bg-gray-50/50 gap-4">
                            <p>Showing {filteredData.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + rowsPerPage, filteredData.length)} of {filteredData.length} entries (Preview limit: 1000)</p>
                            <div className="flex items-center gap-1">
                                <button
                                    className="px-3 py-1 border border-border rounded-lg disabled:opacity-50 hover:bg-gray-100 transition-colors"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1 || isLoadingTable}
                                >
                                    Previous
                                </button>
                                <button className="px-3 py-1 border border-blue-200 rounded-lg bg-blue-50 text-blue-600 font-medium">
                                    {currentPage}
                                </button>
                                <button
                                    className="px-3 py-1 border border-border rounded-lg disabled:opacity-50 hover:bg-gray-100 transition-colors"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0 || isLoadingTable}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
