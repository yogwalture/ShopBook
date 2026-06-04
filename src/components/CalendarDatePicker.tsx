import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';

interface CalendarDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CalendarDatePicker({
  value,
  onChange,
  placeholder = "Select Date",
  className = "",
  disabled = false,
  clearable = true
}: CalendarDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value to find viewing month/year. Default to today if empty.
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const parsedDate = value ? new Date(value) : null;
  const initialYear = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.getFullYear() : today.getFullYear();
  const initialMonth = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.getMonth() : today.getMonth();

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  // Sync display with value changes when popup opens
  useEffect(() => {
    if (isOpen && value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [isOpen, value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (dayNum: number, isCurrentMonth: boolean, offset: 'prev' | 'curr' | 'next') => {
    let targetYear = viewYear;
    let targetMonth = viewMonth;

    if (offset === 'prev') {
      if (viewMonth === 0) {
        targetMonth = 11;
        targetYear -= 1;
      } else {
        targetMonth -= 1;
      }
    } else if (offset === 'next') {
      if (viewMonth === 11) {
        targetMonth = 0;
        targetYear += 1;
      } else {
        targetMonth += 1;
      }
    }

    // Format target date as YYYY-MM-DD local style
    const yyyy = String(targetYear);
    const mm = String(targetMonth + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const selectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(todayStr);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  // Grid math
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Create calendar cells
  const days: { dayNum: number; offset: 'prev' | 'curr' | 'next'; isSelected: boolean; isToday: boolean }[] = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dNum = totalDaysInPrevMonth - i;
    const dateStr = `${viewMonth === 0 ? viewYear - 1 : viewYear}-${String(viewMonth === 0 ? 12 : viewMonth).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
    days.push({
      dayNum: dNum,
      offset: 'prev',
      isSelected: value === dateStr,
      isToday: todayStr === dateStr
    });
  }

  // Current month days
  for (let i = 1; i <= totalDaysInMonth; i++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({
      dayNum: i,
      offset: 'curr',
      isSelected: value === dateStr,
      isToday: todayStr === dateStr
    });
  }

  // Next month leading days to complete general grid (usually 42 cells total)
  const totalCells = days.length;
  const remainingCells = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
  for (let i = 1; i <= remainingCells; i++) {
    const dateStr = `${viewMonth === 11 ? viewYear + 1 : viewYear}-${String(viewMonth === 11 ? 1 : viewMonth + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({
      dayNum: i,
      offset: 'next',
      isSelected: value === dateStr,
      isToday: todayStr === dateStr
    });
  }

  // Format current button text
  const formatButtonText = () => {
    if (!value) return placeholder;
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 text-sm bg-surface-container-high border border-outline-variant/60 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all outline-none focus:border-primary focus:ring-1 focus:ring-primary ${
          disabled ? 'opacity-50 cursor-not-allowed bg-surface-container-high' : 'hover:border-outline-variant cursor-pointer text-on-surface'
        }`}
      >
        <span className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
          <span className="font-semibold text-xs whitespace-nowrap">{formatButtonText()}</span>
        </span>
        <div className="flex items-center gap-1">
          {clearable && value && !disabled && (
            <span
              onClick={handleClear}
              className="p-1 hover:bg-surface-container-highest rounded text-on-surface-variant/75 hover:text-on-surface transition-colors cursor-pointer"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-on-surface-variant/80 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div 
          className="absolute z-50 mt-1.5 left-0 md:right-auto bg-surface-container-lowest border border-outline-variant/80 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] p-4 w-[285px] text-center shrink-0 border-collapse select-none"
          style={{ transformOrigin: 'top left' }}
        >
          {/* Calendar Header with navigation */}
          <div className="flex items-center justify-between mb-3.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-surface-container-high rounded-lg text-on-surface hover:text-primary transition-colors cursor-pointer flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-on-background tracking-tight">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-surface-container-high rounded-lg text-on-surface hover:text-primary transition-colors cursor-pointer flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday indicator labels */}
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {WEEKDAYS.map((day, idx) => (
              <span 
                key={day} 
                className={`text-[10px] font-bold uppercase tracking-wider text-center py-1 ${
                  idx === 0 || idx === 6 ? 'text-primary/75' : 'text-on-surface-variant/60'
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((cell, idx) => {
              const isCurrent = cell.offset === 'curr';
              let buttonStyle = "h-8 w-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-colors cursor-pointer hover:bg-primary/10 ";
              
              if (cell.isSelected) {
                buttonStyle += "bg-primary text-on-primary hover:bg-primary/95 font-bold shadow-sm";
              } else if (cell.isToday) {
                buttonStyle += "border border-primary text-primary font-bold bg-primary/5 hover:bg-primary/15";
              } else if (!isCurrent) {
                buttonStyle += "text-on-surface-variant/30 hover:text-on-surface-variant/60";
              } else {
                buttonStyle += "text-on-surface hover:text-primary";
              }

              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSelectDay(cell.dayNum, isCurrent, cell.offset)}
                  className={buttonStyle}
                >
                  {cell.dayNum}
                </button>
              );
            })}
          </div>

          {/* Today option shortcuts */}
          <div className="mt-3.5 pt-2.5 border-t border-outline-variant/30 flex justify-between gap-2">
            <button
              type="button"
              onClick={selectToday}
              className="text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors flex-1 cursor-pointer uppercase tracking-wider"
            >
              Select Today
            </button>
            {clearable && value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-bold text-on-surface-variant hover:bg-surface-container-high px-3 py-1.5 rounded-lg transition-colors flex-1 cursor-pointer uppercase tracking-wider"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
