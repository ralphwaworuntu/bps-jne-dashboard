"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useEffect } from 'react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
        error: <AlertCircle className="w-5 h-5 text-red-400" />,
        info: <Info className="w-5 h-5 text-blue-400" />
    };

    const styles = {
        success: "bg-emerald-50 border-emerald-200 text-emerald-800",
        error: "bg-red-50 border-red-200 text-red-800",
        info: "bg-blue-50 border-blue-200 text-blue-800"
    };

    return (
        <div className="fixed bottom-4 right-4 z-[9999]">
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.3, type: "spring" }}
                className={`flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md min-w-[300px] max-w-[400px] ${styles[type]}`}
            >
                <div className="mt-0.5">{icons[type]}</div>
                <div className="flex-1 text-sm font-medium leading-relaxed">
                    {message}
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors opacity-70 hover:opacity-100"
                >
                    <X className="w-4 h-4" />
                </button>
            </motion.div>
        </div>
    );
}
