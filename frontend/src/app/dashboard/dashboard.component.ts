import { Component, OnDestroy, OnInit } from '@angular/core';
import { DashboardService } from '../auth/services/dashboard.service';
import { AuthService } from '../auth/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CalendarEvent } from '../models/event.model';
import { Subscription, forkJoin } from 'rxjs';
import { ToastService } from '../ui/toast.service';

interface CalendarDayCell {
  day: number;
  isCurrentMonth: boolean;
  date: string | null;
  isToday: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  nombreUsuario: string = '';
  fotoUsuario: string = '';
  correoUsuario: string = '';
  currentDate = new Date();
  monthYearDisplay = '';
  weekDays = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
  activeSection: 'calendar' | 'examenes' | 'tareas' | 'reuniones' | 'otros' | 'compartidos' = 'calendar';

  socketSubscription?: Subscription;
  deleteSubscription?: Subscription;

  daysInMonth: CalendarDayCell[] = [];
  events: CalendarEvent[] = [];

  calendarTipoGrado: NonNullable<CalendarEvent['tipoGrado']> | '' = '';
  calendarGrado: string = '';
  calendarCurso: 1 | 2 | '' = '';

  readonly gradosCicloFormativo: string[] = [
    'Administración y Finanzas',
    'Comercio Internacional',
    'Gestión de Ventas y Espacios Comerciales',
    'Marketing y Publicidad',
    'Aplicaciones Multiplataforma',
    'Aplicaciones Web',
    'Animación 3D y Videojuegos',
    'Sonido',
    'Realización Audiovisual',
    'Educación Infantil (DUAL)',
    'Gestión de Alojamientos (DUAL)',
    'Dirección de Cocina',
    'Dirección de Servicios en Restauración',
    'TSAF Acondicionamiento Físico'
  ];

  readonly gradosMasterFp: string[] = [
    'Ciberseguridad en Entornos de las Tecnologías de la Información',
    'Desarrollo de Videojuegos y Realidad Virtual',
    'Inteligencia Artificial y Big Data'
  ];

  notifications: any[] = [];
  pendingDismissNotification: any | null = null;
  dismissedNotificationIds = new Set<string>();
  selectedDate: string | null = null;
  highlightEventId: string | null = null;

  showCreateEvent = false;
  eventToEdit?: CalendarEvent;
  pendingDelete: CalendarEvent | null = null;
  googleLinked = false;

  sidebarCollapsed = false;
  private readonly sidebarStorageKey = 'profetime_sidebar_collapsed';

  menuCounts = {
    examenes: 0,
    tareas: 0,
    reuniones: 0,
    otros: 0
  };

  constructor(
    private dashboardService: DashboardService,
    // 2. INYECCIÃ“N AÃ‘ADIDA
    private authService: AuthService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.sidebarCollapsed = localStorage.getItem(this.sidebarStorageKey) === '1';

    // 3. LÃ“GICA PARA OBTENER EL NOMBRE
    this.authService.user$.subscribe(user => {
      if (user) {
        // Intenta coger 'nombre', si no 'email', si no pone 'Profe'
        this.nombreUsuario = user.nom || 'Profe';
        this.fotoUsuario = user.foto_url || user.photoUrl || user.picture || '';
        this.correoUsuario = user.correo || user.email || '';
      }
    });

    this.updateMonthTitle();
    this.loadDashboard();
    this.refreshGoogleStatus();

    const linked = this.route.snapshot.queryParamMap.get('linked');
    if (linked === '1') {
      this.toast.success('Cuenta de Google vinculada.');
      this.router.navigate([], { queryParams: { linked: null }, queryParamsHandling: 'merge' });
      this.refreshGoogleStatus();
    }

    // SuscripciÃ³n a WebSockets
    this.socketSubscription = this.dashboardService.onNewEvent$.subscribe((incoming: any) => {
      const id = incoming?.codigo_evento;
      if (!id) return;

      const normalized: CalendarEvent = {
        ...incoming,
        codigo_evento: id,
        date: incoming.date || incoming.fec_inicio,
        title: incoming.title || incoming.titulo || '',
        description: incoming.description || incoming.descripcion || '',
        type: incoming.type || incoming.tipo || 'otro',
        tipoGrado: incoming.tipoGrado ?? incoming.tipo_grado ?? null,
        grado: incoming.grado ?? null,
        curso: incoming.curso ?? null,
        startTime: incoming.startTime || incoming.hora_inicio || null,
        endTime: incoming.endTime || incoming.hora_fin || null,
        location: incoming.location || incoming.ubicacion || null,
        meet: incoming.meet || incoming.meet_link || null,
        drive: incoming.drive || incoming.drive_link || null,
        driveFileId: incoming.driveFileId || incoming.drive_file_id || null,
        driveFileName: incoming.driveFileName || incoming.drive_file_name || null,
        driveMimeType: incoming.driveMimeType || incoming.drive_mime_type || null,
        maps: incoming.maps || incoming.maps_link || null,
        ownership: incoming.ownership || 'compartido',
        senderName: incoming.senderName || null
      };

      const existingIndex = this.events.findIndex((e) => e.codigo_evento === id);
      if (existingIndex >= 0) {
        this.events[existingIndex] = { ...this.events[existingIndex], ...normalized };
      } else {
        this.events.push(normalized);
      }

      this.generateCalendar();
      this.notifications = this.buildNotifications(this.events);
    });

    this.deleteSubscription = this.dashboardService.onDeleteEvent$.subscribe((idEliminado) => {
      this.events = this.events.filter(e => e.codigo_evento !== idEliminado);
      this.generateCalendar();
      this.notifications = this.buildNotifications(this.events);
      this.loadDashboard();
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

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem(this.sidebarStorageKey, this.sidebarCollapsed ? '1' : '0');
  }

  loadDashboard(): void {
    forkJoin({
      dashboard: this.dashboardService.getDashboard(),
      events: this.dashboardService.getEvents()
    }).subscribe(({ dashboard, events }) => {
      this.menuCounts = dashboard.menuCounts || { examenes: 0, tareas: 0, reuniones: 0, otros: 0 };
      const rawEvents = events || [];

      this.events = rawEvents.map((event: any) => ({
        ...event,
        date: event.date || event.fec_inicio,
        title: event.title || event.titulo || '',
        description: event.description || event.descripcion || '',
        type: event.type || event.tipo || 'otro',
        tipoGrado: event.tipoGrado ?? event.tipo_grado ?? null,
        grado: event.grado ?? null,
        curso: event.curso ?? null,
        startTime: event.startTime || event.hora_inicio || null,
        endTime: event.endTime || event.hora_fin || null,
        location: event.location || event.ubicacion || null,
        meet: event.meet || event.meet_link || null,
        drive: event.drive || event.drive_link || null,
        driveFileId: event.driveFileId || event.drive_file_id || null,
        driveFileName: event.driveFileName || event.drive_file_name || null,
        driveMimeType: event.driveMimeType || event.drive_mime_type || null,
        maps: event.maps || event.maps_link || null,
        ownership: event.ownership || 'propio',
        senderName: event.senderName || null
      }));

      this.notifications = this.buildNotifications(this.events);
      this.generateCalendar();
    }, (error) => {
      console.error("Error cargando el dashboard:", error);
    });
  }

  onCalendarTipoGradoChange(): void {
    if (!this.calendarTipoGrado) {
      this.calendarGrado = '';
      this.generateCalendar();
      return;
    }

    const options = this.getCalendarGradoOptions();
    if (options.length > 0 && this.calendarGrado && !options.includes(this.calendarGrado)) {
      this.calendarGrado = '';
    }
    this.generateCalendar();
  }

  onCalendarFiltersChange(): void {
    this.generateCalendar();
  }

  getCalendarGradoOptions(): string[] {
    if (this.calendarTipoGrado === 'ciclo_formativo') return this.gradosCicloFormativo;
    if (this.calendarTipoGrado === 'master_fp') return this.gradosMasterFp;
    return [];
  }

  private hasAnyCalendarFilter(): boolean {
    return !!(this.calendarTipoGrado || this.calendarGrado || this.calendarCurso);
  }

  private calendarEventMatchesFilters(event: CalendarEvent): boolean {
    if (this.calendarTipoGrado && event.tipoGrado !== this.calendarTipoGrado) return false;
    if (this.calendarGrado && (event.grado || '') !== this.calendarGrado) return false;
    if (this.calendarCurso && event.curso !== this.calendarCurso) return false;
    return true;
  }

  private getCalendarEventsForView(): CalendarEvent[] {
    const events = this.getCalendarEventsForView();
    if (!this.hasAnyCalendarFilter()) return events;

    return events
      .filter((e) => e.type === 'tarea' || e.type === 'examen')
      .filter((e) => this.calendarEventMatchesFilters(e));
  }

  generateCalendar(): void {
    this.daysInMonth = [];

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const realToday = new Date();

    // DÃ­as previos
    for (let i = 0; i < firstDay; i++) {
      const day = prevMonthDays - firstDay + 1 + i;
      this.daysInMonth.push({ day, isCurrentMonth: false, date: null, isToday: false, events: [] });
    }

    const events = Array.isArray(this.events) ? this.events : [];

    // DÃ­as del mes actual
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

    // DÃ­as posteriores
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
    if (!event.codigo_evento) {
      this.toast.error('Error: el evento no tiene un cÃ³digo vÃ¡lido.');
      return;
    }
    this.pendingDelete = event;
  }

  setSection(section: 'calendar' | 'examenes' | 'tareas' | 'reuniones' | 'otros' | 'compartidos'): void {
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
      reuniones: 'reunion',
      otros: 'otro'
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
      case 'otros': return 'Otros';
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

  private buildNotifications(events: CalendarEvent[]): any[] {
    const sorted = [...events].sort((a, b) => {
      const aKey = `${this.normalizeDate(a.date)} ${a.startTime || ''}`;
      const bKey = `${this.normalizeDate(b.date)} ${b.startTime || ''}`;
      return bKey.localeCompare(aKey);
    });

    return sorted
      .filter((event) => !event.codigo_evento || !this.dismissedNotificationIds.has(event.codigo_evento))
      .slice(0, 5)
      .map((event) => ({
        id: event.codigo_evento || '',
        type: event.type,
        date: this.normalizeDate(event.date),
        title: event.title || this.typeLabel(event.type),
        time: `${this.formatDateLabel(event.date)}${event.startTime ? ' ' + event.startTime : ''}`,
        badge: event.ownership === 'compartido' ? 'Compartido' : ''
      }));
  }

  openNotification(item: any) {
    const id = item?.id;
    const found = id ? this.events.find((e) => e.codigo_evento === id) : undefined;
    const type = (found?.type || item?.type) as CalendarEvent['type'] | undefined;
    const date = found?.date || item?.date;

    if (date) {
      this.selectedDate = this.normalizeDate(date);
    }

    const typeToSection: Record<string, 'examenes' | 'tareas' | 'reuniones' | 'otros'> = {
      examen: 'examenes',
      tarea: 'tareas',
      reunion: 'reuniones',
      otro: 'otros'
    };

    if (type && typeToSection[type]) {
      this.activeSection = typeToSection[type];
    } else {
      this.activeSection = 'calendar';
    }

    this.highlightEventId = found?.codigo_evento || id || null;
    const targetId = this.highlightEventId ? `event-${this.highlightEventId}` : null;
    if (targetId) {
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setTimeout(() => {
          if (this.highlightEventId === (found?.codigo_evento || id || null)) {
            this.highlightEventId = null;
          }
        }, 3000);
      }, 50);
    }
  }

  requestDismissNotification(item: any) {
    this.pendingDismissNotification = item;
  }

  cancelDismissNotification() {
    this.pendingDismissNotification = null;
  }

  confirmDismissNotification() {
    const id = this.pendingDismissNotification?.id;
    if (id) {
      this.dismissedNotificationIds.add(id);
    }
    this.pendingDismissNotification = null;
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.toast.success('Notificación ocultada.');
  }

  onDaySelect(day: CalendarDayCell): void {
    if (!day?.isCurrentMonth || !day?.date) {
      return;
    }
    this.selectedDate = this.normalizeDate(day.date);

    // Si hay eventos en ese dÃ­a, cambiamos a la secciÃ³n del primer evento
    if (day.events && day.events.length > 0) {
      const firstType = day.events[0].type;
      const typeToSection: Record<string, 'examenes' | 'tareas' | 'reuniones' | 'otros'> = {
        examen: 'examenes',
        tarea: 'tareas',
        reunion: 'reuniones',
        otro: 'otros'
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
    // 1. Llamamos al servicio para borrar token (si tienes el mÃ©todo creado)
    this.authService.logout(); 
    
    // 2. Redirigimos al login
    this.router.navigate(['/login']);
  }

  async linkGoogleApis(): Promise<void> {
    try {
      await this.authService.linkGoogleApis();
    } catch (err) {
      console.error(err);
      this.toast.warning('Primero inicia sesi\u00f3n con Google.');
    }
  }

  private refreshGoogleStatus(): void {
    this.dashboardService.getGoogleStatus().subscribe({
      next: (res) => {
        this.googleLinked = !!res?.linked;
      },
      error: () => {
        this.googleLinked = false;
      }
    });
  }

  cancelDelete(): void {
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const event = this.pendingDelete;
    if (!event?.codigo_evento) {
      this.pendingDelete = null;
      return;
    }

    this.dashboardService.deleteEvent(event.codigo_evento).subscribe({
      next: () => {
        this.toast.success('Evento eliminado.');
        this.events = this.events.filter(e => e.codigo_evento !== event.codigo_evento);
        this.pendingDelete = null;
        this.loadDashboard();
      },
      error: (err) => {
        console.error(err);
        this.toast.error('Error al eliminar el evento.');
        this.pendingDelete = null;
      }
    });
  }
}


