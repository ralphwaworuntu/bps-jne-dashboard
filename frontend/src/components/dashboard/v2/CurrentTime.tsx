"use client";

import { useState, useEffect } from 'react';
import { Clock, Sun, Moon } from 'lucide-react';

export default function CurrentTime() {
    const [date, setDate] = useState<string>("");
    const [time, setTime] = useState<string>("");
    const [isDay, setIsDay] = useState<boolean>(true);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();

            // Get Hour in WITA
            const witaHour = parseInt(new Intl.DateTimeFormat('id-ID', {
                hour: 'numeric',
                timeZone: 'Asia/Makassar',
                hour12: false
            }).format(now));

            // Day is defined as 06:00 to 18:00
            setIsDay(witaHour >= 6 && witaHour < 18);

            const timeFormatter = new Intl.DateTimeFormat('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'Asia/Makassar',
                hour12: false
            });

            const dateFormatter = new Intl.DateTimeFormat('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Asia/Makassar'
            });

            setDate(dateFormatter.format(now));
            setTime(timeFormatter.format(now).replace(/\./g, ' : '));
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, []);

    if (!time) return null;

    return (
        <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-xl border border-border/50">
            <div className={`p-2 rounded-lg shadow-sm ${isDay ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {isDay ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </div>
            <div className="flex flex-col">
                <span className="font-bold text-lg text-foreground tabular-nums leading-none tracking-wider">
                    {time} <span className="text-xs font-normal text-secondary ml-1">WITA</span>
                </span>
                <span className="text-xs font-medium text-secondary mt-0.5">
                    {date}
                </span>
            </div>
        </div>
    );
}
