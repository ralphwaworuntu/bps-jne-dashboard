"use client";

import {
    User,
    LogOut,
    Upload,
    Menu,
    Bell
} from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '../../../config';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import CurrentTime from './CurrentTime';

interface HeaderProps {
    toggleSidebar: () => void;
    user: any;
    notifications: any[];
    onLogout: () => void;
    markAllRead: () => void;
}

export default function Header({
    toggleSidebar,
    user,
    notifications,
    onLogout,
    markAllRead
}: HeaderProps) {
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Click outside handler for both dropdowns
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const [uploadProgress, setUploadProgress] = useState({
        master: false,
        lastmile: false,
        firstmile: false
    });
    const [completionTime, setCompletionTime] = useState<string | null>(null);

    const fetchSystemInfo = async () => {
        try {
            const res = await fetch(`${API_URL}/system-info`);
            if (res.ok) {
                const data = await res.json();
                if (data.master_last_update) setUploadProgress(prev => ({ ...prev, master: true }));
                if (data.lastmile_last_update) setUploadProgress(prev => ({ ...prev, lastmile: true }));
                if (data.firstmile_last_update) setUploadProgress(prev => ({ ...prev, firstmile: true }));

                if (data.master_last_update && data.lastmile_last_update && data.firstmile_last_update) {
                    const timestamps = [
                        new Date(data.master_last_update).getTime(),
                        new Date(data.lastmile_last_update).getTime(),
                        new Date(data.firstmile_last_update).getTime()
                    ];
                    const maxDate = new Date(Math.max(...timestamps));
                    const formatted = maxDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + " • " + maxDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    setCompletionTime(formatted);
                }
            }
        } catch (error) {
            console.error("Failed to fetch system info", error);
        }
    };

    useEffect(() => {
        fetchSystemInfo();
        const interval = setInterval(fetchSystemInfo, 30000);
        return () => clearInterval(interval);
    }, []);

    const getGlobalStatus = () => {
        const { master, lastmile, firstmile } = uploadProgress;
        if (master && lastmile && firstmile) return `All Data Processed`;
        if (master && (lastmile || firstmile)) return "Processing...";
        if (master) return "Master Ready";
        return "Pending Upload";
    };

    return (
        <div className="flex items-center justify-between w-full h-[90px] shrink-0 border-b border-border bg-white px-5 md:px-8 z-40 sticky top-0">
            {/* Mobile/Desktop Toggle */}
            <button
                onClick={toggleSidebar}
                className="size-11 flex items-center justify-center rounded-xl ring-1 ring-border hover:ring-primary transition-all duration-300 cursor-pointer mr-4"
            >
                <Menu className="size-6 text-foreground" />
            </button>

            {/* Page Title */}
            <h2 className="hidden lg:block font-bold text-2xl text-foreground">Dashboard</h2>

            {/* Right Actions */}
            <div className="flex items-center gap-3 ml-auto">
                {/* Status Indicator */}
                <div className="hidden xl:flex flex-col items-end mr-4">
                    <span className="text-xs text-secondary">Status</span>
                    <span className={`text-sm font-semibold ${getGlobalStatus() === 'All Data Processed' ? 'text-emerald-600' : 'text-orange-500'}`}>
                        {getGlobalStatus()}
                    </span>
                </div>
                <div className="h-6 w-px bg-border mx-1 hidden xl:block"></div>

                <Link href="/dashboard/v2/upload">
                    <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors shadow-sm font-medium text-sm">
                        <Upload className="w-4 h-4" />
                        <span>Upload Data</span>
                    </button>
                </Link>
                <div className="h-6 w-px bg-border mx-1 hidden sm:block"></div>
                <CurrentTime />

                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="size-11 flex items-center justify-center rounded-xl ring-1 ring-border hover:ring-primary transition-all duration-300 cursor-pointer relative"
                    >
                        <Bell className="size-6 text-secondary" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-5 px-1.5 rounded-full bg-error text-white text-xs font-medium flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Dropdown */}
                    <AnimatePresence>
                        {showNotifications && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute right-0 mt-2 w-80 bg-white border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
                            >
                                <div className="p-4 border-b border-border flex justify-between items-center bg-card-grey">
                                    <h3 className="font-semibold text-foreground">Notifications</h3>
                                    <span className="text-xs text-secondary">{unreadCount} Unread</span>
                                </div>

                                <div className="max-h-[400px] overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-secondary text-sm flex flex-col items-center gap-2">
                                            <Bell className="w-8 h-8 opacity-20" />
                                            No notifications
                                        </div>
                                    ) : (
                                        notifications.map((notif) => (
                                            <div key={notif.id} className={`p-4 border-b border-border hover:bg-muted transition-colors cursor-pointer ${!notif.is_read ? 'bg-blue-50/50' : ''}`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className={`text-sm font-semibold ${notif.type === 'error' ? 'text-error' : notif.type === 'warning' ? 'text-warning-dark' : notif.type === 'success' ? 'text-success' : 'text-primary'}`}>
                                                        {notif.title}
                                                    </h4>
                                                    <span className="text-[10px] text-secondary whitespace-nowrap ml-2">
                                                        {new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-secondary leading-relaxed">{notif.message}</p>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="p-3 text-center border-t border-border bg-white">
                                    <button
                                        onClick={markAllRead}
                                        className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                                    >
                                        Mark all as read
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* User Profile */}
                <div
                    ref={userMenuRef}
                    className="hidden md:flex items-center gap-3 pl-3 border-l border-border cursor-pointer relative"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                >
                    <div className="text-right">
                        <p className="font-semibold text-foreground text-sm">{user?.full_name || 'User'}</p>
                        <p className="text-secondary text-xs">{user?.role || 'Admin'}</p>
                    </div>
                    <div className={`size-11 rounded-full bg-primary/10 flex items-center justify-center ring-2 transition-all ${showUserMenu ? 'ring-primary' : 'ring-border hover:ring-primary'}`}>
                        <User className="size-5 text-primary" />
                    </div>

                    {/* Logout Dropdown */}
                    <AnimatePresence>
                        {showUserMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-14 right-0 pt-2 w-48 z-50"
                            >
                                <div className="bg-white border border-border rounded-xl shadow-xl overflow-hidden">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onLogout();
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error-light flex items-center gap-2 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" /> Sign Out
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
