"use client";

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Upload, AlertCircle, CheckCircle, Plus, X, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/v2/DashboardLayout';
import { API_URL, mediaUrl } from '../../../../config';
import { useDashboard } from '@/context/DashboardContext';

export default function DailyIssuePageV2() {
    const router = useRouter();
    const { user } = useDashboard();
    const [viewMode, setViewMode] = useState<'list' | 'form' | 'detail'>('list');
    const [issues, setIssues] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(50);
    const [totalIssues, setTotalIssues] = useState(0);
    const [issuePages, setIssuePages] = useState(0);
    const [selectedIssue, setSelectedIssue] = useState<any>(null);

    // Lightbox State
    const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Handle Escape key to close lightbox
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSelectedImagePreview(null);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // Form States
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [wilayah, setWilayah] = useState('');
    const [selectedZonas, setSelectedZonas] = useState<string[]>([]);
    const [divisi, setDivisi] = useState('');
    const [description, setDescription] = useState('');
    const [processType, setProcessType] = useState('Lastmile');
    const [awbTokens, setAwbTokens] = useState<string[]>([]);
    const [awbDraft, setAwbDraft] = useState('');
    const [internalConstraint, setInternalConstraint] = useState('');
    const [externalConstraint, setExternalConstraint] = useState('');
    const [action, setAction] = useState('');
    const [solution, setSolution] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [status, setStatus] = useState('Open');

    const parseAwbTokens = (raw: string) =>
        String(raw || "")
            .split(/[,\s]+/)
            .map((t) => t.trim())
            .filter(Boolean);

    const commitAwbDraft = (raw?: string) => {
        const next = String(raw ?? awbDraft).trim();
        if (!next) {
            setAwbDraft('');
            return;
        }
        setAwbTokens((prev) => (prev.includes(next) ? prev : [...prev, next]));
        setAwbDraft('');
    };

    const removeAwbToken = (token: string) => {
        setAwbTokens((prev) => prev.filter((t) => t !== token));
    };

    const awbValue = useMemo(
        () => [...awbTokens, awbDraft.trim()].filter(Boolean).join(', '),
        [awbTokens, awbDraft]
    );

    // Memoize previews
    const filePreviews = useMemo(() => {
        return files.map(file => ({
            file,
            url: URL.createObjectURL(file)
        }));
    }, [files]);

    useEffect(() => {
        return () => {
            filePreviews.forEach(p => URL.revokeObjectURL(p.url));
        };
    }, [filePreviews]);

    // Constants
    const wilayahOptions = [
        "ALOR", "ATAMBUA", "KABUPATEN KUPANG", "KEFA", "KOTA KUPANG",
        "MALAKA", "ROTE", "SABU", "SOE", "TAMBOLAKA", "WAIBAKUL",
        "WAIKABUBAK", "WAINGAPU"
    ];

    const zonaMapping: any = {
        "ALOR": ["Zona B", "Zona C", "Zona D"],
        "ATAMBUA": ["Zona B", "Zona C", "Zona D"],
        "KABUPATEN KUPANG": ["Zona B", "Zona C", "Zona D"],
        "KEFA": ["Zona B", "Zona C", "Zona D"],
        "KOTA KUPANG": ["Zona A", "Zona B"],
        "MALAKA": ["Zona B", "Zona C", "Zona D"],
        "ROTE": ["Zona B", "Zona C", "Zona D"],
        "SABU": ["Zona B", "Zona C", "Zona D"],
        "SOE": ["Zona B", "Zona C", "Zona D"],
        "TAMBOLAKA": ["Zona B", "Zona C", "Zona D"],
        "WAIBAKUL": ["Zona B", "Zona C", "Zona D"],
        "WAIKABUBAK": ["Zona B", "Zona C", "Zona D"],
        "WAINGAPU": ["Zona B", "Zona C", "Zona D"]
    };

    const selectClass = "w-full bg-white border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-primary transition-colors text-foreground placeholder-muted-foreground";

    useEffect(() => {
        fetchIssues();
    }, [page, pageSize]);

    const fetchIssues = async (pageOverride?: number) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const p = pageOverride ?? page;
            const params = new URLSearchParams({ page: String(p), limit: String(pageSize) });
            const res = await fetch(`${API_URL}/daily-issues/?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setIssues(data);
                    setTotalIssues(data.length);
                    setIssuePages(1);
                } else {
                    setIssues(data.items || []);
                    setTotalIssues(data.total || 0);
                    setIssuePages(data.pages || 0);
                }
            }
        } catch (e) {
            console.error("Failed to fetch issues", e);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            if (selectedFiles.length + files.length > 6) {
                alert("Maximum 6 files allowed");
                return;
            }
            setFiles([...files, ...selectedFiles]);
        }
    };

    useEffect(() => {
        return () => {
            files.forEach(file => URL.revokeObjectURL(URL.createObjectURL(file)));
        };
    }, []);

    const availableZonas: string[] = wilayah ? (zonaMapping[wilayah] || []) : [];
    const allZonaSelected =
        availableZonas.length > 0 &&
        availableZonas.every((z) => selectedZonas.includes(z));

    const toggleZona = (z: string) => {
        if (selectedZonas.includes(z)) {
            setSelectedZonas(selectedZonas.filter(item => item !== z));
        } else {
            setSelectedZonas([...selectedZonas, z]);
        }
    };

    const toggleAllZona = () => {
        if (!wilayah || availableZonas.length === 0) return;
        if (allZonaSelected) {
            setSelectedZonas([]);
        } else {
            setSelectedZonas([...availableZonas]);
        }
    };

    // Populate form
    useEffect(() => {
        if (viewMode === 'form' && selectedIssue) {
            setWilayah(selectedIssue.wilayah);
            const zonaRaw = String(selectedIssue.zona || "").trim();
            if (/^all\s*zona$/i.test(zonaRaw)) {
                setSelectedZonas([...(zonaMapping[selectedIssue.wilayah] || [])]);
            } else {
                setSelectedZonas(
                    zonaRaw
                        .split(",")
                        .map((z: string) => z.trim())
                        .filter(Boolean)
                );
            }
            setDivisi(selectedIssue.divisi);
            setDescription(selectedIssue.description);
            setProcessType(selectedIssue.process_type || 'Lastmile');
            setAwbTokens(parseAwbTokens(selectedIssue.awb || ''));
            setAwbDraft('');
            setInternalConstraint(selectedIssue.internal_constraint || '');
            setExternalConstraint(selectedIssue.external_constraint || '');
            setAction(selectedIssue.action_taken);
            setSolution(selectedIssue.solution_recommendation);
            const dateObj = new Date(selectedIssue.due_date);
            setDueDate(dateObj.toISOString().split('T')[0]);
            setStatus(selectedIssue.status);
        } else if (viewMode === 'form' && !selectedIssue) {
            setWilayah('');
            setSelectedZonas([]);
            setDivisi('');
            setDescription('');
            setProcessType('Lastmile');
            setAwbTokens([]);
            setAwbDraft('');
            setInternalConstraint('');
            setExternalConstraint('');
            setAction('');
            setSolution('');
            setDueDate('');
            setFiles([]);
            setStatus('Open');
        }
    }, [viewMode, selectedIssue]);

    const handleSubmit = async (e: React.FormEvent, addAnother: boolean) => {
        e.preventDefault();
        setMessage(null);

        if (!internalConstraint && !externalConstraint) {
            setMessage({ type: 'error', text: 'Minimal isi satu Kendala (Internal atau Eksternal)' });
            return;
        }
        if (selectedZonas.length === 0) {
            setMessage({ type: 'error', text: 'Pilih minimal satu Zona' });
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append('wilayah', wilayah);
        formData.append('zona', allZonaSelected ? 'ALL ZONA' : selectedZonas.join(', '));
        formData.append('divisi', divisi);
        formData.append('description', description);
        formData.append('action_taken', action);
        formData.append('solution_recommendation', solution);
        formData.append('due_date', dueDate);
        if (internalConstraint) formData.append('internal_constraint', internalConstraint);
        if (externalConstraint) formData.append('external_constraint', externalConstraint);
        formData.append('process_type', processType);
        if (awbValue) formData.append('awb', awbValue);
        formData.append('status', status);

        files.forEach(f => formData.append('files', f));

        try {
            const token = localStorage.getItem('token');
            const isEdit = !!selectedIssue;

            const url = isEdit
                ? `${API_URL}/daily-issues/${selectedIssue.id}`
                : `${API_URL}/daily-issues/`;

            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Failed to submit');
            }

            setMessage({ type: 'success', text: isEdit ? 'Issue updated successfully!' : 'Issue reported successfully!' });

            if (addAnother) {
                setSelectedIssue(null);
                setWilayah('');
                setSelectedZonas([]);
                setDivisi('');
                setDescription('');
                setProcessType('Lastmile');
                setAwbTokens([]);
                setAwbDraft('');
                setInternalConstraint('');
                setExternalConstraint('');
                setAction('');
                setSolution('');
                setDueDate('');
                setFiles([]);
                setStatus('Open');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                fetchIssues();
            } else {
                fetchIssues();
                setWilayah('');
                setSelectedZonas([]);
                setDivisi('');
                setDescription('');
                setProcessType('Lastmile');
                setAwbTokens([]);
                setAwbDraft('');
                setInternalConstraint('');
                setExternalConstraint('');
                setAction('');
                setSolution('');
                setDueDate('');
                setFiles([]);
                setStatus('Open');

                setTimeout(() => {
                    setViewMode('list');
                    setMessage(null);
                }, 1000);
            }

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    // Filters
    const [filters, setFilters] = useState({
        issue_number: '',
        date: '',
        wilayah: '',
        zona: '',
        divisi: '',
        status: ''
    });

    const getUniqueOptions = (key: string) => {
        const unique = new Set<string>();
        issues.forEach(issue => {
            let val = '';
            if (key === 'date') {
                val = new Date(issue.date).toLocaleDateString('id-ID');
            } else {
                val = issue[key] as string;
            }
            if (val) unique.add(val);
        });
        return Array.from(unique).sort();
    };

    const filteredIssues = issues.filter(issue => {
        const dateStr = new Date(issue.date).toLocaleDateString('id-ID');
        return (
            (filters.issue_number === '' || issue.issue_number === filters.issue_number) &&
            (filters.date === '' || dateStr === filters.date) &&
            (filters.wilayah === '' || issue.wilayah === filters.wilayah) &&
            (filters.zona === '' || issue.zona === filters.zona) &&
            (filters.divisi === '' || issue.divisi === filters.divisi) &&
            (filters.status === '' || issue.status === filters.status)
        );
    });

    const LightboxComponent = () => (
        mounted && selectedImagePreview && createPortal(
            <div
                className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 z-[9999]"
                onClick={() => setSelectedImagePreview(null)}
            >
                <div
                    className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center outline-none"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => setSelectedImagePreview(null)}
                        className="absolute -top-12 -right-4 md:-right-12 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <img
                        src={selectedImagePreview}
                        alt="Full Preview"
                        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl bg-black"
                    />
                </div>
            </div>,
            document.body
        )
    );

    // --- VIEW: LIST ---
    if (viewMode === 'list') {
        return (
            <DashboardLayout>
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <Link href="/dashboard/v2" className="inline-flex items-center text-muted-foreground hover:text-primary mb-2 transition-colors">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                            </Link>
                            <h1 className="text-3xl font-bold text-foreground">
                                Daftar Issue Harian
                            </h1>
                        </div>
                        <button
                            onClick={() => { setSelectedIssue(null); setViewMode('form'); }}
                            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
                        >
                            <Plus className="w-5 h-5" /> Tambah Issue
                        </button>
                    </div>

                    <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-muted-foreground">
                                <thead className="bg-muted/50 text-foreground uppercase font-bold text-xs">
                                    <tr>
                                        {[
                                            { label: "Issue No", key: "issue_number" },
                                            { label: "Tanggal", key: "date" },
                                            { label: "Wilayah", key: "wilayah" },
                                            { label: "Divisi", key: "divisi" },
                                            { label: "Status", key: "status" },
                                        ].map((header) => (
                                            <th key={header.key} className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-2">
                                                    <span>{header.label}</span>
                                                    <select
                                                        className="bg-white border border-border rounded px-2 py-1 text-xs font-normal w-full"
                                                        onChange={(e) => setFilters(prev => ({ ...prev, [header.key]: e.target.value }))}
                                                        value={filters[header.key as keyof typeof filters]}
                                                    >
                                                        <option value="">All</option>
                                                        {getUniqueOptions(header.key).map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-6 py-4">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredIssues.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                                                Data tidak ditemukan.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredIssues.map((issue) => (
                                            <tr key={issue.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-foreground font-medium">{issue.issue_number}</td>
                                                <td className="px-6 py-4">{new Date(issue.date).toLocaleDateString('id-ID')}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-foreground">{issue.wilayah}</div>
                                                    <div className="text-xs mt-1 text-muted-foreground">{issue.zona}</div>
                                                </td>
                                                <td className="px-6 py-4">{issue.divisi}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${issue.status === 'Open' ? 'bg-red-50 text-red-600 border-red-200' :
                                                        issue.status === 'On Progress' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                            'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                        }`}>
                                                        {issue.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => { setSelectedIssue(issue); setViewMode('detail'); }}
                                                        className="text-primary hover:text-primary/80 font-medium text-sm"
                                                    >
                                                        Detail
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            {issuePages > 0 && (
                                <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border text-sm text-secondary">
                                    <span>Total {totalIssues} issue</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={page <= 1}
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            className="px-3 py-1.5 rounded-lg border border-border bg-white disabled:opacity-50"
                                        >
                                            Sebelumnya
                                        </button>
                                        <span className="font-medium text-foreground">
                                            Halaman {page} / {Math.max(issuePages, 1)}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={page >= issuePages}
                                            onClick={() => setPage((p) => p + 1)}
                                            className="px-3 py-1.5 rounded-lg border border-border bg-white disabled:opacity-50"
                                        >
                                            Berikutnya
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <LightboxComponent />
            </DashboardLayout>
        );
    }

    // --- VIEW: DETAIL ---
    if (viewMode === 'detail' && selectedIssue) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <button
                            onClick={() => { setViewMode('list'); setSelectedIssue(null); }}
                            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar
                        </button>

                        <button
                            onClick={() => setViewMode('form')}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                        >
                            Edit Issue
                        </button>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white border border-border rounded-xl p-8 shadow-lg overflow-hidden relative"
                    >
                        <div className="absolute top-8 right-8 flex items-center gap-3">
                            <span className="text-muted-foreground text-sm font-medium">Status :</span>
                            <span className={`px-4 py-2 rounded-full text-sm font-bold border ${selectedIssue.status === 'Open' ? 'bg-red-50 text-red-600 border-red-200' :
                                selectedIssue.status === 'On Progress' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                    'bg-emerald-50 text-emerald-600 border-emerald-200'
                                }`}>
                                {selectedIssue.status}
                            </span>
                        </div>

                        <h1 className="text-3xl font-bold text-foreground mb-2">{selectedIssue.issue_number}</h1>
                        <div className="text-muted-foreground font-mono mb-8 flex gap-4 text-sm">
                            <span>{new Date(selectedIssue.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <span>•</span>
                            <span>{selectedIssue.shift} ({selectedIssue.process_type || '-'})</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="bg-muted/50 p-5 rounded-xl border border-border">
                                <label className="block text-muted-foreground text-xs uppercase font-bold mb-2">Lokasi & Divisi</label>
                                <div className="text-lg font-semibold text-foreground">{selectedIssue.wilayah}</div>
                                <div className="text-muted-foreground">{selectedIssue.zona}</div>
                                <div className="mt-2 inline-block bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded border border-blue-100">{selectedIssue.divisi}</div>
                            </div>

                            <div className="bg-muted/50 p-5 rounded-xl border border-border">
                                <label className="block text-muted-foreground text-xs uppercase font-bold mb-2">Info Tambahan</label>
                                <div className="mb-2">
                                    <span className="text-muted-foreground text-sm block">Due Date:</span>
                                    <span className="text-foreground font-medium">{new Date(selectedIssue.due_date).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground text-sm block">AWB:</span>
                                    <span className="font-mono text-amber-600 font-medium">{selectedIssue.awb || "-"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">Lampiran Gambar</h3>
                            {selectedIssue.attachments && selectedIssue.attachments.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {selectedIssue.attachments.map((att: any, idx: number) => {
                                        const imageUrl = mediaUrl(att.file_path);
                                        return (
                                            <div
                                                key={att.id || idx}
                                                className="relative group aspect-video bg-muted rounded-xl overflow-hidden border border-border cursor-pointer"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setSelectedImagePreview(imageUrl);
                                                }}
                                            >
                                                <img
                                                    src={imageUrl}
                                                    alt={att.filename}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Maximize2 className="text-white w-8 h-8 opacity-80" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-8 border border-dashed border-border rounded-xl text-center bg-muted/30">
                                    <p className="text-muted-foreground italic">Tidak ada Lampiran</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-2 border-b border-border pb-2">Deskripsi Masalah</h3>
                                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{selectedIssue.description}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {selectedIssue.internal_constraint && (
                                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
                                        <h4 className="text-red-600 font-medium mb-2 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Kendala Internal</h4>
                                        <p className="text-foreground text-sm">{selectedIssue.internal_constraint}</p>
                                    </div>
                                )}
                                {selectedIssue.external_constraint && (
                                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
                                        <h4 className="text-orange-600 font-medium mb-2 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Kendala Eksternal</h4>
                                        <p className="text-foreground text-sm">{selectedIssue.external_constraint}</p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2 border-b border-border pb-2">Tindakan Diambil</h3>
                                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{selectedIssue.action_taken}</p>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2 border-b border-border pb-2">Rekomendasi Solusi</h3>
                                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{selectedIssue.solution_recommendation}</p>
                                </div>
                            </div>
                        </div>

                    </motion.div>
                </div>
                <LightboxComponent />
            </DashboardLayout>
        );
    }

    // --- VIEW: FORM ---
    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => { setViewMode(selectedIssue ? 'detail' : 'list'); if (!selectedIssue) setViewMode('list'); }}
                    className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> {selectedIssue ? 'Kembali ke Detail' : 'Kembali ke Daftar'}
                </button>

                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        {selectedIssue ? `Edit Issue: ${selectedIssue.issue_number}` : 'Input Issue Baru'}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {selectedIssue ? 'Perbarui data issue di bawah ini.' : 'Isi formulir berikut dengan data yang akurat.'}
                    </p>
                </header>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-border rounded-xl p-8 shadow-lg"
                >
                    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/50 p-4 rounded-xl border border-border">
                            <div>
                                <label className="block text-muted-foreground text-xs uppercase font-bold mb-1">Tanggal</label>
                                <div className="text-foreground font-mono">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            </div>
                            <div>
                                <label className="block text-muted-foreground text-xs uppercase font-bold mb-1">Shift User</label>
                                <div className="flex items-center gap-3">
                                    <div className="text-foreground font-mono">{user?.shift || "Regular Shift"}</div>
                                    <div className="w-px h-6 bg-border"></div>
                                    <select
                                        className="bg-white border border-border rounded-lg py-1 px-3 text-sm text-foreground focus:outline-none focus:border-primary"
                                        value={processType}
                                        onChange={(e) => setProcessType(e.target.value)}
                                    >
                                        <option value="Lastmile">Lastmile</option>
                                        <option value="Firstmile">Firstmile</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-foreground font-medium mb-2">Wilayah</label>
                                <select
                                    className={selectClass}
                                    value={wilayah}
                                    onChange={(e) => { setWilayah(e.target.value); setSelectedZonas([]); }}
                                    required
                                >
                                    <option value="" className="text-muted-foreground">Pilih Wilayah</option>
                                    {wilayahOptions.map(w => <option key={w} value={w} className="text-foreground">{w}</option>)}
                                </select>
                            </div>

                            <div>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <label className="block text-foreground font-medium">Zona (Multi-select)</label>
                                    <label className={`inline-flex items-center gap-2 text-sm ${!wilayah ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
                                        <input
                                            type="checkbox"
                                            checked={allZonaSelected}
                                            onChange={toggleAllZona}
                                            disabled={!wilayah}
                                            className="size-4 accent-blue-600"
                                        />
                                        <span className="font-medium text-foreground">All Zona</span>
                                    </label>
                                </div>
                                <div className={`border border-border rounded-xl p-3 bg-white ${!wilayah ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {wilayah ? (
                                        <div className="flex flex-wrap gap-2">
                                            {availableZonas.map((z: string) => (
                                                <button
                                                    key={z}
                                                    type="button"
                                                    onClick={() => toggleZona(z)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${selectedZonas.includes(z)
                                                        ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                                                        : 'bg-muted border-border text-muted-foreground hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {z}
                                                    {selectedZonas.includes(z) && <CheckCircle className="w-3 h-3 inline ml-1.5" />}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-muted-foreground text-sm italic py-2">Pilih Wilayah terlebih dahulu</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-foreground font-medium mb-2">Divisi</label>
                            <select
                                className={selectClass}
                                value={divisi}
                                onChange={(e) => setDivisi(e.target.value)}
                                required
                            >
                                <option value="" className="text-muted-foreground">Pilih Divisi</option>
                                {["OUTBOUND", "TRANSIT", "INBOUND", "PENERUSAN", "PIC", "TRACER UNDEL", "SCO", "Pickup"].map(d =>
                                    <option key={d} value={d} className="text-foreground">{d}</option>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-foreground font-medium mb-2">Deskripsi Issue</label>
                            <textarea
                                className={selectClass}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                placeholder="Jelaskan detail masalah..."
                                rows={4}
                            />
                        </div>

                        <div>
                            <label className="block text-foreground font-medium mb-2">Nomor AWB (Opsional)</label>
                            <div
                                className="flex min-h-[48px] w-full flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 focus-within:border-primary"
                                onClick={(e) => {
                                    const input = (e.currentTarget.querySelector('input') as HTMLInputElement | null);
                                    input?.focus();
                                }}
                            >
                                {awbTokens.map((token) => (
                                    <span
                                        key={token}
                                        className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800"
                                    >
                                        {token}
                                        <button
                                            type="button"
                                            onClick={() => removeAwbToken(token)}
                                            className="rounded p-0.5 hover:bg-amber-200"
                                            aria-label={`Hapus AWB ${token}`}
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    className="min-w-[160px] flex-1 border-0 bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                                    value={awbDraft}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (/[,\s]/.test(val)) {
                                            const parts = val.split(/[,\s]+/);
                                            const remainder = parts.pop() ?? '';
                                            parts
                                                .map((p) => p.trim())
                                                .filter(Boolean)
                                                .forEach((p) => {
                                                    setAwbTokens((prev) =>
                                                        prev.includes(p) ? prev : [...prev, p]
                                                    );
                                                });
                                            setAwbDraft(remainder);
                                            return;
                                        }
                                        setAwbDraft(val);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === ' ' || e.key === 'Enter' || e.key === ',') {
                                            e.preventDefault();
                                            commitAwbDraft();
                                            return;
                                        }
                                        if (e.key === 'Backspace' && !awbDraft && awbTokens.length > 0) {
                                            e.preventDefault();
                                            setAwbTokens((prev) => prev.slice(0, -1));
                                        }
                                    }}
                                    onBlur={() => commitAwbDraft()}
                                    placeholder={awbTokens.length ? 'AWB berikutnya…' : 'Ketik AWB lalu tekan Spasi'}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 ml-1">
                                * Tekan Spasi untuk menambahkan AWB berikutnya (otomatis dipisah koma)
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-red-600 font-medium mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Kendala Internal</label>
                                <textarea
                                    className={`${selectClass} border-red-200 focus:border-red-500 bg-red-50/10`}
                                    value={internalConstraint}
                                    onChange={(e) => setInternalConstraint(e.target.value)}
                                    placeholder="Jelaskan kendala internal..."
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="block text-orange-600 font-medium mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Kendala Eksternal</label>
                                <textarea
                                    className={`${selectClass} border-orange-200 focus:border-orange-500 bg-orange-50/10`}
                                    value={externalConstraint}
                                    onChange={(e) => setExternalConstraint(e.target.value)}
                                    placeholder="Jelaskan kendala eksternal..."
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-foreground font-medium mb-2">Tindakan Diambil</label>
                                <textarea
                                    className={selectClass}
                                    value={action}
                                    onChange={(e) => setAction(e.target.value)}
                                    placeholder="Jelaskan tindakan yang sudah dilakukan..."
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="block text-foreground font-medium mb-2">Rekomendasi Solusi</label>
                                <textarea
                                    className={selectClass}
                                    value={solution}
                                    onChange={(e) => setSolution(e.target.value)}
                                    placeholder="Saran untuk perbaikan ke depan..."
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-foreground font-medium mb-2">Status</label>
                                <div className="flex gap-4">
                                    {['Open', 'On Progress', 'Closed'].map((s) => (
                                        <label key={s} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="status"
                                                value={s}
                                                checked={status === s}
                                                onChange={(e) => setStatus(e.target.value)}
                                                className="w-4 h-4 text-primary focus:ring-primary"
                                            />
                                            <span className="text-foreground">{s}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-foreground font-medium mb-2">Due Date</label>
                                <input
                                    type="date"
                                    className={selectClass}
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-foreground font-medium mb-2">Lampiran (Max 6 File)</label>
                            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/50 transition-colors bg-muted/10 relative">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={files.length >= 6}
                                />
                                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-foreground font-medium">Klik atau drop file di sini</p>
                                <p className="text-xs text-muted-foreground mt-1">Format: JPG, PNG (Max 5MB)</p>
                            </div>

                            {filePreviews.length > 0 && (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mt-4">
                                    {filePreviews.map((preview, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                                            <img src={preview.url} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                                {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                {message.text}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className="px-6 py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors"
                            >
                                Batal
                            </button>
                            {!selectedIssue && (
                                <button
                                    type="button"
                                    onClick={(e) => handleSubmit(e as any, true)}
                                    disabled={loading}
                                    className="px-6 py-2.5 rounded-xl border border-primary text-primary font-medium hover:bg-blue-50 transition-colors"
                                >
                                    Simpan & Tambah Lagi
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        {selectedIssue ? 'Update Issue' : 'Simpan Issue'}
                                    </>
                                )}
                            </button>
                        </div>

                    </form>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
