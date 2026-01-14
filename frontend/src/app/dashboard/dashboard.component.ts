import { Component, OnDestroy, OnInit } from '@angular/core';
import { DashboardService } from '../auth/services/dashboard.service';
import { AuthService } from '../auth/services/auth.service';
import { Router } from '@angular/router';
import { CalendarEvent } from '../models/event.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  nombreUsuario: string = '';
  currentDate = new Date();
  monthYearDisplay = '';
  weekDays = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
  activeSection: 'calendar' | 'examenes' | 'tareas' | 'reuniones' | 'compartidos' = 'calendar';

  socketSubscription?: Subscription;
  deleteSubscription?: Subscription;

  daysInMonth: any[] = [];
  events: CalendarEvent[] = [];

  notifications: any[] = [];
  selectedDate: string | null = null;

  showCreateEvent = false;
  eventToEdit?: CalendarEvent;

  menuCounts = {
    examenes: 0,
    tareas: 0,
    reuniones: 0,
    otros: 0
  };

  constructor(
    private dashboardService: DashboardService,
    // 2. INYECCIÓN AÑADIDA
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // 3. LÓGICA PARA OBTENER EL NOMBRE
    this.authService.user$.subscribe(user => {
      if (user) {
        // Intenta coger 'nombre', si no 'email', si no pone 'Profe'
        this.nombreUsuario = user.nom || 'Profe';
      }
    });

    this.updateMonthTitle();
    this.loadDashboard();

    // Suscripción a WebSockets
    this.socketSubscription = this.dashboardService.onNewEvent$.subscribe((newEvent: any) => {
      this.events.push({
        ...newEvent,
        date: newEvent.date
      });

      if (newEvent.type) {
        this.incrementMenuCount(newEvent.type);
      }
      this.generateCalendar();

      this.deleteSubscription = this.dashboardService.onDeleteEvent$.subscribe((idEliminado) => {
        this.events = this.events.filter(e => e.codigo_evento !== idEliminado);
        this.generateCalendar();
        this.loadDashboard();
      });
    });
  }

  ngOnDestroy(): void {
    if (this.deleteSubscription) {
      this.deleteSubscription.unsubscribe();
    }
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
  }

  loadDashboard(): void {
    this.dashboardService.getDashboard().subscribe((data: any) => {
      this.menuCounts = data.menuCounts || { examenes: 0, tareas: 0, reuniones: 0, otros: 0 };
      const rawEvents = data.calendarEvents || [];

      this.events = rawEvents.map((event: any) => ({
        ...event,
        date: event.date || event.fec_inicio,
        title: event.title || event.titulo,
        type: event.type || event.tipo || 'otro'
      }));

      this.generateCalendar();
    }, (error) => {
      console.error("⚠️ Error cargando el dashboard:", error);
    });
  }

  generateCalendar(): void {
    this.daysInMonth = [];

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const realToday = new Date();

    // Días previos
    for (let i = 0; i < firstDay; i++) {
      const day = prevMonthDays - firstDay + 1 + i;
      this.daysInMonth.push({ day, isCurrentMonth: false, date: null, isToday: false, events: [] });
    }

    const events = Array.isArray(this.events) ? this.events : [];

    // Días del mes actual
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${this.pad(month + 1)}-${this.pad(d)}`;
      const dailyEvents = events.filter(e => this.normalizeDate(e.date) === dateStr);

      const isToday =
        d === realToday.getDate() &&
        month === realToday.getMonth() &&
        year === realToday.getFullYear();

      this.daysInMonth.push({
        day: d,
        isCurrentMonth: true,
        events: dailyEvents,
        date: dateStr,
        isToday: isToday
      });
    }

    // Días posteriores
    const totalCells = 42;
    const trailingDays = Math.max(totalCells - this.daysInMonth.length, 0);
    for (let i = 1; i <= trailingDays; i++) {
      this.daysInMonth.push({ day: i, isCurrentMonth: false, date: null, isToday: false, events: [] });
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

  closeCreateEvent(): void {
    this.showCreateEvent = false;
    this.eventToEdit = undefined;
  }

  onEventSaved(event?: CalendarEvent): void {
    this.showCreateEvent = false;
    if (event?.date) {
      const exists = this.events.find(e => e.codigo_evento === event.codigo_evento);
      if (exists) {
        this.events = this.events.map(e => e.codigo_evento === event.codigo_evento ? event : e);
      } else {
        this.events = [...this.events, event];
        this.incrementMenuCount(event.type || 'otro');
      }
      this.generateCalendar();
    }
    this.loadDashboard();
  }

  editarEvento(event: CalendarEvent) {
    console.log('Editando evento:', event);
    this.eventToEdit = event;
    this.showCreateEvent = true;
  }

  openCreateEvent() {
    this.eventToEdit = undefined;
    this.showCreateEvent = true;
  }

  eliminarEvento(event: CalendarEvent) {
    console.log('Intentando borrar evento:', event);
    if (!event.codigo_evento) {
      alert("Error: El evento no tiene un código válido.");
      return;
    }

    if (confirm(`¿Seguro que quieres eliminar "${event.title}"?`)) {
      this.dashboardService.deleteEvent(event.codigo_evento).subscribe({
        next: () => {
          this.events = this.events.filter(e => e.codigo_evento !== event.codigo_evento);
          this.loadDashboard();
        },
        error: (err) => {
          console.error(err);
          alert('Error al eliminar en el servidor');
        }
      });
    }
  }

  setSection(section: 'calendar' | 'examenes' | 'tareas' | 'reuniones' | 'compartidos'): void {
    this.activeSection = section;
    this.selectedDate = null;
  }

  get filteredEvents(): CalendarEvent[] {
    if (this.activeSection === 'calendar') {
      return [];
    }
    if (this.activeSection === 'compartidos') {
      return this.events.filter(event => event.ownership === 'compartido');
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
      case 'examenes': return 'Examenes';
      case 'tareas': return 'Tareas';
      case 'reuniones': return 'Reuniones';
      case 'compartidos': return 'Compartidos';
      default: return 'Calendario';
    }
  }

  private incrementMenuCount(type: CalendarEvent['type']): void {
    if (type === 'examen') this.menuCounts.examenes += 1;
    if (type === 'tarea') this.menuCounts.tareas += 1;
    if (type === 'reunion') this.menuCounts.reuniones += 1;
    if (type === 'otro') this.menuCounts.otros += 1;
  }

  onDaySelect(day: any): void {
    if (!day?.isCurrentMonth || !day?.date) {
      return;
    }
    this.selectedDate = this.normalizeDate(day.date);

    // Si hay eventos en ese día, cambiamos a la sección del primer evento
    if (day.events && day.events.length > 0) {
      const firstType = day.events[0].type;
      const typeToSection: Record<string, 'examenes' | 'tareas' | 'reuniones'> = {
        examen: 'examenes',
        tarea: 'tareas',
        reunion: 'reuniones'
      };
      if (typeToSection[firstType]) {
        this.activeSection = typeToSection[firstType];
      }
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
    if (value.includes('T')) return value.slice(0, 10);
    return value;
  }
  
  logout(): void {
    // 1. Llamamos al servicio para borrar token (si tienes el método creado)
    this.authService.logout(); 
    
    // 2. Redirigimos al login
    this.router.navigate(['/login']);
  }
}