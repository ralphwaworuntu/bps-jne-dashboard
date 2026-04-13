"use client";

import { CheckCircle, Truck, AlertTriangle, Info, Bell } from 'lucide-react';

interface Notification {
    id: number;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

interface RecentActivityProps {
    notifications: Notification[];
}

export default function RecentActivity({ notifications }: RecentActivityProps) {
    // Show only last 5
    const recentNotifications = notifications.slice(0, 5);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return CheckCircle;
            case 'error': return AlertTriangle;
            case 'warning': return AlertTriangle;
            default: return Truck; // Default icon
        }
    };

    const getColors = (type: string) => {
        switch (type) {
            case 'success': return { bg: 'bg-success', text: 'text-success' };
            case 'error': return { bg: 'bg-error', text: 'text-error' };
            case 'warning': return { bg: 'bg-warning', text: 'text-warning-dark' };
            default: return { bg: 'bg-primary', text: 'text-primary' };
        }
    };

    return (
        <div className="flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm h-full">
            <div className="flex items-center justify-between p-6 border-b border-border">
                <h3 className="font-bold text-lg text-foreground">Live System Activity</h3>
                <span className="flex items-center gap-1.5 px-2 py-1 bg-success/10 text-success text-xs font-bold rounded-full">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                    </span>
                    Live
                </span>
            </div>
            <div className="flex flex-col p-6 gap-6 flex-1 overflow-y-auto max-h-[400px]">
                {recentNotifications.length === 0 ? (
                    <div className="text-center text-secondary py-8 flex flex-col items-center gap-2">
                        <Bell className="w-8 h-8 opacity-20" />
                        <p>No recent activity</p>
                    </div>
                ) : (
                    recentNotifications.map((notif) => {
                        const Icon = getIcon(notif.type);
                        const { bg, text } = getColors(notif.type);

                        return (
                            <div key={notif.id} className="flex gap-4">
                                <div className="relative">
                                    {/* Avatar Placeholder */}
                                    <div className="w-12 h-12 rounded-full bg-card-grey flex items-center justify-center ring-2 ring-white shadow-sm overflow-hidden">
                                        {/* Random Avatar based on ID or simple icon */}
                                        <span className="text-xs font-bold text-secondary">SYS</span>
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 ${bg} text-white p-1 rounded-full ring-2 ring-white`}>
                                        <Icon className="size-3" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex justify-between items-start">
                                        <h4 className={`font-semibold text-sm ${text}`}>{notif.title}</h4>
                                        <span className="text-xs text-secondary whitespace-nowrap ml-2">
                                            {new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-secondary mt-0.5 line-clamp-2">{notif.message}</p>
                                </div>
                            </div>
                        );
                    })
                )}

                {notifications.length > 5 && (
                    <button className="w-full py-3 mt-auto rounded-xl border border-border text-sm font-semibold text-secondary hover:bg-muted hover:text-foreground transition-all">
                        View All Activities
                    </button>
                )}
            </div>
        </div>
    );
}
