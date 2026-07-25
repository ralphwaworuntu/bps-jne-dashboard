"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Box,
    Truck,
    Users,
    BarChart3,
    X,
    AlertTriangle,
    CheckCircle,
    MapPin,
    DollarSign,
    Briefcase,
    Wallet,
    ReceiptText,
    ScrollText,
    UserCog,
} from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    isCollapsed?: boolean;
    toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, isCollapsed = false, toggleSidebar }: SidebarProps) {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            <aside
                className={`flex flex-col shrink-0 h-screen fixed inset-y-0 left-0 z-50 bg-white border-r border-border transform transition-all duration-300 overflow-hidden 
                    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    ${isCollapsed ? 'w-[80px]' : 'w-[280px]'}
                `}
            >


                {/* Top Bar */}
                <div className={`flex items-center border-b border-border h-[90px] px-5 gap-3 ${isCollapsed ? 'justify-center' : 'justify-between lg:justify-center'}`}>
                    <div className="flex items-center gap-3">
                        {!isCollapsed ? (
                            <div className="relative w-[120px] h-[40px]">
                                <Image
                                    src="/jne_logo.png"
                                    alt="JNE Logo"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                        ) : (
                            <div className="relative w-10 h-10">
                                <Image
                                    src="/jne_logo.png"
                                    alt="JNE Logo"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                        )}
                    </div>
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden size-11 flex shrink-0 bg-white rounded-xl p-[10px] items-center justify-center ring-1 ring-border hover:ring-primary transition-all duration-300 cursor-pointer"
                    >
                        <X className="size-6 text-secondary" />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex flex-col p-4 gap-6 overflow-y-auto flex-1 scrollbar-hide">

                    {/* Overview */}
                    <div className="flex flex-col gap-4">
                        {!isCollapsed && <h3 className="font-medium text-sm text-secondary px-2">Overview</h3>}
                        <div className="flex flex-col gap-1">
                            <Link href="/dashboard/v2" className="group cursor-pointer">
                                <div className={`flex items-center rounded-xl p-3 gap-3 transition-all duration-300 ${isActive('/dashboard/v2') ? 'bg-muted' : 'bg-white hover:bg-muted'} ${isCollapsed ? 'justify-center' : ''}`}>
                                    <LayoutDashboard className={`size-6 shrink-0 transition-all duration-300 ${isActive('/dashboard/v2') ? 'text-foreground' : 'text-secondary group-hover:text-foreground'}`} />
                                    {!isCollapsed && (
                                        <span className={`font-medium transition-all duration-300 ${isActive('/dashboard/v2') ? 'font-semibold text-foreground' : 'text-secondary group-hover:text-foreground'}`}>
                                            Dashboard
                                        </span>
                                    )}
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Operations */}
                    <div className="flex flex-col gap-4">
                        {!isCollapsed && <h3 className="font-medium text-sm text-secondary px-2">Operations</h3>}
                        <div className="flex flex-col gap-1">

                            <Link href="/dashboard/v2/lastmile" className="group cursor-pointer">
                                <div className={`flex items-center rounded-xl p-3 gap-3 transition-all duration-300 ${isActive('/dashboard/v2/lastmile') ? 'bg-muted' : 'bg-white hover:bg-muted'} ${isCollapsed ? 'justify-center' : ''}`}>
                                    <Box className={`size-6 shrink-0 transition-all duration-300 ${isActive('/dashboard/v2/lastmile') ? 'text-foreground' : 'text-secondary group-hover:text-foreground'}`} />
                                    {!isCollapsed && (
                                        <span className={`font-medium transition-all duration-300 ${isActive('/dashboard/v2/lastmile') ? 'font-semibold text-foreground' : 'text-secondary group-hover:text-foreground'}`}>
                                            Lastmile Data
                                        </span>
                                    )}
                                </div>
                            </Link>

                            <Link href="/dashboard/v2/firstmile" className="group cursor-pointer">
                                <div className={`flex items-center rounded-xl p-3 gap-3 transition-all duration-300 ${
                                    (pathname === '/dashboard/v2/firstmile'
                                        || pathname?.startsWith('/dashboard/v2/firstmile/ots-cabang')
                                        || pathname?.startsWith('/dashboard/v2/firstmile/database-smu'))
                                        ? 'bg-muted'
                                        : 'bg-white hover:bg-muted'
                                } ${isCollapsed ? 'justify-center' : ''}`}>
                                    <Truck className={`size-6 shrink-0 transition-all duration-300 ${
                                        (pathname === '/dashboard/v2/firstmile'
                                            || pathname?.startsWith('/dashboard/v2/firstmile/ots-cabang')
                                            || pathname?.startsWith('/dashboard/v2/firstmile/database-smu'))
                                            ? 'text-foreground'
                                            : 'text-secondary group-hover:text-foreground'
                                    }`} />
                                    {!isCollapsed && (
                                        <span className={`font-medium transition-all duration-300 ${
                                            (pathname === '/dashboard/v2/firstmile'
                                                || pathname?.startsWith('/dashboard/v2/firstmile/ots-cabang')
                                                || pathname?.startsWith('/dashboard/v2/firstmile/database-smu'))
                                                ? 'font-semibold text-foreground'
                                                : 'text-secondary group-hover:text-foreground'
                                        }`}>
                                            Firstmile Data
                                        </span>
                                    )}
                                </div>
                            </Link>

                            <Link href="/dashboard/v2/geotagging" className="group cursor-pointer">
                                <div className={`flex items-center rounded-xl p-3 gap-3 transition-all duration-300 ${isActive('/dashboard/v2/geotagging') ? 'bg-muted' : 'bg-white hover:bg-muted'} ${isCollapsed ? 'justify-center' : ''}`}>
                                    <MapPin className={`size-6 shrink-0 transition-all duration-300 ${isActive('/dashboard/v2/geotagging') ? 'text-foreground' : 'text-secondary group-hover:text-foreground'}`} />
                                    {!isCollapsed && (
                                        <span className={`font-medium transition-all duration-300 ${isActive('/dashboard/v2/geotagging') ? 'font-semibold text-foreground' : 'text-secondary group-hover:text-foreground'}`}>
                                            Geotaging
                                        </span>
                                    )}
                                </div>
                            </Link>

                            <Link href="/dashboard/v2/daily-issue" className="group cursor-pointer">
                                <div className={`flex items-center rounded-xl p-3 gap-3 transition-all duration-300 ${isActive('/dashboard/v2/daily-issue') ? 'bg-muted' : 'bg-white hover:bg-muted'} ${isCollapsed ? 'justify-center' : ''}`}>
                                    <AlertTriangle className={`size-6 shrink-0 transition-all duration-300 ${isActive('/dashboard/v2/daily-issue') ? 'text-foreground' : 'text-secondary group-hover:text-foreground'}`} />
                                    {!isCollapsed && (
                                        <span className={`font-medium transition-all duration-300 ${isActive('/dashboard/v2/daily-issue') ? 'font-semibold text-foreground' : 'text-secondary group-hover:text-foreground'}`}>
                                            Issue Harian
                                        </span>
                                    )}
                                </div>
                            </Link>


                        </div>
                    </div>

                    {/* Finance */}
                    <div className="flex flex-col gap-4">
                        {!isCollapsed && <h3 className="font-medium text-sm text-secondary px-2">Finance</h3>}
                        <div className="flex flex-col gap-1">
                            <Link href="/dashboard/v2/finance/kelola-transaksi" className="group cursor-pointer">
                                <div className={`flex items-center rounded-xl p-3 gap-3 transition-all duration-300 ${pathname?.startsWith('/dashboard/v2/finance/kelola-transaksi') ? 'bg-muted' : 'bg-white hover:bg-muted'} ${isCollapsed ? 'justify-center' : ''}`}>
                                    <Wallet className={`size-6 shrink-0 transition-all duration-300 ${pathname?.startsWith('/dashboard/v2/finance/kelola-transaksi') ? 'text-foreground' : 'text-secondary group-hover:text-foreground'}`} />
                                    {!isCollapsed && (
                                        <span className={`font-medium transition-all duration-300 ${pathname?.startsWith('/dashboard/v2/finance/kelola-transaksi') ? 'font-semibold text-foreground' : 'text-secondary group-hover:text-foreground'}`}>
                                            Kelola Transaksi
                                        </span>
                                    )}
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* ALC */}
                    <div className="flex flex-col gap-4">
                        {!isCollapsed && <h3 className="font-medium text-sm text-secondary px-2">ALC</h3>}
                        <div className="flex flex-col gap-1">
                            <Link href="/dashboard/v2/alc/managemen-ctc" className="group cursor-pointer">
                                <div className={`flex items-center rounded-xl p-3 gap-3 transition-all duration-300 ${pathname?.startsWith('/dashboard/v2/alc/managemen-ctc') ? 'bg-muted' : 'bg-white hover:bg-muted'} ${isCollapsed ? 'justify-center' : ''}`}>
                                    <Briefcase className={`size-6 shrink-0 transition-all duration-300 ${pathname?.startsWith('/dashboard/v2/alc/managemen-ctc') ? 'text-foreground' : 'text-secondary group-hover:text-foreground'}`} />
                                    {!isCollapsed && (
                                        <span className={`font-medium transition-all duration-300 ${pathname?.startsWith('/dashboard/v2/alc/managemen-ctc') ? 'font-semibold text-foreground' : 'text-secondary group-hover:text-foreground'}`}>
                                            Managemen CTC
                                        </span>
                                    )}
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Sales */}
                    <div className="flex flex-col gap-4">
                        {!isCollapsed && <h3 className="font-medium text-sm text-secondary px-2">Sales</h3>}
                        <div className="flex flex-col gap-1">
                            <Link href="/dashboard/v2/correction-request" className="group cursor-pointer">
                                <div className={`flex items-center rounded-xl p-3 gap-3 transition-all duration-300 ${isActive('/dashboard/v2/correction-request') ? 'bg-muted' : 'bg-white hover:bg-muted'} ${isCollapsed ? 'justify-center' : ''}`}>
                                    <CheckCircle className={`size-6 shrink-0 transition-all duration-300 ${isActive('/dashboard/v2/correction-request') ? 'text-foreground' : 'text-secondary group-hover:text-foreground'}`} />
                                    {!isCollapsed && (
                                        <span className={`font-medium transition-all duration-300 ${isActive('/dashboard/v2/correction-request') ? 'font-semibold text-foreground' : 'text-secondary group-hover:text-foreground'}`}>
                                            Req Koreksi
                                        </span>
                                    )}
                                </div>
                            </Link>

                            <Link href="/dashboard/v2/sales/tracking-invoice" className="group cursor-pointer">
                                <div className={`flex items-center rounded-xl p-3 gap-3 transition-all duration-300 ${pathname?.startsWith('/dashboard/v2/sales/tracking-invoice') ? 'bg-muted' : 'bg-white hover:bg-muted'} ${isCollapsed ? 'justify-center' : ''}`}>
                                    <ReceiptText className={`size-6 shrink-0 transition-all duration-300 ${pathname?.startsWith('/dashboard/v2/sales/tracking-invoice') ? 'text-foreground' : 'text-secondary group-hover:text-foreground'}`} />
                                    {!isCollapsed && (
                                        <span className={`font-medium transition-all duration-300 ${pathname?.startsWith('/dashboard/v2/sales/tracking-invoice') ? 'font-semibold text-foreground' : 'text-secondary group-hover:text-foreground'}`}>
                                            Tracking Invoice
                                        </span>
                                    )}
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* HC */}
                    <div className="flex flex-col gap-4">
                        {!isCollapsed && <h3 className="font-medium text-sm text-secondary px-2">HC</h3>}
                        <div className="flex flex-col gap-1">
                            <Link href="/dashboard/v2/hc/kelola-calon-karyawan" className="group cursor-pointer">
                                <div
                                    className={`flex items-center rounded-xl p-3 gap-3 transition-all duration-300 ${
                                        pathname?.startsWith('/dashboard/v2/hc/kelola-calon-karyawan')
                                            ? 'bg-muted'
                                            : 'bg-white hover:bg-muted'
                                    } ${isCollapsed ? 'justify-center' : ''}`}
                                >
                                    <Users
                                        className={`size-6 shrink-0 transition-all duration-300 ${
                                            pathname?.startsWith('/dashboard/v2/hc/kelola-calon-karyawan')
                                                ? 'text-foreground'
                                                : 'text-secondary group-hover:text-foreground'
                                        }`}
                                    />
                                    {!isCollapsed && (
                                        <span
                                            className={`font-medium transition-all duration-300 ${
                                                pathname?.startsWith('/dashboard/v2/hc/kelola-calon-karyawan')
                                                    ? 'font-semibold text-foreground'
                                                    : 'text-secondary group-hover:text-foreground'
                                            }`}
                                        >
                                            Kelola Calon Karyawan
                                        </span>
                                    )}
                                </div>
                            </Link>

                            <Link href="/dashboard/v2/hc/kelola-kasbon-karyawan" className="group cursor-pointer">
                                <div
                                    className={`flex items-center rounded-xl p-3 gap-3 transition-all duration-300 ${
                                        pathname?.startsWith('/dashboard/v2/hc/kelola-kasbon-karyawan')
                                            ? 'bg-muted'
                                            : 'bg-white hover:bg-muted'
                                    } ${isCollapsed ? 'justify-center' : ''}`}
                                >
                                    <DollarSign
                                        className={`size-6 shrink-0 transition-all duration-300 ${
                                            pathname?.startsWith('/dashboard/v2/hc/kelola-kasbon-karyawan')
                                                ? 'text-foreground'
                                                : 'text-secondary group-hover:text-foreground'
                                        }`}
                                    />
                                    {!isCollapsed && (
                                        <span
                                            className={`font-medium transition-all duration-300 ${
                                                pathname?.startsWith('/dashboard/v2/hc/kelola-kasbon-karyawan')
                                                    ? 'font-semibold text-foreground'
                                                    : 'text-secondary group-hover:text-foreground'
                                            }`}
                                        >
                                            Kelola Kasbon Karyawan
                                        </span>
                                    )}
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* IT */}
                    <div className="flex flex-col gap-4">
                        {!isCollapsed && <h3 className="font-medium text-sm text-secondary px-2">IT</h3>}
                        <div className="flex flex-col gap-1">
                            <Link href="/dashboard/v2/it/kelola-user" className="group cursor-pointer">
                                <div
                                    className={`flex items-center rounded-xl p-3 gap-3 transition-all duration-300 ${
                                        pathname?.startsWith('/dashboard/v2/it/kelola-user')
                                            ? 'bg-muted'
                                            : 'bg-white hover:bg-muted'
                                    } ${isCollapsed ? 'justify-center' : ''}`}
                                >
                                    <UserCog
                                        className={`size-6 shrink-0 transition-all duration-300 ${
                                            pathname?.startsWith('/dashboard/v2/it/kelola-user')
                                                ? 'text-foreground'
                                                : 'text-secondary group-hover:text-foreground'
                                        }`}
                                    />
                                    {!isCollapsed && (
                                        <span
                                            className={`font-medium transition-all duration-300 ${
                                                pathname?.startsWith('/dashboard/v2/it/kelola-user')
                                                    ? 'font-semibold text-foreground'
                                                    : 'text-secondary group-hover:text-foreground'
                                            }`}
                                        >
                                            Kelola User
                                        </span>
                                    )}
                                </div>
                            </Link>

                            <Link href="/dashboard/v2/it/log-error" className="group cursor-pointer">
                                <div
                                    className={`flex items-center rounded-xl p-3 gap-3 transition-all duration-300 ${
                                        pathname?.startsWith('/dashboard/v2/it/log-error')
                                            ? 'bg-muted'
                                            : 'bg-white hover:bg-muted'
                                    } ${isCollapsed ? 'justify-center' : ''}`}
                                >
                                    <ScrollText
                                        className={`size-6 shrink-0 transition-all duration-300 ${
                                            pathname?.startsWith('/dashboard/v2/it/log-error')
                                                ? 'text-foreground'
                                                : 'text-secondary group-hover:text-foreground'
                                        }`}
                                    />
                                    {!isCollapsed && (
                                        <span
                                            className={`font-medium transition-all duration-300 ${
                                                pathname?.startsWith('/dashboard/v2/it/log-error')
                                                    ? 'font-semibold text-foreground'
                                                    : 'text-secondary group-hover:text-foreground'
                                            }`}
                                        >
                                            Log Error
                                        </span>
                                    )}
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Reports */}
                    <div className="flex flex-col gap-4">
                        {!isCollapsed && <h3 className="font-medium text-sm text-secondary px-2">Reports</h3>}
                        <div className="flex flex-col gap-1">
                            <Link href="/dashboard/reporting" className="group cursor-pointer">
                                <div className={`flex items-center rounded-xl p-3 gap-3 transition-all duration-300 ${isActive('/dashboard/reporting') ? 'bg-muted' : 'bg-white hover:bg-muted'} ${isCollapsed ? 'justify-center' : ''}`}>
                                    <BarChart3 className={`size-6 shrink-0 transition-all duration-300 ${isActive('/dashboard/reporting') ? 'text-foreground' : 'text-secondary group-hover:text-foreground'}`} />
                                    {!isCollapsed && (
                                        <span className={`font-medium transition-all duration-300 ${isActive('/dashboard/reporting') ? 'font-semibold text-foreground' : 'text-secondary group-hover:text-foreground'}`}>
                                            Analytics
                                        </span>
                                    )}
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>

            </aside>
        </>
    );
}
