"use client";

import Link from "next/link";
import { ArrowLeft, ShieldOff } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl relative z-10 text-center">
        <Link
          href="/login"
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 flex items-center gap-2"
          title="Back to Login"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="flex justify-center mb-4 text-amber-400">
          <ShieldOff className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Pendaftaran ditutup</h1>
        <p className="text-slate-400 text-sm mb-6">
          Akun baru hanya dapat dibuat oleh Admin IT melalui menu Kelola User.
          Silakan hubungi administrator Anda.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all"
        >
          Kembali ke Login
        </Link>
      </div>
    </div>
  );
}
