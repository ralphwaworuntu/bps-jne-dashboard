"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, BarChart2, ShieldCheck, Truck } from 'lucide-react';
import { API_URL } from '../config';

export default function LandingPage() {
    const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

    useEffect(() => {
        const checkServer = async () => {
            try {
                const res = await fetch(`${API_URL}/`);
                if (res.ok) {
                    setServerStatus('online');
                } else {
                    setServerStatus('offline');
                }
            } catch (e) {
                console.error("Health check failed:", e);
                setServerStatus('offline');
            }
        };
        checkServer();
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-slate-950/50 backdrop-blur-lg border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">B</div>
                        <span className="text-xl font-bold tracking-tight">BPS <span className="text-slate-400 font-light hidden sm:inline">Analytics</span></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                            Sign In
                        </Link>
                        <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium mb-6 ${serverStatus === 'online' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            serverStatus === 'offline' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                'bg-slate-500/10 border-slate-500/20 text-slate-400'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-emerald-500' :
                                serverStatus === 'offline' ? 'bg-red-500' :
                                    'bg-slate-500 animate-pulse'
                                }`} />
                            {serverStatus === 'online' ? 'System Online' : serverStatus === 'offline' ? 'System Offline' : 'Connecting...'}
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                            Dashboard Analisis <br /> Untuk <span className="text-blue-500">JNE KOE</span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Solusi Terintegrasi Optimalisasi Fungsi BPS: Pantau Performa, Jaga Kualitas SLA, dan Terbitkan Laporan Secara Otomatis.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                Go to Dashboard <ArrowRight className="w-4 h-4" />
                            </Link>

                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 px-6 bg-slate-900/50 border-y border-white/5">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { title: "Real-time Tracking", description: "Monitor shipment statuses instantly as they move through the JNE network.", icon: Truck },
                        { title: "Automated Reporting", description: "Generate Excel reports with a single click, preserving complex formulas and layouts.", icon: BarChart2 },
                        { title: "Secure Access", description: "Role-based access control ensuring data privacy for all stakeholders.", icon: ShieldCheck },
                    ].map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center mb-6">
                                <feature.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                            <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/5 text-center text-slate-500 text-sm">
                <p>&copy; {new Date().getFullYear()} BPS JNE Dashboard. All rights reserved.</p>
            </footer>
        </div>
    );
}
