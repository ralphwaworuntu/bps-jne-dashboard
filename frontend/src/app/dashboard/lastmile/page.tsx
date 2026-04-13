"use client";

import { motion } from 'framer-motion';
import { Database, FolderTree, ArrowLeft, Construction, FileText } from 'lucide-react';
import Link from 'next/link';

export default function LastmilePage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header Navigation */}
                <Link href="/dashboard" className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Link>

                <header className="mb-12">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
                        Data Lastmile
                    </h1>
                    <p className="text-slate-400 mt-2">Select a database to view or manage reports.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                    {/* OPTION 1: Database OTS */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 cursor-pointer hover:bg-white/10 transition-all shadow-2xl"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Database className="w-32 h-32" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full min-h-[200px] justify-between">
                            <div className="p-4 bg-blue-500/20 w-fit rounded-2xl mb-6">
                                <Database className="w-8 h-8 text-blue-400" />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Database OTS</h2>
                                <p className="text-slate-400 mb-6">
                                    Centralized Operational Time Service database for overall performance monitoring.
                                </p>
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-900/50 px-4 py-2 rounded-lg w-fit border border-white/5">
                                    <Construction className="w-4 h-4 text-amber-500" /> Feature Coming Soon
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* OPTION 2: Database OTS Cabang */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 cursor-pointer hover:bg-white/10 transition-all shadow-2xl"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FolderTree className="w-32 h-32" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full min-h-[200px] justify-between">
                            <div className="p-4 bg-emerald-500/20 w-fit rounded-2xl mb-6">
                                <FolderTree className="w-8 h-8 text-emerald-400" />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Database OTS Cabang</h2>
                                <p className="text-slate-400 mb-6">
                                    Branch-specific OTS data with granular breakdown and regional performance tracking.
                                </p>
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-900/50 px-4 py-2 rounded-lg w-fit border border-white/5">
                                    <Construction className="w-4 h-4 text-amber-500" /> Feature Coming Soon
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* OPTION 3: Database Transit Manifest */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 cursor-pointer hover:bg-white/10 transition-all shadow-2xl md:col-span-2 lg:col-span-1"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FileText className="w-32 h-32" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full min-h-[200px] justify-between">
                            <div className="p-4 bg-purple-500/20 w-fit rounded-2xl mb-6">
                                <FileText className="w-8 h-8 text-purple-400" />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Database Transit Manifest</h2>
                                <p className="text-slate-400 mb-6">
                                    Comprehensive records of transit manifests for tracking shipment movements between hubs.
                                </p>
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-900/50 px-4 py-2 rounded-lg w-fit border border-white/5">
                                    <Construction className="w-4 h-4 text-amber-500" /> Feature Coming Soon
                                </div>
                            </div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </div>
    );
}
