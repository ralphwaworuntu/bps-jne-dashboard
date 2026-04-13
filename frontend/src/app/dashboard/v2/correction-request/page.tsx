"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Plus, Edit, CheckCircle, XCircle, Upload, Download, Image as ImageIcon, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_URL } from '../../../../config';
import DashboardLayout from '@/components/dashboard/v2/DashboardLayout';

export default function CorrectionRequestPageV2() {
    const router = useRouter();
    // Removed internal sidebar/header state
    const [user, setUser] = useState<any>(null);

    const [viewMode, setViewMode] = useState<'list' | 'form' | 'detail'>('list');
    const [requests, setRequests] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);

    // Export Modal States
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [exportAwb, setExportAwb] = useState('');
    const [exportStatus, setExportStatus] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    // Import Modal State
    const [showImportModal, setShowImportModal] = useState(false);
    const [importResult, setImportResult] = useState<{ success: boolean, message: string } | null>(null);

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/correction-request/import`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                setImportResult({ success: true, message: `Berhasil import ${data.count} data!` });
                // Refresh list
                const fetchRes = await fetch(`${API_URL}/correction-request?page=1&limit=10`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (fetchRes.ok) {
                    const newData = await fetchRes.json();
                    setRequests(newData.data || []);
                }
                setTimeout(() => {
                    setShowImportModal(false);
                    setImportResult(null);
                }, 2000);
            } else {
                setImportResult({ success: false, message: data.detail || 'Gagal import data' });
            }
        } catch (err) {
            setImportResult({ success: false, message: 'Terjadi kesalahan saat upload' });
        }
    };

    const handleDownloadTemplate = () => {
        // Create a dummy CSV/Excel for template
        const headers = ["no_awb", "origin", "customer_id", "data_awal_coding", "data_awal_kecamatan", "data_koreksi_coding", "data_koreksi_kecamatan", "keterangan_csu", "alasan_koreksi"];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "template_koreksi.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams();
            if (exportStartDate) queryParams.append('start_date', exportStartDate);
            if (exportEndDate) queryParams.append('end_date', exportEndDate);
            if (exportAwb) queryParams.append('awb', exportAwb);
            if (exportStatus) queryParams.append('status', exportStatus);

            const res = await fetch(`${API_URL}/correction-requests/export-correction-requests?${queryParams.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                // Get filename from Content-Disposition header if possible
                const disposition = res.headers.get('content-disposition');
                let filename = `Data_Cordest_${new Date().toISOString().slice(0, 10)}.xlsx`;
                if (disposition && disposition.indexOf('filename=') !== -1) {
                    filename = disposition.split('filename=')[1].replace(/['"]/g, '');
                }
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setShowExportModal(false);
            } else if (res.status === 404) {
                setMessage({ type: 'error', text: 'Data tidak ditemukan untuk filter ini. Silakan ubah pencarian Anda.' });
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.detail || 'Gagal export data.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Terjadi kesalahan sistem saat export.' });
        } finally {
            setIsExporting(false);
        }
    };

    // Helper for filter options
    const getUniqueOptions = (key: string) => {
        if (!requests) return [];
        const values = requests.map(r => {
            if (key === 'entry_date') return new Date(r.entry_date).toLocaleDateString();
            return r[key];
        });
        return Array.from(new Set(values)).filter(Boolean).sort();
    };

    // Filters
    const [filters, setFilters] = useState({
        entry_date: '',
        awb: '',
        address_1: '',
        kode_awal: '',
        kode_akhir: '',
        status: ''
    });

    // Form States
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Fields
    const [awb, setAwb] = useState('');
    const [address1, setAddress1] = useState('');
    const [address2, setAddress2] = useState('');
    const [codingAwal, setCodingAwal] = useState('');
    const [kecamatanAwal, setKecamatanAwal] = useState('');
    const [codingAkhir, setCodingAkhir] = useState('');
    const [kecamatanAkhir, setKecamatanAkhir] = useState('');
    const [alasan, setAlasan] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    // Attachment States
    const [branchProofs, setBranchProofs] = useState<File[]>([]);
    const [scoProofs, setScoProofs] = useState<File[]>([]);
    const [bpsProofs, setBpsProofs] = useState<File[]>([]);

    // Auth Check
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        fetch(`${API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setUser(data))
            .catch(() => router.push('/login'));

        fetchRequests();
    }, [router]);

    // Removed internal notification fetching and markAllRead since DashboardLayout handles it

    const fetchRequests = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/correction-requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
            }
        } catch (e) {
            console.error("Failed to fetch requests", e);
        }
    };

    const handleBack = () => {
        if (viewMode === 'list') {
            router.push('/dashboard/v2');
        } else {
            setViewMode('list');
            resetForm();
        }
    };

    const resetForm = () => {
        setAwb('');
        setAddress1('');
        setAddress2('');
        setCodingAwal('');
        setKecamatanAwal('');
        setCodingAkhir('');
        setKecamatanAkhir('');
        setAlasan('');
        setRejectionReason('');
        setBranchProofs([]);
        setScoProofs([]);
        setBpsProofs([]);
        setMessage(null);
    };

    const openDetail = (req: any) => {
        setSelectedRequest(req);
        setAwb(req.awb || '');
        setAddress1(req.address_1 || '');
        setAddress2(req.address_2 || '');
        setCodingAwal(req.coding_awal || '');
        setKecamatanAwal(req.kecamatan_awal || '');
        setCodingAkhir(req.coding_akhir || '');
        setKecamatanAkhir(req.kecamatan_akhir || '');
        setAlasan(req.alasan_koreksi || req.alasan || '');
        setRejectionReason('');
        setScoProofs([]);
        setBpsProofs([]);
        setViewMode('detail');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (viewMode === 'form' && (branchProofs.length < 1 || branchProofs.length > 6)) {
            alert('Harap unggah 1 hingga 6 foto untuk Lampiran Gambar.');
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');

            let url = `${API_URL}/correction-requests`;
            let method = 'POST';

            if (viewMode === 'detail' && selectedRequest) {
                url = `${API_URL}/correction-requests/${selectedRequest.id}`;
                method = 'PUT'; // Assuming backend supports PUT
            }

            // Since our backend now uses Form(...) we need to send FormData OR JSON.
            // Wait, looking at the backend, it expects Form data for creation and update, NOT JSON!
            // Let's use FormData correctly.
            const formData = new FormData();
            formData.append('awb', awb);
            formData.append('address_1', address1);
            formData.append('address_2', address2);
            formData.append('coding_awal', codingAwal);
            formData.append('kecamatan_awal', kecamatanAwal);
            formData.append('coding_akhir', codingAkhir);
            formData.append('kecamatan_akhir', kecamatanAkhir);
            formData.append('alasan', alasan);

            if (viewMode !== 'detail') {
                branchProofs.forEach(file => {
                    formData.append('files', file);
                });
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: viewMode === 'detail' ? 'Data berhasil diperbarui!' : 'Request berhasil dibuat!' });
                fetchRequests();
                setTimeout(() => {
                    handleBack();
                }, 1500);
            } else {
                setMessage({ type: 'error', text: data.detail || 'Gagal menyimpan data.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Terjadi kesalahan sistem.' });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!selectedRequest) return;

        if (newStatus === 'Rejected' && !rejectionReason) {
            alert('Harap isi alasan penolakan.');
            return;
        }

        if ((newStatus === 'Approved' || newStatus === 'Rejected') && scoProofs.length === 0) {
            alert('Harap unggah minimal 1 foto bukti validasi SCO.');
            return;
        }

        if ((newStatus === 'Approved' || newStatus === 'Rejected') && scoProofs.length > 5) {
            alert('Maksimal 5 foto bukti validasi SCO.');
            return;
        }

        if (newStatus === 'Done' && bpsProofs.length === 0) {
            alert('Harap unggah minimal 1 foto bukti eksekusi BPS.');
            return;
        }

        if (newStatus === 'Done' && bpsProofs.length > 5) {
            alert('Maksimal 5 foto bukti eksekusi BPS.');
            return;
        }

        if (!confirm(`Apakah Anda yakin ingin mengubah status menjadi ${newStatus}?`)) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            // If Approved/Rejected, upload SCO proofs first
            if (newStatus === 'Approved' || newStatus === 'Rejected') {
                const proofFormData = new FormData();
                scoProofs.forEach(file => {
                    proofFormData.append('files', file);
                });

                const proofRes = await fetch(`${API_URL}/correction-requests/${selectedRequest.id}/upload-sco-proof`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: proofFormData
                });

                if (!proofRes.ok) {
                    const errorData = await proofRes.json();
                    setMessage({ type: 'error', text: errorData.detail || 'Gagal mengunggah bukti validasi SCO' });
                    setLoading(false);
                    return;
                }
            }

            // If Done, upload BPS proofs first
            if (newStatus === 'Done') {
                const bpsProofFormData = new FormData();
                bpsProofs.forEach(file => {
                    bpsProofFormData.append('files', file);
                });

                const bpsProofRes = await fetch(`${API_URL}/correction-requests/${selectedRequest.id}/upload-bps-proof`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: bpsProofFormData
                });

                if (!bpsProofRes.ok) {
                    const errorData = await bpsProofRes.json();
                    setMessage({ type: 'error', text: errorData.detail || 'Gagal mengunggah bukti eksekusi BPS' });
                    setLoading(false);
                    return;
                }
            }

            // Update status (Form Data based on backend)
            const statusFormData = new FormData();
            statusFormData.append('status', newStatus);
            if (newStatus === 'Rejected') {
                statusFormData.append('rejection_reason', rejectionReason);
            }

            const res = await fetch(`${API_URL}/correction-requests/${selectedRequest.id}/status`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: statusFormData
            });

            if (res.ok) {
                const updatedReq = await res.json();

                // Re-fetch data from backend so we get the fresh attachments
                fetchRequests();

                // Update currently open detail view so new proofs render instantly
                // Since GET /correction-requests returns all arrays, and we rely on 'requests' array, 
                // the list update will handle most of the UI sync, but let's artificially inject to local selected view
                setSelectedRequest({ ...selectedRequest, status: newStatus, rejection_reason: rejectionReason, attachments: updatedReq.attachments || selectedRequest.attachments });

                // Reset forms
                setScoProofs([]);
                setBpsProofs([]);
                setRejectionReason('');

                // Update in list tentatively before fetchRequest completes
                setRequests(prev => prev.map(p => p.id === selectedRequest.id ? { ...p, status: newStatus, attachments: updatedReq.attachments || p.attachments } : p));

                setMessage({ type: 'success', text: `Status berhasil diubah menjadi ${newStatus}` });
                setTimeout(() => {
                    setMessage(null);
                    if (newStatus === 'Rejected') {
                        handleBack(); // Only redirect on reject as nothing to check anymore
                    }
                }, 1500);
            } else {
                setMessage({ type: 'error', text: 'Gagal update status.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Terjadi kesalahan sistem.' });
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredRequests = requests.filter(req => {
        const matchDate = !filters.entry_date || new Date(req.entry_date).toLocaleDateString() === filters.entry_date;
        const matchAwb = !filters.awb || req.awb === filters.awb;
        const matchAddress = !filters.address_1 || req.address_1 === filters.address_1;
        const matchKodeAwal = !filters.kode_awal || req.coding_awal === filters.kode_awal;
        const matchKodeAkhir = !filters.kode_akhir || req.coding_akhir === filters.kode_akhir;
        const matchStatus = !filters.status || req.status === filters.status;

        return matchDate && matchAwb && matchAddress && matchKodeAwal && matchKodeAkhir && matchStatus;
    });
    const canCreate = user && ['Admin Cabang', 'PIC Cabang', 'Super Admin'].includes(user.role);
    const canApprove = user && ['Admin SCO', 'Super Admin'].includes(user.role);
    const canExecute = user && ['Admin BPS', 'Super Admin'].includes(user.role);
    const canEdit = user && (canApprove || canExecute); // SCO & BPS can edit

    if (!user) return null;

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto">
                {/* Header Navigation */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        {viewMode === 'list' ? (
                            <Link href="/dashboard/v2">
                                <button className="inline-flex items-center text-secondary hover:text-primary mb-2 transition-colors text-sm font-medium">
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                                </button>
                            </Link>
                        ) : (
                            <button onClick={handleBack} className="inline-flex items-center text-secondary hover:text-primary mb-2 transition-colors text-sm font-medium">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </button>
                        )}
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                            Request Koreksi Destination
                        </h1>
                        <p className="text-secondary text-sm">Manage correction requests and approvals.</p>
                    </div>
                    {viewMode === 'list' && canCreate && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowExportModal(true)}
                                className="bg-white border border-secondary/20 hover:bg-secondary/10 text-secondary-dark px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all"
                            >
                                <Download className="w-5 h-5" /> Export Data
                            </button>
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="bg-white border border-primary/20 hover:bg-primary/5 text-primary px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all"
                            >
                                <Upload className="w-5 h-5" /> Import Data
                            </button>

                            <button
                                onClick={() => setViewMode('form')}
                                className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
                            >
                                <Plus className="w-5 h-5" /> Request Baru
                            </button>
                        </div>
                    )}
                </div>

                {/* Import Modal */}
                {showImportModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-border flex justify-between items-center bg-gray-50">
                                <h3 className="text-lg font-bold text-foreground">Import Data Excel</h3>
                                <button onClick={() => setShowImportModal(false)} className="text-secondary hover:text-foreground">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="p-4 bg-blue-50 text-blue-700 rounded-xl text-sm border border-blue-100 flex gap-3">
                                    <Download className="w-5 h-5 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold mb-1">Panduan Import:</p>
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>Gunakan template yang disediakan</li>
                                            <li>Pastikan header kolom tidak diubah</li>
                                            <li>Format tanggal: YYYY-MM-DD</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleImportFile}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className="w-12 h-12 text-secondary mx-auto mb-3" />
                                    <p className="font-bold text-foreground">Klik untuk upload file Excel</p>
                                    <p className="text-sm text-secondary">atau drag & drop file di sini</p>
                                </div>

                                {/* Import Result Preview/Feedback would go here */}
                                {importResult && (
                                    <div className={`p-4 rounded-xl text-sm border ${importResult.success ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                                        }`}>
                                        <p className="font-bold flex items-center gap-2">
                                            {importResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                            {importResult.message}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-border bg-gray-50 flex justify-between gap-3">
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="px-4 py-2 text-primary font-bold hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" /> Download Template
                                </button>
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Export Modal */}
                {showExportModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-border flex justify-between items-center bg-gray-50">
                                <h3 className="text-lg font-bold text-foreground">Export Data Cordest</h3>
                                <button onClick={() => setShowExportModal(false)} className="text-secondary hover:text-foreground">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-secondary text-sm font-semibold mb-2">Start Date</label>
                                        <input
                                            type="date"
                                            value={exportStartDate}
                                            onChange={(e) => setExportStartDate(e.target.value)}
                                            className="w-full bg-white border border-border text-foreground rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-secondary text-sm font-semibold mb-2">End Date</label>
                                        <input
                                            type="date"
                                            value={exportEndDate}
                                            onChange={(e) => setExportEndDate(e.target.value)}
                                            className="w-full bg-white border border-border text-foreground rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-secondary text-sm font-semibold mb-2">AWB</label>
                                    <input
                                        type="text"
                                        placeholder="Filter by AWB..."
                                        value={exportAwb}
                                        onChange={(e) => setExportAwb(e.target.value)}
                                        className="w-full bg-white border border-border text-foreground rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                                    />
                                </div>

                                <div>
                                    <label className="block text-secondary text-sm font-semibold mb-2">Status</label>
                                    <select
                                        value={exportStatus}
                                        onChange={(e) => setExportStatus(e.target.value)}
                                        className="w-full bg-white border border-border text-foreground rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                                    >
                                        <option value="">Semua Status</option>
                                        <option value="Submitted">Submitted (Menunggu SCO)</option>
                                        <option value="Approved">Approved (Proses Eksekusi BPS)</option>
                                        <option value="Done">Done (Selesai dieksekusi)</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-6 border-t border-border bg-gray-50 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowExportModal(false)}
                                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70"
                                >
                                    {isExporting ? 'Exporting...' : <><Download className="w-4 h-4" /> Download Data Cordest</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}


                {/* --- LIST VIEW --- */}
                {
                    viewMode === 'list' && (
                        <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-foreground">
                                    <thead className="bg-muted text-secondary uppercase font-bold text-xs">
                                        <tr>
                                            <th className="px-6 py-4">
                                                <div className="flex flex-col gap-2">
                                                    <span>TGL REQUEST</span>
                                                    <select
                                                        className="bg-white border border-border rounded px-2 py-1 text-xs font-normal w-full text-foreground focus:ring-primary focus:border-primary"
                                                        onChange={(e) => setFilters(prev => ({ ...prev, entry_date: e.target.value }))}
                                                        value={filters.entry_date}
                                                    >
                                                        <option value="">All</option>
                                                        {getUniqueOptions('entry_date').map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </th>
                                            <th className="px-6 py-4">
                                                <div className="flex flex-col gap-2">
                                                    <span>AWB</span>
                                                    <select
                                                        className="bg-white border border-border rounded px-2 py-1 text-xs font-normal w-full text-foreground"
                                                        onChange={(e) => setFilters(prev => ({ ...prev, awb: e.target.value }))}
                                                        value={filters.awb}
                                                    >
                                                        <option value="">All</option>
                                                        {getUniqueOptions('awb').map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </th>
                                            <th className="px-6 py-4">
                                                <div className="flex flex-col gap-2">
                                                    <span>Address</span>
                                                    <select
                                                        className="bg-white border border-border rounded px-2 py-1 text-xs font-normal w-full text-foreground"
                                                        onChange={(e) => setFilters(prev => ({ ...prev, address_1: e.target.value }))}
                                                        value={filters.address_1}
                                                    >
                                                        <option value="">All</option>
                                                        {getUniqueOptions('address_1').map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 hidden md:table-cell">
                                                <div className="flex flex-col gap-2">
                                                    <span>Data Awal</span>
                                                    <select
                                                        className="bg-white border border-border rounded px-2 py-1 text-xs font-normal w-full text-foreground"
                                                        onChange={(e) => setFilters(prev => ({ ...prev, kode_awal: e.target.value }))}
                                                        value={filters.kode_awal}
                                                    >
                                                        <option value="">All</option>
                                                        {getUniqueOptions('coding_awal').map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 hidden md:table-cell">
                                                <div className="flex flex-col gap-2">
                                                    <span>Data Koreksi</span>
                                                    <select
                                                        className="bg-white border border-border rounded px-2 py-1 text-xs font-normal w-full text-foreground"
                                                        onChange={(e) => setFilters(prev => ({ ...prev, kode_akhir: e.target.value }))}
                                                        value={filters.kode_akhir}
                                                    >
                                                        <option value="">All</option>
                                                        {getUniqueOptions('coding_akhir').map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 hidden lg:table-cell">
                                                <div className="flex flex-col gap-2">
                                                    <span>Status</span>
                                                    <select
                                                        className="bg-white border border-border rounded px-2 py-1 text-xs font-normal w-full text-foreground"
                                                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                                        value={filters.status}
                                                    >
                                                        <option value="">All</option>
                                                        {getUniqueOptions('status').map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </th>
                                            <th className="px-6 py-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredRequests.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-secondary italic">
                                                    Data tidak ditemukan.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredRequests.map((req) => (
                                                <tr key={req.id} className="hover:bg-muted/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium">{new Date(req.entry_date).toLocaleDateString('id-ID')}</td>
                                                    <td className="px-6 py-4 font-mono text-primary font-medium">{req.awb}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-foreground">{req.address_1}</div>
                                                        <div className="text-xs text-secondary">{req.address_2}</div>
                                                    </td>
                                                    <td className="px-6 py-4 hidden md:table-cell">
                                                        <div className="text-xs text-secondary font-mono">{req.coding_awal}</div>
                                                        <div className="text-foreground">{req.kecamatan_awal}</div>
                                                    </td>
                                                    <td className="px-6 py-4 hidden md:table-cell">
                                                        <div className="text-xs text-success font-mono">{req.coding_akhir}</div>
                                                        <div className="text-foreground">{req.kecamatan_akhir}</div>
                                                    </td>
                                                    <td className="px-6 py-4 hidden lg:table-cell">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${req.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                                                            req.status === 'Approved' ? 'bg-cyan-100 text-cyan-700' :
                                                                req.status === 'Done' ? 'bg-green-100 text-green-700' :
                                                                    req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                                        'bg-gray-100 text-gray-700'
                                                            }`}>
                                                            {req.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => openDetail(req)}
                                                            className="inline-flex items-center justify-center px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary-hover rounded-lg font-medium text-xs transition-all"
                                                        >
                                                            View Detail
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                }

                {/* --- FORM & DETAIL VIEW --- */}
                {
                    (viewMode === 'form' || viewMode === 'detail') && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Form */}
                            <div className="lg:col-span-2">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white border border-border rounded-2xl p-8 shadow-sm"
                                >
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="col-span-1 md:col-span-2">
                                                <label className="block text-secondary text-sm font-semibold mb-2">No. AWB</label>
                                                <input
                                                    type="text" required value={awb} onChange={e => setAwb(e.target.value)}
                                                    className="w-full bg-white border-2 border-border rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-mono text-lg transition-all"
                                                    placeholder="Contoh: 01000..."
                                                    disabled={viewMode === 'detail' && !canEdit}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-secondary text-sm font-semibold mb-2">Address 1</label>
                                                <input
                                                    type="text" required value={address1} onChange={e => setAddress1(e.target.value)}
                                                    className="w-full bg-white border-2 border-border rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground transition-all"
                                                    disabled={viewMode === 'detail' && !canEdit}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-secondary text-sm font-semibold mb-2">Address 2 (Opsional)</label>
                                                <input
                                                    type="text" value={address2} onChange={e => setAddress2(e.target.value)}
                                                    className="w-full bg-white border-2 border-border rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground transition-all"
                                                    disabled={viewMode === 'detail' && !canEdit}
                                                />
                                            </div>
                                        </div>

                                        <div className="p-6 border-2 border-border rounded-xl bg-muted/30 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="col-span-1 md:col-span-2 text-xs font-bold text-secondary uppercase tracking-wider">Data Awal</div>
                                            <div>
                                                <label className="block text-secondary text-sm font-semibold mb-2">Coding Awal</label>
                                                <input
                                                    type="text" required value={codingAwal} onChange={e => setCodingAwal(e.target.value)}
                                                    className="w-full bg-white border-2 border-border rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground transition-all"
                                                    disabled={viewMode === 'detail' && !canEdit}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-secondary text-sm font-semibold mb-2">Kecamatan Awal</label>
                                                <input
                                                    type="text" required value={kecamatanAwal} onChange={e => setKecamatanAwal(e.target.value)}
                                                    className="w-full bg-white border-2 border-border rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground transition-all"
                                                    disabled={viewMode === 'detail' && !canEdit}
                                                />
                                            </div>
                                        </div>

                                        <div className="p-6 border-2 border-primary/20 rounded-xl bg-primary/5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="col-span-1 md:col-span-2 text-xs font-bold text-primary uppercase tracking-wider">Data Koreksi</div>
                                            <div>
                                                <label className="block text-secondary text-sm font-semibold mb-2">Coding Akhir</label>
                                                <input
                                                    type="text" required value={codingAkhir} onChange={e => setCodingAkhir(e.target.value)}
                                                    className="w-full bg-white border-2 border-primary/20 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-bold text-success transition-all"
                                                    disabled={viewMode === 'detail' && !canEdit}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-secondary text-sm font-semibold mb-2">Kecamatan Akhir</label>
                                                <input
                                                    type="text" required value={kecamatanAkhir} onChange={e => setKecamatanAkhir(e.target.value)}
                                                    className="w-full bg-white border-2 border-primary/20 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground transition-all"
                                                    disabled={viewMode === 'detail' && !canEdit}
                                                />
                                            </div>
                                        </div>

                                        {/* Lampiran Gambar (Branch Admin) */}
                                        {viewMode === 'form' && (
                                            <div>
                                                <label className="block text-secondary text-sm font-semibold mb-2">Lampiran Gambar (Wajib: 1-6 Foto)</label>
                                                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        required={branchProofs.length === 0}
                                                        onChange={(e) => {
                                                            if (e.target.files) {
                                                                const filesArray = Array.from(e.target.files);
                                                                if (filesArray.length + branchProofs.length > 6) {
                                                                    alert("Maksimal 6 foto.");
                                                                    return;
                                                                }
                                                                setBranchProofs(prev => [...prev, ...filesArray]);
                                                            }
                                                        }}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                    <Upload className="w-8 h-8 text-secondary mx-auto mb-2" />
                                                    <p className="text-sm font-bold text-foreground">Klik atau Tarik Foto Kesini</p>
                                                    <p className="text-xs text-secondary mt-1">Maks 6 file image</p>
                                                </div>

                                                {/* Selected Proofs Preview */}
                                                {branchProofs.length > 0 && (
                                                    <div className="mt-4 space-y-2">
                                                        {branchProofs.map((file, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm border border-border">
                                                                <span className="truncate max-w-[200px] text-xs font-medium">{file.name}</span>
                                                                <button type="button" onClick={() => setBranchProofs(prev => prev.filter((_, i) => i !== idx))} className="text-error hover:text-error/80">
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-secondary text-sm font-semibold mb-2">Alasan Koreksi</label>
                                            <textarea
                                                required value={alasan} onChange={e => setAlasan(e.target.value)}
                                                className="w-full bg-white border-2 border-border rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground h-24 transition-all resize-none"
                                                disabled={viewMode === 'detail' && !canEdit}
                                            />
                                        </div>

                                        {/* Action Buttons for Form */}
                                        {viewMode === 'form' && (
                                            <div className="pt-4">
                                                <button
                                                    type="submit" disabled={loading}
                                                    className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all"
                                                >
                                                    {loading ? 'Submitting...' : <><Save className="w-5 h-5" /> Submit Request</>}
                                                </button>
                                            </div>
                                        )}

                                        {/* Action Buttons for Edit Mode (SCO/BPS) */}
                                        {viewMode === 'detail' && canEdit && (selectedRequest?.status !== 'Done') && (
                                            <div className="pt-4">
                                                <button
                                                    type="submit" disabled={loading}
                                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                                                >
                                                    {loading ? 'Updating...' : <><Edit className="w-5 h-5" /> Update Data</>}
                                                </button>
                                                <p className="text-center text-xs text-secondary mt-2">You can edit data before approving/executing.</p>
                                            </div>
                                        )}
                                    </form>
                                </motion.div>
                            </div>

                            {/* Sidebar Status & Actions (Detail Mode Only) */}
                            {viewMode === 'detail' && selectedRequest && (
                                <div className="space-y-6">
                                    <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                                        <h3 className="text-lg font-bold text-foreground mb-4">Status Request</h3>
                                        <div className={`p-4 rounded-xl border mb-4 text-center font-bold ${selectedRequest.status === 'Submitted' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            selectedRequest.status === 'Approved' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                                                selectedRequest.status === 'Done' ? 'bg-green-50 text-green-600 border-green-100' :
                                                    selectedRequest.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                                        'bg-gray-50 text-gray-600 border-gray-100'
                                            }`}>
                                            {selectedRequest.status}
                                        </div>

                                        <div className="text-sm text-secondary">
                                            <div className="flex justify-between py-2 border-b border-border">
                                                <span>Requested Date</span>
                                                <span className="text-foreground font-medium">{new Date(selectedRequest.entry_date).toLocaleDateString()}</span>
                                            </div>
                                            {selectedRequest.rejection_reason && (
                                                <div className="mt-4 bg-red-50 p-3 rounded-lg border border-red-100">
                                                    <div className="text-xs text-red-600 font-bold mb-1">Alasan Penolakan:</div>
                                                    <div className="text-red-700">{selectedRequest.rejection_reason}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Lampiran / Attachments Viewer */}
                                    {selectedRequest?.attachments && selectedRequest.attachments.length > 0 && (
                                        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                                            <h3 className="text-lg font-bold text-foreground mb-4">Lampiran Request</h3>

                                            {/* Branch Images */}
                                            {selectedRequest.attachments.filter((a: any) => a.attachment_type === 'branch').length > 0 && (
                                                <div className="mb-4">
                                                    <div className="text-sm font-semibold text-secondary mb-2">Lampiran (Cabang):</div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                        {selectedRequest.attachments.filter((a: any) => a.attachment_type === 'branch').map((att: any) => (
                                                            <a href={`${API_URL}${att.file_path}`} target="_blank" rel="noreferrer" key={att.id}>
                                                                <div className="rounded-xl border border-border overflow-hidden bg-muted/30 hover:border-primary transition-colors cursor-pointer relative group">
                                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <ImageIcon className="w-6 h-6 text-white" />
                                                                    </div>
                                                                    <img src={`${API_URL}${att.file_path}`} alt={att.filename} className="w-full h-auto aspect-square object-cover" />
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* SCO Proof Images */}
                                            {selectedRequest.attachments.filter((a: any) => a.attachment_type === 'sco').length > 0 && (
                                                <div className="mb-4">
                                                    <div className="text-sm font-semibold text-secondary mb-2">Bukti Validasi (SCO):</div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                        {selectedRequest.attachments.filter((a: any) => a.attachment_type === 'sco').map((att: any) => (
                                                            <a href={`${API_URL}${att.file_path}`} target="_blank" rel="noreferrer" key={att.id}>
                                                                <div className="rounded-xl border border-border overflow-hidden bg-muted/30 hover:border-primary transition-colors cursor-pointer relative group">
                                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <ImageIcon className="w-6 h-6 text-white" />
                                                                    </div>
                                                                    <img src={`${API_URL}${att.file_path}`} alt={att.filename} className="w-full h-auto aspect-square object-cover" />
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* BPS Proof Images */}
                                            {selectedRequest.attachments.filter((a: any) => a.attachment_type === 'bps').length > 0 && (
                                                <div>
                                                    <div className="text-sm font-semibold text-secondary mb-2">Bukti Eksekusi (BPS):</div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                        {selectedRequest.attachments.filter((a: any) => a.attachment_type === 'bps').map((att: any) => (
                                                            <a href={`${API_URL}${att.file_path}`} target="_blank" rel="noreferrer" key={att.id}>
                                                                <div className="rounded-xl border border-border overflow-hidden bg-muted/30 hover:border-primary transition-colors cursor-pointer relative group">
                                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <ImageIcon className="w-6 h-6 text-white" />
                                                                    </div>
                                                                    <img src={`${API_URL}${att.file_path}`} alt={att.filename} className="w-full h-auto aspect-square object-cover" />
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* SCO Actions */}
                                    {canApprove && selectedRequest.status === 'Submitted' && (
                                        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                                            <h3 className="text-lg font-bold text-foreground mb-4">SCO Validation</h3>

                                            <div className="mb-6">
                                                <label className="block text-secondary text-sm font-semibold mb-2">Unggah Bukti Validasi (1-5 Foto)</label>
                                                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        onChange={(e) => {
                                                            if (e.target.files) {
                                                                const filesArray = Array.from(e.target.files);
                                                                if (filesArray.length + scoProofs.length > 5) {
                                                                    alert("Maksimal 5 foto.");
                                                                    return;
                                                                }
                                                                setScoProofs(prev => [...prev, ...filesArray]);
                                                            }
                                                        }}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                    <Upload className="w-8 h-8 text-secondary mx-auto mb-2" />
                                                    <p className="text-sm font-bold text-foreground">Klik atau Tarik Foto Kesini</p>
                                                    <p className="text-xs text-secondary mt-1">Maks 5 file image</p>
                                                </div>

                                                {/* Selected Proofs Preview */}
                                                {scoProofs.length > 0 && (
                                                    <div className="mt-4 space-y-2">
                                                        {scoProofs.map((file, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm border border-border">
                                                                <span className="truncate max-w-[200px] text-xs font-medium">{file.name}</span>
                                                                <button onClick={() => setScoProofs(prev => prev.filter((_, i) => i !== idx))} className="text-error hover:text-error/80">
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <button
                                                    onClick={() => handleStatusUpdate('Approved')}
                                                    className="w-full bg-success hover:bg-success-light hover:text-success-dark text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-success/20 transition-all disabled:opacity-50"
                                                    disabled={scoProofs.length === 0}
                                                >
                                                    <CheckCircle className="w-5 h-5" /> Approve Request
                                                </button>

                                                <div className="pt-2">
                                                    <textarea
                                                        placeholder="Alasan penolakan (Wajib jika tolak)"
                                                        className="w-full bg-white border border-border rounded-lg p-3 text-sm text-foreground mb-2 h-20 focus:ring-2 focus:ring-error/20 focus:border-error transition-all"
                                                        value={rejectionReason}
                                                        onChange={e => setRejectionReason(e.target.value)}
                                                    />
                                                    <button
                                                        onClick={() => handleStatusUpdate('Rejected')}
                                                        className="w-full bg-error hover:bg-error/90 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-error/20 transition-all disabled:opacity-50"
                                                        disabled={scoProofs.length === 0}
                                                    >
                                                        <XCircle className="w-5 h-5" /> Reject Request
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {canExecute && selectedRequest.status === 'Approved' && (
                                        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                                            <h3 className="text-lg font-bold text-foreground mb-4">BPS Execution</h3>
                                            <p className="text-sm text-secondary mb-4">Verify data correction in system then mark as done.</p>

                                            <div className="mb-6">
                                                <label className="block text-secondary text-sm font-semibold mb-2">Unggah Bukti Eksekusi (1-5 Foto)</label>
                                                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        onChange={(e) => {
                                                            if (e.target.files) {
                                                                const filesArray = Array.from(e.target.files);
                                                                if (filesArray.length + bpsProofs.length > 5) {
                                                                    alert("Maksimal 5 foto.");
                                                                    return;
                                                                }
                                                                setBpsProofs(prev => [...prev, ...filesArray]);
                                                            }
                                                        }}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                    <Upload className="w-8 h-8 text-secondary mx-auto mb-2" />
                                                    <p className="text-sm font-bold text-foreground">Klik atau Tarik Foto Kesini</p>
                                                    <p className="text-xs text-secondary mt-1">Maks 5 file image</p>
                                                </div>

                                                {/* Selected Proofs Preview */}
                                                {bpsProofs.length > 0 && (
                                                    <div className="mt-4 space-y-2">
                                                        {bpsProofs.map((file, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm border border-border">
                                                                <span className="truncate max-w-[200px] text-xs font-medium">{file.name}</span>
                                                                <button onClick={() => setBpsProofs(prev => prev.filter((_, i) => i !== idx))} className="text-error hover:text-error/80">
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => handleStatusUpdate('Done')}
                                                className="w-full bg-foreground hover:bg-foreground/90 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-foreground/20 transition-all disabled:opacity-50"
                                                disabled={bpsProofs.length === 0}
                                            >
                                                <CheckCircle className="w-5 h-5" /> Mark as Done / Executed
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                }
            </div >
        </DashboardLayout >
    );
}
