"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Upload,
    FileSpreadsheet,
    Download,
    CheckCircle,
    AlertTriangle,
    History,
    RefreshCw,
    PowerOff,
    Trash2,
    Database,
    FileText,
    Filter,
    User,
    RotateCw,
    ArrowLeft,
    MapPin,
    BookOpen,
    X
} from 'lucide-react';
import { API_URL } from '../../../../config';
import { useToast } from '../../../../context/ToastContext';
import DashboardLayout from '@/components/dashboard/v2/DashboardLayout';
import DateFilter from '@/components/dashboard/v2/DateFilter';

export default function UploadPageV2() {
    const router = useRouter();
    const { showToast } = useToast();

    // File States
    const [isRefModalOpen, setIsRefModalOpen] = useState(false);

    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const [master117File, setMaster117File] = useState<File | null>(null);
    const [uploadingMaster117, setUploadingMaster117] = useState(false);

    const [apexOtsFile, setApexOtsFile] = useState<File | null>(null);
    const [uploadingApexOts, setUploadingApexOts] = useState(false);

    const [apexTransitFile, setApexTransitFile] = useState<File | null>(null);
    const [uploadingApexTransit, setUploadingApexTransit] = useState(false);

    const [allShipmentFile, setAllShipmentFile] = useState<File | null>(null);
    const [uploadingAllShipment, setUploadingAllShipment] = useState(false);

    const [allShipLastmileFile, setAllShipLastmileFile] = useState<File | null>(null);
    const [uploadingAllShipLastmile, setUploadingAllShipLastmile] = useState(false);

    const [firstmileFile, setFirstmileFile] = useState<File | null>(null);
    const [uploadingFirstmile, setUploadingFirstmile] = useState(false);

    const [geotaggingFile, setGeotaggingFile] = useState<File | null>(null);
    const [uploadingGeotagging, setUploadingGeotagging] = useState(false);

    const [dbCccFile, setDbCccFile] = useState<File | null>(null);
    const [uploadingDbCcc, setUploadingDbCcc] = useState(false);

    const [breachMonitoringFile, setBreachMonitoringFile] = useState<File | null>(null);
    const [uploadingBreachMonitoring, setUploadingBreachMonitoring] = useState(false);

    const [potensiClaimFile, setPotensiClaimFile] = useState<File | null>(null);
    const [uploadingPotensiClaim, setUploadingPotensiClaim] = useState(false);

    // Persistence State
    const [lastUpdateMaster, setLastUpdateMaster] = useState<string>("Loading...");
    const [lastUpdateMaster117, setLastUpdateMaster117] = useState<string>("-");
    const [lastUpdateApexOts, setLastUpdateApexOts] = useState<string>("-");
    const [lastUpdateApexTransit, setLastUpdateApexTransit] = useState<string>("-");
    const [lastUpdateLastmile, setLastUpdateLastmile] = useState<string>("-");
    const [lastUpdateFirstmile, setLastUpdateFirstmile] = useState<string>("-");
    const [lastUpdateGeotagging, setLastUpdateGeotagging] = useState<string>("-");
    const [lastUpdateDbCcc, setLastUpdateDbCcc] = useState<string>("-");
    const [lastUpdateBreachMonitoring, setLastUpdateBreachMonitoring] = useState<string>("-");
    const [lastUpdatePotensiClaim, setLastUpdatePotensiClaim] = useState<string>("-");

    const [masterFilename, setMasterFilename] = useState<string>("-");
    const [master117Filename, setMaster117Filename] = useState<string>("-");
    const [apexOtsFilename, setApexOtsFilename] = useState<string>("-");
    const [apexTransitFilename, setApexTransitFilename] = useState<string>("-");
    const [lastmileFilename, setLastmileFilename] = useState<string>("-");
    const [firstmileFilename, setFirstmileFilename] = useState<string>("-");
    const [geotaggingFilename, setGeotaggingFilename] = useState<string>("-");
    const [dbCccFilename, setDbCccFilename] = useState<string>("-");
    const [breachMonitoringFilename, setBreachMonitoringFilename] = useState<string>("-");
    const [potensiClaimFilename, setPotensiClaimFilename] = useState<string>("-");

    const [uploadProgress, setUploadProgress] = useState({
        master: false,
        master_117: false,
        apex_ots: false,
        apex_transit: false,
        lastmile: false,
        firstmile: false,
        geotagging: false,
        db_ccc: false,
        breach_monitoring: false,
        potensi_claim: false
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

                if (data.master_117_last_update) {
                    setLastUpdateMaster117(formatTime(data.master_117_last_update));
                    setUploadProgress(prev => ({ ...prev, master_117: true }));
                } else {
                    setLastUpdateMaster117("-");
                    setUploadProgress(prev => ({ ...prev, master_117: false }));
                }
                setMaster117Filename(data.master_117_filename || "-");

                if (data.apex_ots_last_update) {
                    setLastUpdateApexOts(formatTime(data.apex_ots_last_update));
                    setUploadProgress(prev => ({ ...prev, apex_ots: true }));
                } else {
                    setLastUpdateApexOts("-");
                    setUploadProgress(prev => ({ ...prev, apex_ots: false }));
                }
                setApexOtsFilename(data.apex_ots_filename || "-");

                if (data.apex_transit_last_update) {
                    setLastUpdateApexTransit(formatTime(data.apex_transit_last_update));
                    setUploadProgress(prev => ({ ...prev, apex_transit: true }));
                } else {
                    setLastUpdateApexTransit("-");
                    setUploadProgress(prev => ({ ...prev, apex_transit: false }));
                }
                setApexTransitFilename(data.apex_transit_filename || "-");

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

                if (data.geotagging_last_update) {
                    setLastUpdateGeotagging(formatTime(data.geotagging_last_update));
                    setUploadProgress(prev => ({ ...prev, geotagging: true }));
                } else {
                    setLastUpdateGeotagging("-");
                    setUploadProgress(prev => ({ ...prev, geotagging: false }));
                }
                setGeotaggingFilename(data.geotagging_filename || "-");

                if (data.db_ccc_last_update) {
                    setLastUpdateDbCcc(formatTime(data.db_ccc_last_update));
                    setUploadProgress(prev => ({ ...prev, db_ccc: true }));
                } else {
                    setLastUpdateDbCcc("-");
                    setUploadProgress(prev => ({ ...prev, db_ccc: false }));
                }
                setDbCccFilename(data.db_ccc_filename || "-");

                if (data.breach_monitoring_last_update) {
                    setLastUpdateBreachMonitoring(formatTime(data.breach_monitoring_last_update));
                    setUploadProgress(prev => ({ ...prev, breach_monitoring: true }));
                } else {
                    setLastUpdateBreachMonitoring("-");
                    setUploadProgress(prev => ({ ...prev, breach_monitoring: false }));
                }
                setBreachMonitoringFilename(data.breach_monitoring_filename || "-");

                if (data.potensi_claim_last_update) {
                    setLastUpdatePotensiClaim(formatTime(data.potensi_claim_last_update));
                    setUploadProgress(prev => ({ ...prev, potensi_claim: true }));
                } else {
                    setLastUpdatePotensiClaim("-");
                    setUploadProgress(prev => ({ ...prev, potensi_claim: false }));
                }
                setPotensiClaimFilename(data.potensi_claim_filename || "-");
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File | null) => void) => {
        if (e.target.files && e.target.files[0]) {
            if (validateFile(e.target.files[0])) {
                setter(e.target.files[0]);
            } else {
                e.target.value = ""; // Reset input
            }
        }
    };


    const handleDownload = async (type: 'master' | 'master_117' | 'apex_ots' | 'apex_transit' | 'lastmile' | 'firstmile' | 'geotagging' | 'db_ccc' | 'breach_monitoring' | 'potensi_claim') => {
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
                a.download = type === 'master' ? 'master_data.xlsx' : type === 'master_117' ? 'master_data_117.xlsx' : type === 'apex_ots' ? 'apex_ots.xlsx' : type === 'apex_transit' ? 'apex_transit.xlsx' : type === 'lastmile' ? 'allshipment_lastmile.xlsx' : type === 'firstmile' ? 'allshipment_firstmile.xlsx' : type === 'db_ccc' ? 'db_ccc_data.xlsx' : type === 'breach_monitoring' ? 'breach_monitoring_data.xlsx' : type === 'potensi_claim' ? 'potensi_claim_data.xlsx' : 'geotagging_data.csv';
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

    const uploadFile = async (
        file: File,
        endpoint: string,
        setterUploading: (b: boolean) => void,
        setterFile: (f: File | null) => void,
        successMessage: string,
        category: 'master' | 'master_117' | 'apex_ots' | 'apex_transit' | 'lastmile' | 'firstmile',
        fileInputIndex: number
    ) => {
        if (!file) return;
        setterUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/${endpoint}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: response.statusText }));
                throw new Error(errorData.detail || "Upload failed");
            }

            const data = await response.json();
            showToast(successMessage, 'success');

            // Update System Info
            fetchSystemInfo();

            setterFile(null);
            // Reset file input value manually
            const fileInputs = document.querySelectorAll('input[type="file"]');
            if (fileInputs[fileInputIndex]) (fileInputs[fileInputIndex] as HTMLInputElement).value = "";

        } catch (error: any) {
            console.error("Upload Error:", error);
            showToast(`Upload Failed: ${error.message || "Unknown error"}`, 'error');
        } finally {
            setterUploading(false);
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
                // Optimistically update UI
                if (category === 'Apex All Shipment' || category === 'Master Data') {
                    setUploadProgress(prev => ({ ...prev, master: false }));
                    setLastUpdateMaster("-");
                    setMasterFilename("-");
                } else if (category === 'Apex Potensi Claim' || category === 'Master Data 117') {
                    setUploadProgress(prev => ({ ...prev, master_117: false }));
                    setLastUpdateMaster117("-");
                    setMaster117Filename("-");
                } else if (category === 'Apex OTS') {
                    setUploadProgress(prev => ({ ...prev, apex_ots: false }));
                    setLastUpdateApexOts("-");
                    setApexOtsFilename("-");
                } else if (category === 'Apex Transit Manifest') {
                    setUploadProgress(prev => ({ ...prev, apex_transit: false }));
                    setLastUpdateApexTransit("-");
                    setApexTransitFilename("-");
                } else if (category === 'Lastmile DB') {
                    setUploadProgress(prev => ({ ...prev, lastmile: false }));
                    setLastUpdateLastmile("-");
                    setLastmileFilename("-");
                } else if (category === 'Firstmile DB') {
                    setUploadProgress(prev => ({ ...prev, firstmile: false }));
                    setLastUpdateFirstmile("-");
                    setFirstmileFilename("-");
                } else if (category === 'Geotaging') {
                    setUploadProgress(prev => ({ ...prev, geotagging: false }));
                    setLastUpdateGeotagging("-");
                    setGeotaggingFilename("-");
                } else if (category === 'DB CCC') {
                    setUploadProgress(prev => ({ ...prev, db_ccc: false }));
                    setLastUpdateDbCcc("-");
                    setDbCccFilename("-");
                } else if (category === 'Breach Monitoring') {
                    setUploadProgress(prev => ({ ...prev, breach_monitoring: false }));
                    setLastUpdateBreachMonitoring("-");
                    setBreachMonitoringFilename("-");
                } else if (category === 'Potensi Claim') {
                    setUploadProgress(prev => ({ ...prev, potensi_claim: false }));
                    setLastUpdatePotensiClaim("-");
                    setPotensiClaimFilename("-");
                }
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
        <DashboardLayout>
            <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-gray-50/50">
                <div className="max-w-7xl mx-auto">
                    {/* Header Section */}
                    <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                            <Link href="/dashboard/v2">
                                <button className="inline-flex items-center text-secondary hover:text-primary mb-2 transition-colors text-sm font-medium">
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                                </button>
                            </Link>
                            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Upload Center</h1>
                            <p className="text-secondary">Manage Master Data and Shipment Databases for Dashboard V2.</p>
                        </div>
                        <button onClick={() => setIsRefModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-sm font-medium text-foreground hover:bg-gray-50 transition-colors shadow-sm w-fit">
                            <BookOpen className="w-4 h-4 text-blue-500" />
                            Data Referensi
                        </button>
                    </div>

                    {/* Upload Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">

                        {/* MASTER DATA 117 */}
                        <UploadCard
                            title="Apex Potensi Claim"
                            icon={Database}
                            description="Upload file Apex Potensi Claim (.xlsx)"
                            file={master117File}
                            isUploaded={uploadProgress.master_117}
                            lastUpdated={lastUpdateMaster117}
                            filename={master117Filename}
                            uploading={uploadingMaster117}
                            onFileChange={(e) => handleFileChange(e, setMaster117File)}
                            onUpload={() => uploadFile(master117File!, 'upload-master-117', setUploadingMaster117, setMaster117File, "Upload Master 117 Successful!", 'master_117', 1)}
                            onDownload={() => handleDownload('master_117')}
                            onTakedown={() => handleTakedown('Master Data 117')}
                            colorClass="cyan"
                        />

                        {/* APEX OTS */}
                        <UploadCard
                            title="Apex OTS"
                            icon={Database}
                            description="Upload file Apex OTS (.xlsx)"
                            file={apexOtsFile}
                            isUploaded={uploadProgress.apex_ots}
                            lastUpdated={lastUpdateApexOts}
                            filename={apexOtsFilename}
                            uploading={uploadingApexOts}
                            onFileChange={(e) => handleFileChange(e, setApexOtsFile)}
                            onUpload={() => uploadFile(apexOtsFile!, 'upload-apex-ots', setUploadingApexOts, setApexOtsFile, "Upload Apex OTS Successful!", 'apex_ots' as any, 2)}
                            onDownload={() => handleDownload('apex_ots')}
                            onTakedown={() => handleTakedown('Apex OTS')}
                            colorClass="purple"
                        />

                        {/* APEX TRANSIT MANIFEST */}
                        <UploadCard
                            title="Apex Transit Manifest"
                            icon={Database}
                            description="Upload file Apex Transit Manifest (.xlsx)"
                            file={apexTransitFile}
                            isUploaded={uploadProgress.apex_transit}
                            lastUpdated={lastUpdateApexTransit}
                            filename={apexTransitFilename}
                            uploading={uploadingApexTransit}
                            onFileChange={(e) => handleFileChange(e, setApexTransitFile)}
                            onUpload={() => uploadFile(apexTransitFile!, 'upload-apex-transit', setUploadingApexTransit, setApexTransitFile, "Upload Apex Transit Successful!", 'apex_transit' as any, 3)}
                            onDownload={() => handleDownload('apex_transit')}
                            onTakedown={() => handleTakedown('Apex Transit Manifest')}
                            colorClass="blue"
                        />


                        {/* ALL SHIPMENT LASTMILE */}
                        <UploadCard
                            title="All Shipment Lastmile"
                            icon={FileSpreadsheet}
                            description="Upload template All Shipment Lastmile (.xlsx)"
                            file={allShipLastmileFile}
                            isUploaded={uploadProgress.lastmile}
                            lastUpdated={lastUpdateLastmile}
                            filename={lastmileFilename}
                            uploading={uploadingAllShipLastmile}
                            onFileChange={(e) => handleFileChange(e, setAllShipLastmileFile)}
                            onUpload={() => uploadFile(allShipLastmileFile!, 'upload-allshipment', setUploadingAllShipLastmile, setAllShipLastmileFile, 'Upload All Shipment Lastmile Successful!', 'lastmile' as any, -1)}
                            onDownload={() => handleDownload('lastmile')}
                            onTakedown={() => handleTakedown('Lastmile DB')}
                            colorClass="purple"
                        />

                        {/* FIRSTMILE DATA */}
                        <UploadCard
                            title="Firstmile Database"
                            icon={FileSpreadsheet}
                            description="Upload AllShipment Firstmile (.xlsx)"
                            file={firstmileFile}
                            isUploaded={uploadProgress.firstmile}
                            lastUpdated={lastUpdateFirstmile}
                            filename={firstmileFilename}
                            uploading={uploadingFirstmile}
                            onFileChange={(e) => handleFileChange(e, setFirstmileFile)}
                            onUpload={() => uploadFile(firstmileFile!, 'upload-allshipment-firstmile', setUploadingFirstmile, setFirstmileFile, "Upload Firstmile Successful!", 'firstmile', 5)}
                            onDownload={() => handleDownload('firstmile')}
                            onTakedown={() => handleTakedown('Firstmile DB')}
                            colorClass="orange"
                        />

                        {/* GEOTAGGING DATA */}
                        <UploadCard
                            title="Database Geotaging"
                            icon={MapPin}
                            description="Upload file Geotaging (.csv)"
                            file={geotaggingFile}
                            isUploaded={uploadProgress.geotagging}
                            lastUpdated={lastUpdateGeotagging}
                            filename={geotaggingFilename}
                            uploading={uploadingGeotagging}
                            onFileChange={(e) => handleFileChange(e, setGeotaggingFile)}
                            onUpload={() => uploadFile(geotaggingFile!, 'upload-geotagging', setUploadingGeotagging, setGeotaggingFile, "Upload Geotaging Successful!", 'geotagging' as any, 6)}
                            onDownload={() => handleDownload('geotagging')}
                            onTakedown={() => handleTakedown('Geotaging')}
                            colorClass="purple"
                            acceptedFiles=".csv"
                            supportText="Support: .csv (Max 300MB)"
                        />


                        {/* BREACH MONITORING DATA */}
                        <UploadCard
                            title="Database Breach Monitoring"
                            icon={Database}
                            description="Upload file Breach Monitoring Lastmile (.xlsx, .csv)"
                            file={breachMonitoringFile}
                            isUploaded={uploadProgress.breach_monitoring}
                            lastUpdated={lastUpdateBreachMonitoring}
                            filename={breachMonitoringFilename}
                            uploading={uploadingBreachMonitoring}
                            onFileChange={(e) => handleFileChange(e, setBreachMonitoringFile)}
                            onUpload={() => uploadFile(breachMonitoringFile!, 'upload-breach-monitoring', setUploadingBreachMonitoring, setBreachMonitoringFile, "Upload Breach Monitoring Successful!", 'breach_monitoring' as any, 8)}
                            onDownload={() => handleDownload('breach_monitoring')}
                            onTakedown={() => handleTakedown('Breach Monitoring')}
                            colorClass="rose"
                            acceptedFiles=".xlsx, .xls, .csv"
                            supportText="Support: .xlsx, .csv (Max 300MB)"
                        />

                        {/* POTENSI CLAIM */}
                        <UploadCard
                            title="Database Potensi Claim"
                            icon={Database}
                            description="Upload file Potensi Claim Breach LM (.xlsx, .csv)"
                            file={potensiClaimFile}
                            isUploaded={uploadProgress.potensi_claim}
                            lastUpdated={lastUpdatePotensiClaim}
                            filename={potensiClaimFilename}
                            uploading={uploadingPotensiClaim}
                            onFileChange={(e) => handleFileChange(e, setPotensiClaimFile)}
                            onUpload={() => uploadFile(potensiClaimFile!, 'upload-potensi-claim', setUploadingPotensiClaim, setPotensiClaimFile, "Upload Potensi Claim Successful!", 'potensi_claim' as any, 9)}
                            onDownload={() => handleDownload('potensi_claim')}
                            onTakedown={() => handleTakedown('Potensi Claim')}
                            colorClass="cyan"
                            acceptedFiles=".xlsx, .xls, .csv"
                            supportText="Support: .xlsx, .csv (Max 300MB)"
                        />
                    </div>

                    {/* History Section */}
                    <HistorySection
                        activeFilenames={{
                            master: masterFilename,
                            master_117: master117Filename,
                            apex_ots: apexOtsFilename,
                            apex_transit: apexTransitFilename,
                            lastmile: lastmileFilename,
                            firstmile: firstmileFilename,
                            geotagging: geotaggingFilename,
                            db_ccc: dbCccFilename,
                            breach_monitoring: breachMonitoringFilename,
                            potensi_claim: potensiClaimFilename
                        }}
                    />

                </div>
            </div>

            {/* Modal Data Referensi */}
            {isRefModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-primary" />
                                Data Referensi
                            </h3>
                            <button onClick={() => setIsRefModalOpen(false)} className="text-secondary hover:text-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-secondary mb-6">Pilih direktori data referensi yang ingin dikelola:</p>
                            <div className="space-y-3">
                                <Link href="/dashboard/v2/upload/referensi-lastmile" onClick={() => setIsRefModalOpen(false)}>
                                    <div className="flex flex-col p-4 border border-border rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer group">
                                        <span className="font-semibold text-foreground group-hover:text-blue-700">Data Referensi Lastmile</span>
                                        <span className="text-xs text-secondary mt-1">SLA Lazada, Service, SLA Shopee, Database 1/2, Account.</span>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

// Sub-components

interface UploadCardProps {
    title: string;
    icon: any;
    description: string;
    file: File | null;
    isUploaded: boolean;
    lastUpdated: string;
    filename: string;
    uploading: boolean;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUpload: () => void;
    onDownload: () => void;
    onTakedown: () => void;
    colorClass: 'blue' | 'emerald' | 'orange' | 'purple' | 'rose' | 'cyan';
    acceptedFiles?: string;
    supportText?: string;
}

function UploadCard({
    title, icon: Icon, description, file, isUploaded, lastUpdated, filename, uploading,
    onFileChange, onUpload, onDownload, onTakedown, colorClass, acceptedFiles = ".xlsx, .xls", supportText = "Support: .xlsx, .xls (Max 300MB)"
}: UploadCardProps) {

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
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm flex flex-col h-full transition-all duration-300 hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${theme.bg}`}>
                    <Icon className={`w-6 h-6 ${theme.text}`} />
                </div>
                {isUploaded && (
                    <div className="flex gap-2">
                        <button onClick={onDownload} className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title="Download">
                            <Download className="w-4 h-4" />
                        </button>
                        <button onClick={onTakedown} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Takedown">
                            <PowerOff className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <h3 className="font-semibold text-lg text-foreground mb-1">{title}</h3>
            <p className="text-secondary text-sm mb-6">{description}</p>

            {isUploaded && (
                <div className={`mb-6 p-4 rounded-xl ${theme.bg} border ${theme.border}`}>
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className={`w-4 h-4 ${theme.text}`} />
                        <span className={`text-xs font-semibold ${theme.text}`}>Active & Loaded</span>
                    </div>
                    <p className="text-xs text-foreground font-medium truncate mb-1" title={filename}>{filename}</p>
                    <p className="text-[10px] text-secondary">Updated: {lastUpdated}</p>
                </div>
            )}

            <div className="mt-auto">
                <div className={`relative border-2 border-dashed ${file ? theme.border : 'border-border'} ${theme.hoverborder} rounded-xl p-6 text-center transition-colors cursor-pointer group bg-gray-50/50 hover:bg-white`}>
                    <input
                        type="file"
                        accept={acceptedFiles}
                        onChange={onFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center gap-2">
                        <Upload className={`w-8 h-8 ${file ? theme.text : 'text-gray-300 group-hover:text-gray-400'} transition-colors`} />
                        <p className="text-sm font-medium text-foreground">
                            {file ? file.name : "Click to browse or drop file"}
                        </p>
                        <p className="text-secondary text-sm mb-6">{description}</p>
                        <p className="text-xs text-secondary">
                            {file ? `${(file.size / 1024).toFixed(0)} KB` : supportText}
                        </p>
                    </div>
                </div>

                <button
                    onClick={onUpload}
                    disabled={!file || uploading}
                    className={`mt-4 w-full py-2.5 rounded-xl font-medium text-sm text-white transition-all duration-300 shadow-sm
                        ${!file || uploading ? 'bg-gray-300 cursor-not-allowed' : `${theme.btn} shadow-${colorClass}-500/20`}`}
                >
                    {uploading ? 'Processing...' : 'Upload & Process'}
                </button>
            </div>
        </div >
    );
}

interface HistorySectionProps {
    activeFilenames: {
        master: string;
        master_117: string;
        apex_ots: string;
        apex_transit: string;
        lastmile: string;
        firstmile: string;
        geotagging: string;
        db_ccc: string;
        breach_monitoring: string;
        potensi_claim: string;
    };
}

function HistorySection({ activeFilenames }: HistorySectionProps) {
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

    const uniqueFilenames = useMemo(() => Array.from(new Set(history.map(item => item.original_filename || item.filename).filter(Boolean))), [history]);
    const uniqueUsers = useMemo(() => Array.from(new Set(history.map(item => item.uploaded_by).filter(Boolean))), [history]);

    const filteredHistory = history.filter(item => {
        const itemFilename = item.original_filename || item.filename;
        const matchFilename = filters.filename === '' || itemFilename === filters.filename;
        const matchCategory = filters.category === '' || item.category === filters.category;
        const matchUser = filters.uploaded_by === '' || item.uploaded_by === filters.uploaded_by;

        let matchDate = true;
        if (filters.date) {
            const itemDate = new Date(item.upload_date).toISOString().split('T')[0];
            matchDate = itemDate === filters.date;
        }

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
            showToast("Gagal mendownload file", 'error');
        }
    };

    const getCategoryBadge = (cat: string) => {
        if (cat === 'Apex All Shipment' || cat === 'Master Data') return <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-medium text-xs border border-blue-100">Apex All Shipment</span>;
        if (cat === 'Apex Potensi Claim' || cat === 'Master Data 117') return <span className="px-2 py-1 rounded-md bg-cyan-50 text-cyan-700 font-medium text-xs border border-cyan-100">Apex Potensi Claim</span>;
        if (cat === 'Apex OTS') return <span className="px-2 py-1 rounded-md bg-purple-50 text-purple-700 font-medium text-xs border border-purple-100">Apex OTS</span>;
        if (cat === 'Apex Transit Manifest') return <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-medium text-xs border border-blue-100">Apex Transit</span>;
        if (cat === 'Lastmile DB') return <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium text-xs border border-emerald-100">Lastmile DB</span>;
        if (cat === 'Firstmile DB') return <span className="px-2 py-1 rounded-md bg-orange-50 text-orange-700 font-medium text-xs border border-orange-100">Firstmile DB</span>;
        if (cat === 'Geotaging') return <span className="px-2 py-1 rounded-md bg-purple-50 text-purple-700 font-medium text-xs border border-purple-100">Geotaging</span>;
        if (cat === 'DB CCC') return <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium text-xs border border-indigo-100">DB CCC</span>;
        if (cat === 'Breach Monitoring') return <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 font-medium text-xs border border-rose-100">Breach Monitoring</span>;
        if (cat === 'Potensi Claim') return <span className="px-2 py-1 rounded-md bg-cyan-50 text-cyan-700 font-medium text-xs border border-cyan-100">Potensi Claim</span>;
        return <span className="px-2 py-1 rounded-md bg-gray-50 text-gray-700 font-medium text-xs border border-gray-100">{cat}</span>;
    };

    return (
        <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                        <History className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-foreground">Upload History</h2>
                        <p className="text-secondary text-sm">Track file changes and versions</p>
                    </div>
                </div>
                <button
                    onClick={fetchHistory}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-secondary hover:text-foreground bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Filters Toolbar */}
            <div className="p-4 bg-gray-50/50 border-b border-border flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-border rounded-lg text-sm text-secondary min-w-[200px]">
                    <Filter className="w-4 h-4" />
                    <select
                        className="w-full bg-transparent border-none outline-none text-foreground text-sm"
                        value={filters.category}
                        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    >
                        <option value="">All Categories</option>
                        <option value="Master Data">Master Data</option>
                        <option value="Lastmile DB">Lastmile DB</option>
                        <option value="Firstmile DB">Firstmile DB</option>
                        <option value="Geotaging">Geotaging</option>
                        <option value="DB CCC">DB CCC FM & LM</option>
                        <option value="Breach Monitoring">Breach Monitoring Lastmile</option>
                        <option value="Potensi Claim">Potensi Claim Breach LM</option>
                        <option value="Daily Issue">Daily Issue</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-border rounded-lg text-sm text-secondary min-w-[200px]">
                    <FileText className="w-4 h-4" />
                    <select
                        className="w-full bg-transparent border-none outline-none text-foreground text-sm"
                        value={filters.filename}
                        onChange={(e) => setFilters(prev => ({ ...prev, filename: e.target.value }))}
                    >
                        <option value="">All Files</option>
                        {uniqueFilenames.map((name: any) => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-border rounded-lg text-sm text-secondary min-w-[200px]">
                    <User className="w-4 h-4" />
                    <select
                        className="w-full bg-transparent border-none outline-none text-foreground text-sm"
                        value={filters.uploaded_by}
                        onChange={(e) => setFilters(prev => ({ ...prev, uploaded_by: e.target.value }))}
                    >
                        <option value="">All Users</option>
                        {uniqueUsers.map((name: any) => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>
                <DateFilter
                    value={filters.date}
                    onChange={(date) => setFilters(prev => ({ ...prev, date }))}
                    availableDates={Array.from(new Set(history.map(item => new Date(item.upload_date).toISOString().split('T')[0])))}
                />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-secondary font-medium border-b border-border">
                        <tr>
                            <th className="px-6 py-4">File Name</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4">Uploaded By</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-8 text-secondary">Loading history...</td></tr>
                        ) : filteredHistory.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-secondary">No history found</td></tr>
                        ) : (
                            filteredHistory.map((item, index) => {
                                const isActive =
                                    (item.category === 'Master Data' && item.filename === activeFilenames.master) ||
                                    (item.category === 'Lastmile DB' && item.filename === activeFilenames.lastmile) ||
                                    (item.category === 'Firstmile DB' && item.filename === activeFilenames.firstmile) ||
                                    (item.category === 'Geotaging' && item.filename === activeFilenames.geotagging) ||
                                    (item.category === 'DB CCC' && item.filename === activeFilenames.db_ccc) ||
                                    (item.category === 'Breach Monitoring' && item.filename === activeFilenames.breach_monitoring) ||
                                    (item.category === 'Potensi Claim' && item.filename === activeFilenames.potensi_claim);

                                return (
                                    <tr key={index} className={`transition-colors ${isActive ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-gray-50/50'}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="font-medium text-foreground">{item.filename}</div>
                                                {isActive && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                                        <CheckCircle className="w-3 h-3" />
                                                        ACTIVE
                                                    </span>
                                                )}
                                            </div>
                                            {item.original_filename && <div className="text-xs text-secondary mt-0.5">Orig: {item.original_filename}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getCategoryBadge(item.category)}
                                        </td>
                                        <td className="px-6 py-4 text-secondary">
                                            {item.uploaded_by}
                                        </td>
                                        <td className="px-6 py-4 text-secondary">
                                            {new Date(item.upload_date).toLocaleDateString()}
                                            <div className="text-xs">{new Date(item.upload_date).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleReprocess(item)}
                                                className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors mr-1"
                                                title="Reprocess / Re-upload"
                                                disabled={reprocessing === item.filename}
                                            >
                                                <RotateCw className={`w-4 h-4 ${reprocessing === item.filename ? 'animate-spin' : ''}`} />
                                            </button>
                                            <button
                                                onClick={() => handleDownload(item)}
                                                className="p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors mr-1"
                                                title="Download Backup"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
