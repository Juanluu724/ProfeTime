import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface CalendarEvent {
  date: string; // yyyy-mm-dd
  type: string; // examen | tarea | reunion
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  showCreateEvent = false;

  menuCounts = {
    examenes: 0,
    tareas: 0,
    reuniones: 0
  };

  notifications: any[] = [];
  calendarEvents: CalendarEvent[] = [];

  currentDate: Date = new Date();
  monthYearDisplay = '';

  weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  daysInMonth: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.updateMonthDisplay();
    this.loadDashboard();
    this.loadEvents();
  }

  // =====================
  // DASHBOARD
  // =====================
  loadDashboard() {
    this.http.get<any>('http://localhost:3000/api/dashboard')
      .subscribe(data => {
        this.menuCounts = data.menuCounts;
        this.notifications = data.notifications;
      });
  }

  // =====================
  // EVENTOS
  // =====================
  loadEvents() {
    this.http.get<CalendarEvent[]>('http://localhost:3000/api/events')
      .subscribe(events => {
        this.calendarEvents = events;
        this.generateCalendar();
      });
  }

  onEventSaved() {
    this.showCreateEvent = false;
    this.loadDashboard();
    this.loadEvents(); // 🔥 actualización en tiempo real
  }

  openCreateEvent() {
    this.showCreateEvent = true;
  }

  closeCreateEvent() {
    this.showCreateEvent = false;
  }

  // =====================
  // CALENDARIO
  // =====================
  updateMonthDisplay() {
    this.monthYearDisplay = this.currentDate.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric'
    });
  }

  changeMonth(offset: number) {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + offset,
      1
    );
    this.updateMonthDisplay();
    this.generateCalendar();
  }

  goToToday() {
    this.currentDate = new Date();
    this.updateMonthDisplay();
    this.generateCalendar();
  }

  generateCalendar() {
    this.daysInMonth = [];

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7;

    // 🔹 Días del mes anterior
    for (let i = startDay - 1; i >= 0; i--) {
      this.daysInMonth.push({
        day: new Date(year, month, -i).getDate(),
        isCurrentMonth: false,
        type: null
      });
    }

    // 🔹 Días del mes actual
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const event = this.calendarEvents.find(e => e.date.startsWith(dateStr));

      this.daysInMonth.push({
        day: d,
        isCurrentMonth: true,
        type: event ? event.type : null
      });
    }
  }
}
