
"use client";

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils";

interface MonthPickerProps {
    date?: Date;
    onChange: (date: Date) => void;
}

export function MonthPicker({ date, onChange }: MonthPickerProps) {
    const [displayDate, setDisplayDate] = React.useState(date ?? new Date());

    const handleMonthClick = (month: number) => {
        const newDate = new Date(displayDate.getFullYear(), month, 1);
        onChange(newDate);
    };

    const handlePrevYear = () => {
        setDisplayDate(new Date(displayDate.getFullYear() - 1, displayDate.getMonth(), 1));
    };

    const handleNextYear = () => {
        setDisplayDate(new Date(displayDate.getFullYear() + 1, displayDate.getMonth(), 1));
    };

    const selectedMonth = date?.getFullYear() === displayDate.getFullYear() ? date.getMonth() : undefined;

    return (
        <div className="p-3">
            <div className="flex justify-center pt-1 relative items-center">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 absolute left-1"
                    onClick={handlePrevYear}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium">
                    {displayDate.getFullYear()}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 absolute right-1"
                    onClick={handleNextYear}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
                {Array.from({ length: 12 }).map((_, i) => (
                    <Button
                        key={i}
                        variant={selectedMonth === i ? "default" : "ghost"}
                        onClick={() => handleMonthClick(i)}
                        className={cn("w-full text-xs capitalize", selectedMonth === i && "text-primary-foreground")}
                    >
                        {format(new Date(displayDate.getFullYear(), i, 1), 'LLL', { locale: fr })}
                    </Button>
                ))}
            </div>
        </div>
    )
}
