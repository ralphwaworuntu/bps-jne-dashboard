"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '../../../config';
import Sidebar from '@/components/dashboard/v2/Sidebar';
import Header from '@/components/dashboard/v2/Header';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved) {
            setIsCollapsed(JSON.parse(saved));
        }

        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        const fetchUser = async () => {
            try {
                const res = await fetch(`${API_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const userData = await res.json();
                    setUser(userData);
                } else {
                    router.push('/');
                }
            } catch (e) {
                router.push('/');
            }
        };

        fetchUser();
    }, [router]);

    // Data Fetching for Header (Notifications)
    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch(`${API_URL}/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setNotifications(await res.json());
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    const markAllRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/notifications/read-all`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error("Failed to mark all read", error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/');
    };

    const toggleSidebar = () => {
        if (window.innerWidth >= 1024) {
            const newState = !isCollapsed;
            setIsCollapsed(newState);
            localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
        } else {
            setSidebarOpen(!sidebarOpen);
        }
    };

    if (!user) return null;

    return (
        <div className="flex h-screen max-h-screen flex-1 bg-muted overflow-hidden font-sans text-foreground">
            <Sidebar
                isOpen={sidebarOpen}
                isCollapsed={isCollapsed}
                toggleSidebar={toggleSidebar}
            />

            <main className={`flex-1 flex flex-col bg-white min-h-screen transition-all duration-300 ${isCollapsed ? 'lg:ml-[80px]' : 'lg:ml-[280px]'} overflow-hidden`}>
                <Header
                    toggleSidebar={toggleSidebar}
                    user={user}
                    notifications={notifications}
                    onLogout={handleLogout}
                    markAllRead={markAllRead}
                />

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
