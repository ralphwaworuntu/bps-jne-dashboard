import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isValid, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import 'react-day-picker/dist/style.css';

interface DateFilterProps {
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    availableDates: string[]; // List of YYYY-MM-DD
}

export default function DateFilter({ value, onChange, availableDates }: DateFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Convert string dates to Date objects for DayPicker
    const selectedDate = value ? parseISO(value) : undefined;
    const availableDatesObj = availableDates.map(d => parseISO(d)).filter(isValid);

    // Custom modifiers for highlighting
    const modifiers = {
        available: availableDatesObj
    };

    const modifiersStyles = {
        available: {
            fontWeight: 'bold',
            color: 'var(--color-primary, #2563eb)',
            textDecoration: 'underline',
            textDecorationColor: 'var(--color-primary, #2563eb)',
            textDecorationThickness: '2px'
        }
    };

    const handleDayClick = (day: Date | undefined) => {
        if (day) {
            onChange(format(day, 'yyyy-MM-dd'));
            setIsOpen(false);
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setIsOpen(false);
    };

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg text-sm min-w-[200px] transition-all duration-200 
                    ${isOpen ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-gray-300'}`}
            >
                <CalendarIcon className="w-4 h-4 text-secondary" />
                <span className={`flex-1 text-left ${value ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {value ? format(parseISO(value), 'PPP') : 'Filter by Date'}
                </span>
                {value && (
                    <div
                        onClick={handleClear}
                        className="p-0.5 hover:bg-gray-100 rounded-full text-secondary hover:text-foreground transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </div>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-border rounded-xl shadow-xl p-2 animate-in fade-in zoom-in-95 duration-200">
                    <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDayClick}
                        modifiers={modifiers}
                        modifiersStyles={modifiersStyles}
                        styles={{
                            caption: { color: '#1f2937' },
                            head_cell: { color: '#6b7280' },
                            day: { color: '#374151' },
                        }}
                    />
                    <div className="pt-2 px-4 pb-2 border-t border-border mt-2">
                        <div className="flex items-center gap-2 text-xs text-secondary">
                            <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                            <span>Has Data</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
