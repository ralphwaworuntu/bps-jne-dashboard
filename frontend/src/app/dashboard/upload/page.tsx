
"use client";

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, Download, ChevronLeft, CheckCircle, AlertTriangle, BarChart3, History, RefreshCw, Play, User, PowerOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_URL } from '../../../config';
import { useToast } from '../../../context/ToastContext';

export default function UploadPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [user, setUser] = useState<any>(null);

    // File States
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const [allShipmentFile, setAllShipmentFile] = useState<File | null>(null);
    const [uploadingAllShipment, setUploadingAllShipment] = useState(false);

    const [firstmileFile, setFirstmileFile] = useState<File | null>(null);
    const [uploadingFirstmile, setUploadingFirstmile] = useState(false);

    // Persistence State
    const [lastUpdateMaster, setLastUpdateMaster] = useState<string>("Loading...");
    const [lastUpdateLastmile, setLastUpdateLastmile] = useState<string>("-");
    const [lastUpdateFirstmile, setLastUpdateFirstmile] = useState<string>("-");

    const [masterFilename, setMasterFilename] = useState<string>("-");
    const [lastmileFilename, setLastmileFilename] = useState<string>("-");
    const [firstmileFilename, setFirstmileFilename] = useState<string>("-");

    const [uploadProgress, setUploadProgress] = useState({
        master: false,
        lastmile: false,
        firstmile: false
    });

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + " • " + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    // Auth & System Info
    const fetchSystemInfo = async () => {
        try {
            const res = await fetch(`${API_URL}/system-info`);
            if (res.ok) {
                const data = await res.json();

                if (data.master_last_update) {
                    setLastUpdateMaster(formatTime(data.master_last_update));
                    setUploadProgress(prev => ({ ...prev, master: true }));
                } else {
                    setLastUpdateMaster("-");
                    setUploadProgress(prev => ({ ...prev, master: false }));
                }
                setMasterFilename(data.master_filename || "-");

                if (data.lastmile_last_update) {
                    setLastUpdateLastmile(formatTime(data.lastmile_last_update));
                    setUploadProgress(prev => ({ ...prev, lastmile: true }));
                } else {
                    setLastUpdateLastmile("-");
                    setUploadProgress(prev => ({ ...prev, lastmile: false }));
                }
                setLastmileFilename(data.lastmile_filename || "-");

                if (data.firstmile_last_update) {
                    setLastUpdateFirstmile(formatTime(data.firstmile_last_update));
                    setUploadProgress(prev => ({ ...prev, firstmile: true }));
                } else {
                    setLastUpdateFirstmile("-");
                    setUploadProgress(prev => ({ ...prev, firstmile: false }));
                }
                setFirstmileFilename(data.firstmile_filename || "-");
            }
        } catch (error) {
            console.error("Failed to fetch system info", error);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        // Get User
        fetch(`${API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => setUser(data))
            .catch(() => router.push('/login'));

        // Get System Info
        fetchSystemInfo();

    }, [router]);



    // Handlers
    const MAX_SIZE = 300 * 1024 * 1024; // 300MB

    const validateFile = (file: File) => {
        if (file.size > MAX_SIZE) {
            showToast(`File terlalu besar! Maksimum 300MB. Ukuran file: ${(file.size / (1024 * 1024)).toFixed(2)}MB`, 'error');
            return false;
        }
        return true;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            if (validateFile(e.target.files[0])) {
                setFile(e.target.files[0]);
            } else {
                e.target.value = ""; // Reset input
            }
        }
    };

    const handleAllShipmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            if (validateFile(e.target.files[0])) {
                setAllShipmentFile(e.target.files[0]);
            } else {
                e.target.value = "";
            }
        }
    };

    const handleFirstmileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            if (validateFile(e.target.files[0])) {
                setFirstmileFile(e.target.files[0]);
            } else {
                e.target.value = "";
            }
        }
    };

    const handleDownload = async (type: 'master' | 'lastmile' | 'firstmile') => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/download/${type}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = type === 'master' ? 'master_data.xlsx' : type === 'lastmile' ? 'allshipment_lastmile.xlsx' : 'allshipment_firstmile.xlsx';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } else {
                showToast("File belum tersedia untuk didownload", 'error');
            }
        } catch (error) {
            console.error("Download failed", error);
            showToast("Gagal mendownload file", 'error');
        }
    };

    const handleUploadMaster = async () => {
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/upload-master`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const data = await response.json();
            showToast("Upload Data Apex Successful!", 'success');

            // Update UI immediately (optimistic)
            const now = new Date();
            const timeString = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + " • " + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            setLastUpdateMaster(timeString);
            setMasterFilename(data.filename || file.name);
            setUploadProgress(prev => ({ ...prev, master: true }));
            setFile(null); // Clear input
            // Reset file input value manually to allow same file upload
            const fileInput = document.querySelector('input[type="file"][accept=".xlsx, .xls"]');
            if (fileInput) (fileInput as HTMLInputElement).value = "";

            // Sync with server
            fetchSystemInfo();

        } catch (error) {
            showToast("Upload Failed", 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleUploadLastmile = async () => {
        if (!allShipmentFile) return;
        setUploadingAllShipment(true);
        const formData = new FormData();
        formData.append('file', allShipmentFile);
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/upload-allshipment`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: response.statusText }));
                throw new Error(errorData.detail || "Upload failed");
            }

            const data = await response.json();
            showToast("Upload DB Lastmile Successful!", 'success');

            const now = new Date();
            const timeString = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + " • " + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            setLastUpdateLastmile(timeString);
            setLastmileFilename(data.filename || allShipmentFile.name);

            setUploadProgress(prev => ({ ...prev, lastmile: true }));
            setAllShipmentFile(null);
            // Reset file input value manually
            const fileInputs = document.querySelectorAll('input[type="file"]');
            if (fileInputs[1]) (fileInputs[1] as HTMLInputElement).value = "";

        } catch (error: any) {
            console.error("Upload Error:", error);
            showToast(`Upload Failed: ${error.message || "Unknown error"}`, 'error');
        } finally {
            setUploadingAllShipment(false);
        }
    };

    const handleUploadFirstmile = async () => {
        if (!firstmileFile) return;
        setUploadingFirstmile(true);
        const formData = new FormData();
        formData.append('file', firstmileFile);
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/upload-allshipment-firstmile`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (!response.ok) throw new Error("Upload failed");

            const data = await response.json();
            showToast("Upload DB Firstmile Successful!", 'success');

            const now = new Date();
            const timeString = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + " • " + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            setLastUpdateFirstmile(timeString);
            setFirstmileFilename(data.filename || firstmileFile.name);

            setUploadProgress(prev => ({ ...prev, firstmile: true }));
            setFirstmileFile(null);
            // Reset file input value manually
            const fileInputs = document.querySelectorAll('input[type="file"]');
            if (fileInputs[2]) (fileInputs[2] as HTMLInputElement).value = "";

        } catch (error) {
            showToast("Upload Failed", 'error');
        } finally {
            setUploadingFirstmile(false);
        }
    };


    const handleTakedown = async (category: string) => {
        if (!confirm(`Are you sure you want to Takedown (deactivate) ${category}?`)) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/takedown/${encodeURIComponent(category)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                showToast(`${category} successfully taken down`, 'success');
                // Update Local State
                if (category === 'Master Data') {
                    setLastUpdateMaster("-");
                    setMasterFilename("-");
                    setUploadProgress(prev => ({ ...prev, master: false }));
                } else if (category === 'Lastmile DB') {
                    setLastUpdateLastmile("-");
                    setLastmileFilename("-");
                    setUploadProgress(prev => ({ ...prev, lastmile: false }));
                } else if (category === 'Firstmile DB') {
                    setLastUpdateFirstmile("-");
                    setFirstmileFilename("-");
                    setUploadProgress(prev => ({ ...prev, firstmile: false }));
                }

                fetchSystemInfo();
            } else {
                const err = await res.json();
                showToast(`Failed: ${err.detail}`, 'error');
            }
        } catch (error) {
            console.error("Takedown failed", error);
            showToast("Gagal melakukan takedown", 'error');
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-white selection:bg-purple-500/30 font-sans">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                                <ChevronLeft className="w-5 h-5 text-slate-400" />
                            </button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                Upload Center
                            </h1>
                            <p className="text-slate-400 text-sm">Manage Master and Shipment Databases</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* CARD 1: MASTER DATA */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-400" />
                                Upload Data Apex
                            </h2>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                    {uploadProgress.master && (
                                        <>
                                            <button
                                                onClick={() => handleTakedown('Master Data')}
                                                className="p-1.5 bg-red-500/10 border border-red-500/20 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                                                title="Takedown File"
                                            >
                                                <PowerOff className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDownload('master')}
                                                className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded hover:bg-blue-500/20 text-blue-400 transition-colors"
                                                title="Download Master Data"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Current File Preview */}
                        {uploadProgress.master && (
                            <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-4">
                                <div className="p-3 bg-blue-500/20 rounded-lg">
                                    <FileSpreadsheet className="w-8 h-8 text-blue-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-blue-100">Master Data Apex</p>
                                    <p className="text-xs text-blue-300 mt-1 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Last Updated: {lastUpdateMaster}
                                    </p>
                                    <p className="text-xs text-blue-300/70 mt-0.5">
                                        {masterFilename}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors group cursor-pointer relative bg-white/[0.02]">
                            <div className="flex flex-col items-center gap-4 group-hover:scale-105 transition-transform">
                                <FileSpreadsheet className="w-12 h-12 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                <div>
                                    <p className="text-lg font-medium text-slate-200">
                                        {file ? file.name : "Drop new file to update"}
                                    </p>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {file ? `${(file.size / 1024).toFixed(2)} KB` : "or click to browse"}
                                    </p>
                                </div>
                            </div>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                        </div>

                        <button
                            onClick={handleUploadMaster}
                            disabled={!file || uploading}
                            className={`mt-6 w-full py-3 rounded-xl font-medium transition-all ${!file || uploading
                                ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25 text-white'
                                }`}
                        >
                            {uploading ? 'Processing...' : 'Process Data'}
                        </button>
                    </div>

                    {/* CARD 2: LASTMILE */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Upload className="w-5 h-5 text-emerald-400" />
                                Upload DB Lastmile
                            </h2>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                    {uploadProgress.lastmile && (
                                        <>
                                            <button
                                                onClick={() => handleTakedown('Lastmile DB')}
                                                className="p-1.5 bg-red-500/10 border border-red-500/20 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                                                title="Takedown File"
                                            >
                                                <PowerOff className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDownload('lastmile')}
                                                className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                                                title="Download Lastmile Data"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Current File Preview */}
                        {uploadProgress.lastmile && (
                            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/20 rounded-lg">
                                    <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-emerald-100">AllShipment Lastmile</p>
                                    <p className="text-xs text-emerald-300 mt-1 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Last Updated: {lastUpdateLastmile}
                                    </p>
                                    <p className="text-xs text-emerald-300/70 mt-0.5">
                                        {lastmileFilename}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-colors group cursor-pointer relative bg-white/[0.02]">
                            <div className="flex flex-col items-center gap-4 group-hover:scale-105 transition-transform">
                                <FileSpreadsheet className="w-12 h-12 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                                <div>
                                    <p className="text-lg font-medium text-slate-200">
                                        {allShipmentFile ? allShipmentFile.name : "Drop new file to update"}
                                    </p>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {allShipmentFile ? `${(allShipmentFile.size / 1024).toFixed(2)} KB` : "or click to browse"}
                                    </p>
                                </div>
                            </div>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleAllShipmentChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                        </div>

                        <button
                            onClick={handleUploadLastmile}
                            disabled={!allShipmentFile || uploadingAllShipment}
                            className={`mt-6 w-full py-3 rounded-xl font-medium transition-all ${!allShipmentFile || uploadingAllShipment
                                ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25 text-white'
                                }`}
                        >
                            {uploadingAllShipment ? 'Uploading...' : 'Upload Database'}
                        </button>
                    </div>

                    {/* CARD 3: FIRSTMILE */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Upload className="w-5 h-5 text-orange-400" />
                                Upload DB Firstmile
                            </h2>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                    {uploadProgress.firstmile && (
                                        <>
                                            <button
                                                onClick={() => handleTakedown('Firstmile DB')}
                                                className="p-1.5 bg-red-500/10 border border-red-500/20 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                                                title="Takedown File"
                                            >
                                                <PowerOff className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDownload('firstmile')}
                                                className="p-1.5 bg-orange-500/10 border border-orange-500/20 rounded hover:bg-orange-500/20 text-orange-400 transition-colors"
                                                title="Download Firstmile Data"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Current File Preview */}
                        {uploadProgress.firstmile && (
                            <div className="mb-6 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-center gap-4">
                                <div className="p-3 bg-orange-500/20 rounded-lg">
                                    <FileSpreadsheet className="w-8 h-8 text-orange-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-orange-100">AllShipment Firstmile</p>
                                    <p className="text-xs text-orange-300 mt-1 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Last Updated: {lastUpdateFirstmile}
                                    </p>
                                    <p className="text-xs text-orange-300/70 mt-0.5">
                                        {firstmileFilename}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-purple-500/50 transition-colors group cursor-pointer relative bg-white/[0.02]">
                            <div className="flex flex-col items-center gap-4 group-hover:scale-105 transition-transform">
                                <FileSpreadsheet className="w-12 h-12 text-slate-500 group-hover:text-purple-400 transition-colors" />
                                <div>
                                    <p className="text-lg font-medium text-slate-200">
                                        {firstmileFile ? firstmileFile.name : "Drop new file to update"}
                                    </p>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {firstmileFile ? `${(firstmileFile.size / 1024).toFixed(2)} KB` : "or click to browse"}
                                    </p>
                                </div>
                            </div>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFirstmileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                        </div>

                        <button
                            onClick={handleUploadFirstmile}
                            disabled={!firstmileFile || uploadingFirstmile}
                            className={`mt-6 w-full py-3 rounded-xl font-medium transition-all ${!firstmileFile || uploadingFirstmile
                                ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-500/25 text-white'
                                }`}
                        >
                            {uploadingFirstmile ? 'Uploading...' : 'Upload Database'}
                        </button>
                    </div>

                </div>

                {/* HISTORY SECTION */}
                <HistorySection />

            </div>
        </main>
    );
}



function HistorySection() {
    const { showToast } = useToast();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [reprocessing, setReprocessing] = useState<string | null>(null);

    // Filters
    const [filters, setFilters] = useState({
        filename: '',
        category: '',
        uploaded_by: '',
        date: ''
    });

    // Extract Unique Values for Dropdowns
    const uniqueFilenames = useMemo(() => Array.from(new Set(history.map(item => item.original_filename || item.filename).filter(Boolean))), [history]);
    const uniqueUsers = useMemo(() => Array.from(new Set(history.map(item => item.uploaded_by).filter(Boolean))), [history]);
    const uniqueDates = useMemo(() => Array.from(new Set(history.map(item => item.upload_date).filter(Boolean))), [history]);

    const filteredHistory = history.filter(item => {
        const itemFilename = item.original_filename || item.filename;
        const matchFilename = filters.filename === '' || itemFilename === filters.filename;
        const matchCategory = filters.category === '' || item.category === filters.category;
        const matchUser = filters.uploaded_by === '' || item.uploaded_by === filters.uploaded_by;
        const matchDate = filters.date === '' || item.upload_date === filters.date;
        return matchFilename && matchCategory && matchUser && matchDate;
    });

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/upload-history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleReprocess = async (item: any) => {
        if (!confirm(`Are you sure you want to reprocess ${item.filename}? This will overwrite the current active data.`)) return;

        setReprocessing(item.filename);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/reprocess/${encodeURIComponent(item.category)}/${encodeURIComponent(item.filename)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                showToast("File successfully reprocessed!", 'success');
                fetchHistory();
                window.location.reload();
            } else {
                const err = await res.json();
                showToast(`Failed: ${err.detail}`, 'error');
            }
        } catch (e) {
            showToast("Error reprocessing file", 'error');
        } finally {
            setReprocessing(null);
        }
    };

    const handleDownload = async (item: any) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/download/history/${encodeURIComponent(item.category)}/${encodeURIComponent(item.filename)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = item.filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } else {
                showToast("File not found", 'error');
            }
        } catch (error) {
            console.error("Download failed", error);
            showToast("Gagal mendownload file", 'error');
        }
    };

    const handleTakedown = async (item: any) => {
        if (!confirm(`Are you sure you want to Takedown (deactivate) ${item.filename}? The file will be moved to archive.`)) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/takedown/${encodeURIComponent(item.category)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                showToast("File successfully taken down", 'success');
                fetchHistory();
            } else {
                const err = await res.json();
                showToast(`Failed: ${err.detail}`, 'error');
            }
        } catch (error) {
            console.error("Takedown failed", error);
            showToast("Gagal melakukan takedown", 'error');
        }
    };

    const getCategoryColor = (cat: string) => {
        if (cat === 'Master Data') return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
        if (cat === 'Lastmile DB') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    };

    return (
        <div className="mt-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-700/50 rounded-lg">
                        <History className="w-6 h-6 text-slate-300" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Upload History</h2>
                        <p className="text-slate-400 text-sm">List of previously uploaded files</p>
                    </div>
                </div>
                <button
                    onClick={fetchHistory}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white"
                    title="Refresh List"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-slate-900/50 text-slate-300">
                        <tr>
                            <th className="px-6 py-4">
                                <div className="mb-2">File Name</div>
                                <select
                                    className="w-full bg-slate-800 border-none rounded text-xs p-2 text-slate-300 focus:ring-1 focus:ring-blue-500 max-w-[200px]"
                                    value={filters.filename}
                                    onChange={(e) => setFilters({ ...filters, filename: e.target.value })}
                                >
                                    <option value="">All Files</option>
                                    {uniqueFilenames.map((name: any) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </th>
                            <th className="px-6 py-4 min-w-[200px]">
                                <div className="mb-2">Category</div>
                                <select
                                    className="w-full bg-slate-800 border-none rounded text-xs p-2 text-slate-300 focus:ring-1 focus:ring-blue-500"
                                    value={filters.category}
                                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                >
                                    <option value="">All Categories</option>
                                    <option value="Master Data">Master Data</option>
                                    <option value="Lastmile DB">Lastmile DB</option>
                                    <option value="Firstmile DB">Firstmile DB</option>
                                    <option value="Daily Issue">Daily Issue</option>
                                </select>
                            </th>
                            <th className="px-6 py-4">
                                <div className="mb-2">Uploaded By</div>
                                <select
                                    className="w-full bg-slate-800 border-none rounded text-xs p-2 text-slate-300 focus:ring-1 focus:ring-blue-500"
                                    value={filters.uploaded_by}
                                    onChange={(e) => setFilters({ ...filters, uploaded_by: e.target.value })}
                                >
                                    <option value="">All Users</option>
                                    {uniqueUsers.map((user: any) => (
                                        <option key={user} value={user}>{user}</option>
                                    ))}
                                </select>
                            </th>
                            <th className="px-6 py-4">
                                <div className="mb-2">Upload Date</div>
                                <select
                                    className="w-full bg-slate-800 border-none rounded text-xs p-2 text-slate-300 focus:ring-1 focus:ring-blue-500"
                                    value={filters.date}
                                    onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                                >
                                    <option value="">All Dates</option>
                                    {uniqueDates.map((date: any) => (
                                        <option key={date} value={date}>{date}</option>
                                    ))}
                                </select>
                            </th>
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-200">
                        {filteredHistory.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                    {history.length === 0 ? "No history available." : "No matching records found."}
                                </td>
                            </tr>
                        ) : (
                            filteredHistory.map((item, idx) => (
                                <tr key={idx} className={`hover:bg-white/5 transition-colors ${item.is_active ? 'bg-indigo-500/5' : ''}`}>
                                    <td className="px-6 py-4 font-medium flex items-center gap-3">
                                        <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                                        <span>
                                            {item.original_filename || item.filename}
                                            {item.is_active && (
                                                <span className="ml-2 text-[10px] uppercase font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                                                    Active
                                                </span>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getCategoryColor(item.category)}`}>
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <User className="w-4 h-4 text-slate-500" />
                                            <span className="truncate max-w-[150px]" title={item.uploaded_by}>
                                                {item.uploaded_by || 'Unknown'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">
                                        {item.upload_date}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {item.is_active && (
                                                <button
                                                    onClick={() => handleTakedown(item)}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                                    title="Takedown File"
                                                >
                                                    <PowerOff className="w-4 h-4" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDownload(item)}
                                                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                                                title="Download File"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => handleReprocess(item)}
                                                disabled={reprocessing === item.filename}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${reprocessing === item.filename
                                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                    : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
                                                    }`}
                                            >
                                                {reprocessing === item.filename ? (
                                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Play className="w-3 h-3" />
                                                )}
                                                Reupload
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
