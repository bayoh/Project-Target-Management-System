import React, { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, getWeek, isBefore, isAfter } from 'date-fns';

type SelectionType = 'single' | 'range' | 'week';

interface CalendarProps {
  selectionType?: SelectionType;
  onSelect?: (selection: Date | { start: Date; end: Date } | { weekNumber: number; start: Date; end: Date }) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Calendar: React.FC<CalendarProps> = ({ selectionType = 'single', onSelect, isOpen = false, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const days = eachDayOfInterval({ start: startDate, end: monthEnd });

  const weeks = Array.from({ length: 6 }, (_, weekIndex) => {
    return Array.from({ length: 7 }, (_, dayIndex) => {
      const day = addDays(startDate, weekIndex * 7 + dayIndex);
      return day;
    });
  });

  const handleDateClick = (date: Date) => {
    switch (selectionType) {
      case 'single':
        setSelectedDate(date);
        onSelect?.(date);
        break;
      case 'range':
        if (!dateRange.start || (dateRange.start && dateRange.end)) {
          setDateRange({ start: date, end: null });
        } else {
          const newRange = {
            start: dateRange.start,
            end: date,
          };
          if (isBefore(newRange.end, newRange.start)) {
            newRange.start = date;
            newRange.end = dateRange.start;
          }
          setDateRange(newRange);
        }
        break;
      case 'week':
        const weekNumber = getWeek(date);
        const weekStart = startOfWeek(date);
        const weekEnd = addDays(weekStart, 6);
        setSelectedWeek(weekNumber);
        onSelect?.({ weekNumber, start: weekStart, end: weekEnd });
        break;
    }
  };

  const isSelected = (date: Date) => {
    if (selectionType === 'single') {
      return selectedDate && isSameDay(date, selectedDate);
    }
    if (selectionType === 'range') {
      if (dateRange.start && dateRange.end) {
        return isWithinInterval(date, { start: dateRange.start, end: dateRange.end });
      }
      return dateRange.start && isSameDay(date, dateRange.start);
    }
    if (selectionType === 'week' && selectedWeek) {
      return getWeek(date) === selectedWeek;
    }
    return false;
  };

  const isInRange = (date: Date) => {
    if (selectionType !== 'range' || !dateRange.start || !dateRange.end) return false;
    return isWithinInterval(date, { start: dateRange.start, end: dateRange.end });
  };

  const isRangeStart = (date: Date) => {
    return dateRange.start && isSameDay(date, dateRange.start);
  };

  const isRangeEnd = (date: Date) => {
    return dateRange.end && isSameDay(date, dateRange.end);
  };

  const handleAcceptRange = () => {
    if (dateRange.start && dateRange.end) {
      onSelect?.({ start: dateRange.start!, end: dateRange.end! });
      onClose?.();
    }
  };

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div ref={modalRef} className="p-4 bg-white rounded-lg shadow-md relative">
        <button
          onClick={onClose}
          className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
          aria-label="Close calendar"
        >
          ×
        </button>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentMonth(prev => addDays(prev, -30))}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentMonth(prev => addDays(prev, 30))}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}

        {weeks.map((week, weekIndex) => (
          <React.Fragment key={weekIndex}>
            {week.map((day, dayIndex) => {
              const isCurrentMonth = format(day, 'M') === format(currentMonth, 'M');
              return (
                <button
                  key={dayIndex}
                  onClick={() => handleDateClick(day)}
                  className={`
                    p-2 text-sm rounded-full w-10 h-10 flex items-center justify-center
                    ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                    ${isRangeStart(day) ? 'bg-primary text-white rounded-r-none' : ''}
                    ${isRangeEnd(day) ? 'bg-primary text-white rounded-l-none' : ''}
                    ${isInRange(day) && !isRangeStart(day) && !isRangeEnd(day) ? 'bg-primary/20' : ''}
                    ${!isInRange(day) && !isRangeStart(day) && !isRangeEnd(day) ? 'hover:bg-gray-100' : ''}
                    ${isSelected(day) && selectionType !== 'range' ? 'bg-primary text-white' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {selectionType === 'week' && (
        <div className="mt-4 text-sm text-gray-600">
          {selectedWeek ? `Selected: Week ${selectedWeek}` : 'Select a week'}
        </div>
      )}

      {selectionType === 'range' && dateRange.start && dateRange.end && (
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {`${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`}
          </div>
          <button
            onClick={handleAcceptRange}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Accept
          </button>
        </div>
      )}
    </div>
    </div>
  );
};