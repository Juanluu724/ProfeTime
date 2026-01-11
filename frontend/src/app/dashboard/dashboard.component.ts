import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../auth/services/dashboard.service';
import { CalendarEvent } from '../models/event.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentDate = new Date();
  monthYearDisplay = '';
  weekDays = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
  activeSection: 'calendar' | 'examenes' | 'tareas' | 'reuniones' | 'compartidos' = 'calendar';

  daysInMonth: any[] = [];
  events: CalendarEvent[] = [];
  notifications: any[] = [];
  selectedDate: string | null = null;

  showCreateEvent = false;

  menuCounts = {
    examenes: 0,
    tareas: 0,
    reuniones: 0,
    otros: 0
  };

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.updateMonthTitle();
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.dashboardService.getDashboard().subscribe((data: any) => {
      this.menuCounts = data.menuCounts || this.menuCounts;
      this.notifications = data.notifications || [];
      this.events = (data.calendarEvents || []).map((event: any) => ({
        ...event,
        title: event.title ?? event.titulo ?? null,
        description: event.description ?? event.descripcion ?? null,
        startTime: event.startTime ?? event.hora_inicio ?? null,
        endTime: event.endTime ?? event.hora_fin ?? null,
        location: event.location ?? event.ubicacion ?? null
      }));
      this.generateCalendar();
    });
  }

  generateCalendar(): void {
    this.daysInMonth = [];

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const day = prevMonthDays - firstDay + 1 + i;
      this.daysInMonth.push({ day, isCurrentMonth: false, date: null });
    }

    const events = Array.isArray(this.events) ? this.events : [];
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${this.pad(month + 1)}-${this.pad(d)}`;
      const event = events.find(e => this.normalizeDate(e.date) === dateStr);

      this.daysInMonth.push({
        day: d,
        isCurrentMonth: true,
        type: event?.type || null,
        title: event?.title || null,
        description: event?.description || null,
        date: dateStr
      });
    }

    const totalCells = 42;
    const trailingDays = Math.max(totalCells - this.daysInMonth.length, 0);
    for (let i = 1; i <= trailingDays; i++) {
      this.daysInMonth.push({ day: i, isCurrentMonth: false, date: null });
    }
  }

  pad(n: number): string {
    return n < 10 ? '0' + n : n.toString();
  }

  changeMonth(value: number): void {
    this.currentDate.setMonth(this.currentDate.getMonth() + value);
    this.updateMonthTitle();
    this.generateCalendar();
  }

  goToToday(): void {
    this.currentDate = new Date();
    this.updateMonthTitle();
    this.generateCalendar();
  }

  updateMonthTitle(): void {
    this.monthYearDisplay = this.currentDate.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric'
    });
  }

  openCreateEvent(): void {
    this.showCreateEvent = true;
  }

  closeCreateEvent(): void {
    this.showCreateEvent = false;
  }

  onEventSaved(event?: CalendarEvent): void {
    this.showCreateEvent = false;
    if (event?.date) {
      this.events = [
        ...this.events,
        {
          date: this.normalizeDate(event.date),
          type: event.type || 'otro',
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location
        }
      ];
      this.incrementMenuCount(event.type || 'otro');
      this.generateCalendar();
    }
    this.loadDashboard();
  }

  setSection(section: 'calendar' | 'examenes' | 'tareas' | 'reuniones' | 'compartidos'): void {
    this.activeSection = section;
    this.selectedDate = null;
  }

  get filteredEvents(): CalendarEvent[] {
    if (this.activeSection === 'calendar' || this.activeSection === 'compartidos') {
      return [];
    }
    const typeMap: Record<string, CalendarEvent['type']> = {
      examenes: 'examen',
      tareas: 'tarea',
      reuniones: 'reunion'
    };
    const targetType = typeMap[this.activeSection];
    return this.events
      .filter(event => event.type === targetType)
      .filter(event => !this.selectedDate || this.normalizeDate(event.date) === this.selectedDate)
      .map(event => ({
        ...event,
        date: this.normalizeDate(event.date)
      }));
  }

  get sectionTitle(): string {
    switch (this.activeSection) {
      case 'examenes':
        return 'Examenes';
      case 'tareas':
        return 'Tareas';
      case 'reuniones':
        return 'Reuniones';
      case 'compartidos':
        return 'Compartidos';
      default:
        return 'Calendario';
    }
  }

  private incrementMenuCount(type: CalendarEvent['type']): void {
    if (type === 'examen') this.menuCounts.examenes += 1;
    if (type === 'tarea') this.menuCounts.tareas += 1;
    if (type === 'reunion') this.menuCounts.reuniones += 1;
    if (type === 'otro') this.menuCounts.otros += 1;
  }

  onDaySelect(day: any): void {
    if (!day?.isCurrentMonth || !day?.type || !day?.date) {
      return;
    }
    const typeToSection: Record<string, 'examenes' | 'tareas' | 'reuniones'> = {
      examen: 'examenes',
      tarea: 'tareas',
      reunion: 'reuniones'
    };
    const section = typeToSection[day.type];
    if (section) {
      this.activeSection = section;
      this.selectedDate = this.normalizeDate(day.date);
    }
  }

  formatDateLabel(dateStr?: string): string {
    if (!dateStr) return '';
    const normalized = this.normalizeDate(dateStr);
    const [year, month, day] = normalized.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
  }

  formatTimeRange(start?: string, end?: string): string {
    if (!start && !end) return '';
    if (start && end) return `${start} - ${end}`;
    return start || end || '';
  }

  typeLabel(type?: CalendarEvent['type']): string {
    if (type === 'examen') return 'Examen';
    if (type === 'tarea') return 'Tarea';
    if (type === 'reunion') return 'Reunion';
    return 'Otro';
  }

  private normalizeDate(value: string): string {
    if (!value) return value;
    if (value.includes('T')) {
      return value.slice(0, 10);
    }
    return value;
  }

  private getEventTypeByDate(dateStr: string): CalendarEvent['type'] | null {
    const target = this.normalizeDate(dateStr);
    const match = this.events.find(event => this.normalizeDate(event.date) === target);
    return match?.type || null;
  }
}
