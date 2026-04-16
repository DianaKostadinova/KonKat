import { Component, Input, signal, computed } from '@angular/core';
import { Hackathon } from './hackathons.model';

@Component({
  selector: 'app-hackathon-calendar',
  standalone: true,
  imports: [],
  templateUrl: './hackathon-calendar.html',
  styleUrl: './hackathon-calendar.css',
})
export class HackathonCalendar {
  @Input() hackathons: Hackathon[] = [];

  today = new Date();
  currentMonth = signal(new Date().getMonth());
  currentYear = signal(new Date().getFullYear());

  monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  selectedDay = signal<number | null>(null);

  // All days in current month view including padding
  calendarDays = computed(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Adjust so week starts on Monday
    const startPad = firstDay === 0 ? 6 : firstDay - 1;

    const days: { day: number; currentMonth: boolean; date: Date }[] = [];

    // Previous month padding
    for (let i = startPad - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        currentMonth: false,
        date: new Date(year, month - 1, daysInPrevMonth - i),
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        currentMonth: true,
        date: new Date(year, month, i),
      });
    }

    // Next month padding to fill 6 rows
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        currentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }

    return days;
  });

  prevMonth() {
    if (this.currentMonth() === 0) {
      this.currentMonth.set(11);
      this.currentYear.update(y => y - 1);
    } else {
      this.currentMonth.update(m => m - 1);
    }
  }

  nextMonth() {
    if (this.currentMonth() === 11) {
      this.currentMonth.set(0);
      this.currentYear.update(y => y + 1);
    } else {
      this.currentMonth.update(m => m + 1);
    }
  }

  // Get hackathons that overlap with a specific date
  getEventsForDate(date: Date): Hackathon[] {
    return this.hackathons.filter(h => {
      const start = new Date(h.startDate);
      const end = new Date(h.endDate);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      const d = new Date(date);
      d.setHours(12,0,0,0);
      return d >= start && d <= end;
    });
  }

  isToday(date: Date): boolean {
    return date.toDateString() === this.today.toDateString();
  }

  // Events for selected day
  selectedDayEvents = computed(() => {
    if (!this.selectedDay()) return [];
    const date = new Date(this.currentYear(), this.currentMonth(), this.selectedDay()!);
    return this.getEventsForDate(date);
  });

  selectDay(day: { day: number; currentMonth: boolean }) {
    if (!day.currentMonth) return;
    this.selectedDay.set(day.day);
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
