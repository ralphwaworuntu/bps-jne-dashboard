"use client";

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface StatsCardProps {
    title: string;
    description?: string;
    count: string | number;
    subtext?: string;
    icon: LucideIcon;
    href: string;
    colorClass: string; // e.g., 'text-primary', 'bg-primary/10'
    trend?: string;
    trendUp?: boolean;
}

export default function StatsCard({
    title,
    description,
    count,
    subtext,
    icon: Icon,
    href,
    colorClass,
    trend,
    trendUp
}: StatsCardProps) {
    return (
        <Link href={href}>
            <motion.div
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-col rounded-2xl border border-border p-6 gap-3 bg-white hover:shadow-lg transition-all duration-300 cursor-pointer h-full justify-between"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-[6px]">
                        <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${colorClass.replace('text-', 'bg-').replace('400', '500')}/10`}>
                            <Icon className={`size-6 ${colorClass}`} />
                        </div>
                        <div>
                            <p className="font-medium text-secondary">{title}</p>
                        </div>
                    </div>
                    {trend && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${trendUp ? 'bg-success-light text-success' : 'bg-error-light text-error'}`}>
                            {trend}
                        </span>
                    )}
                </div>

                <div>
                    <p className="font-bold text-[32px] leading-10 text-foreground">{count}</p>
                    {subtext && <p className="text-xs text-secondary mt-1">{subtext}</p>}
                    {description && <p className="text-xs text-secondary mt-1">{description}</p>}
                </div>
            </motion.div>
        </Link>
    );
}
