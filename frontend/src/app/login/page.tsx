"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogIn, User, Lock, Server, AlertCircle } from 'lucide-react';
import { API_URL } from '../../config';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const router = useRouter();

    useEffect(() => {
        // Health Check
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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const res = await fetch(`${API_URL}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.detail || 'Invalid credentials');
            }

            const data = await res.json();
            localStorage.setItem('token', data.access_token);
            router.push('/dashboard/v2');
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl relative z-10"
            >
                {/* Back Button */}
                <Link
                    href="/"
                    className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 flex items-center gap-2"
                    title="Back to Landing Page"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>



                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                    <p className="text-slate-400">Sign in to BPS JNE Dashboard</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm text-center flex items-center justify-center gap-2">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}

                {serverStatus === 'offline' && !error && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-lg mb-6 text-sm text-center">
                        Cannot connect to server. Please ensure backend is running at {API_URL}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-slate-400 text-sm mb-2">Email Address</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="admin@bps.go.id"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-sm mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || serverStatus === 'offline'}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Signing in...' : (
                            <>
                                <LogIn className="w-5 h-5" />
                                Sign In
                            </>
                        )}
                    </button>
                </form>

                <p className="text-center mt-6 text-slate-500 text-sm">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
                        Register
                    </Link>
                </p>
            </motion.div>


            {/* Demo Accounts Panel */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="hidden lg:block ml-8 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl w-80 shadow-2xl h-[600px] overflow-y-auto custom-scrollbar"
            >
                <div className="sticky top-0 bg-transparent backdrop-blur-md pb-4 pt-2 mb-2 border-b border-white/10 z-10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Server className="w-5 h-5 text-blue-400" />
                        Demo Accounts
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Click to copy/fill credentials</p>
                </div>

                <div className="space-y-3">
                    {[
                        { role: 'Super Admin', email: 'admin@bps.go.id' },
                        { role: 'Admin Cabang', email: 'admincabang@bps.go.id' },
                        { role: 'Admin BPS', email: 'adminbps@bps.go.id' },
                        { role: 'Admin Inbound', email: 'admininbound@bps.go.id' },
                        { role: 'Admin Outbound', email: 'adminoutbound@bps.go.id' },
                        { role: 'Admin Pickup', email: 'adminpickup@bps.go.id' },
                        { role: 'Admin SCO', email: 'adminsco@bps.go.id' },
                        { role: 'Admin Salles', email: 'adminsalles@bps.go.id' },
                        { role: 'Admin Finance', email: 'adminfinance@bps.go.id' },
                        { role: 'Admin CCC', email: 'adminccc@bps.go.id' },
                        { role: 'Admin COD', email: 'admincod@bps.go.id' },
                        { role: 'Admin Compliance', email: 'admincomplience@bps.go.id' },
                        { role: 'PIC Cabang', email: 'piccabang@bps.go.id' },
                    ].map((acc) => (
                        <div
                            key={acc.email}
                            onClick={() => { setEmail(acc.email); setPassword('admin123'); }}
                            className="bg-black/20 hover:bg-white/10 p-3 rounded-lg border border-white/5 cursor-pointer transition-colors group"
                        >
                            <div className="text-xs font-bold text-blue-300 mb-0.5">{acc.role}</div>
                            <div className="text-xs text-slate-300 font-mono break-all group-hover:text-white">{acc.email}</div>
                            <div className="text-[10px] text-slate-500 mt-1">Pass: admin123</div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div >
    );
}
