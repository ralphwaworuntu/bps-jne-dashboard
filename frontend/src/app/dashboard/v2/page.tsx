"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '../../../config';
import Sidebar from '@/components/dashboard/v2/Sidebar';
import Header from '@/components/dashboard/v2/Header';
import StatsCard from '@/components/dashboard/v2/StatsCard';
import { VolumeChart, StatusChart } from '@/components/dashboard/v2/AnalyticsCharts';
import RecentActivity from '@/components/dashboard/v2/RecentActivity';
import {
    Box,
    Truck,
    AlertTriangle,
    CheckCircle,
    BarChart3 // Fallback icon
} from 'lucide-react';

export default function DashboardV2() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [firstmileStats, setFirstmileStats] = useState<any>(null);
    const [correctionStats, setCorrectionStats] = useState<any[]>([]);
    const [dailyIssueStats, setDailyIssueStats] = useState<any[]>([]);
    const router = useRouter();

    // --- 1. Auth Check ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        fetch(`${API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(async (res) => {
                if (!res.ok) throw new Error('Unauthorized');
                return res.json();
            })
            .then(data => setUser(data))
            .catch(() => {
                localStorage.removeItem('token');
                router.push('/login');
            });
    }, [router]);

    // --- 2. Data Fetching ---
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

    const fetchAnalytics = async () => {
        try {
            const res = await fetch(`${API_URL}/analytics/firstmile`);
            if (res.ok) setFirstmileStats(await res.json());
        } catch (error) {
            console.error("Failed to fetch firstmile analytics", error);
        }
    };

    const fetchCorrectionStats = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            // Trying plural first as per backend definition
            const res = await fetch(`${API_URL}/correction-requests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCorrectionStats(data);
            }
        } catch (error) {
            console.error("Failed to fetch correction stats", error);
        }
    };

    const fetchDailyIssues = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch(`${API_URL}/daily-issues`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDailyIssueStats(data);
            }
        } catch (error) {
            console.error("Failed to fetch daily issues", error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            fetchAnalytics();
            fetchCorrectionStats();
            fetchDailyIssues();
            const interval = setInterval(() => {
                fetchNotifications();
                fetchCorrectionStats();
                fetchDailyIssues();
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/');
    };

    const toggleSidebar = () => {
        if (window.innerWidth >= 1024) {
            setIsCollapsed(!isCollapsed);
        } else {
            setSidebarOpen(!sidebarOpen);
        }
    };

    // --- 3. UI Helpers ---
    if (!user) return null; // Or loading spinner

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

                <div className="flex-1 overflow-y-auto p-5 md:p-8">
                    {/* Date Filter & Status */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold mb-1">Performance Summary</h1>
                            <p className="text-secondary text-sm">Overview of current shipment performance.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Could add DatePicker here later */}
                            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary-hover transition-all duration-300 cursor-pointer shadow-lg shadow-primary/20">
                                <span>Export Report</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                        <StatsCard
                            title="Lastmile Data"
                            count="Lastmile"
                            subtext="Manage Shipments"
                            icon={Box}
                            href="/dashboard/v2/lastmile"
                            colorClass="text-primary"
                        />
                        <StatsCard
                            title="Firstmile Data"
                            count={firstmileStats?.total_shipments?.toLocaleString() || "0"}
                            subtext="Total Shipments"
                            icon={Truck}
                            href="/dashboard/v2/firstmile"
                            colorClass="text-orange-500"
                            trend={firstmileStats?.success_rate ? `${firstmileStats.success_rate}% Success` : undefined}
                            trendUp={true}
                        />
                        <StatsCard
                            title="Issue Harian"
                            count={dailyIssueStats ? dailyIssueStats.length.toLocaleString() : "0"}
                            subtext="Total Issues"
                            icon={AlertTriangle}
                            href="/dashboard/v2/daily-issue"
                            colorClass="text-error"
                        />
                        <StatsCard
                            title="Req Koreksi"
                            count={correctionStats ? correctionStats.length.toLocaleString() : "0"}
                            subtext="Total Requests"
                            icon={CheckCircle}
                            href="/dashboard/v2/correction-request"
                            colorClass="text-emerald-500"
                        />
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <VolumeChart firstmileStats={firstmileStats} />
                        <StatusChart firstmileStats={firstmileStats} />
                    </div>

                    {/* Bottom Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
                        {/* Top Routes */}
                        <div className="flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm h-full">
                            <div className="flex items-center justify-between p-6 border-b border-border">
                                <h3 className="font-bold text-lg text-foreground">Top Destinations</h3>
                                <button className="text-xs font-semibold text-primary hover:text-primary-hover">View All</button>
                            </div>
                            <div className="p-0 flex flex-col h-full overflow-y-auto">
                                {firstmileStats?.top_routes && firstmileStats.top_routes.length > 0 ? (
                                    firstmileStats.top_routes.map((route: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index < 3 ? 'bg-primary text-white' : 'bg-secondary/20 text-secondary'}`}>
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <p className="font-semibold text-sm text-foreground">{route.destination}</p>
                                                    <p className="text-xs text-secondary">{route.percentage}% of total</p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-sm text-foreground">{route.count.toLocaleString()}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-secondary text-sm flex flex-col items-center gap-2">
                                        <BarChart3 className="w-8 h-8 opacity-20" />
                                        <p>No route data available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Recent Activity */}
                        <RecentActivity notifications={notifications} />
                    </div>

                </div>
            </main>
        </div>
    );
}
