import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { DashboardService, DashboardData } from '../auth/services/dashboard.service';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { CreateEventComponent } from '../events/create-event.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    NotificationsComponent,
    CreateEventComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  menuCounts = { examenes: 0, tareas: 0, reuniones: 0 };
  notifications: any[] = [];

  // CAMBIO 1: Usamos 'new Date()' vacío para que coja la fecha real de hoy
  currentDate = new Date(); 
  
  weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  daysInMonth: any[] = [];
  eventsMap: { [key: string]: string } = {};

  showCreateEvent = false;

  constructor(private dashboardService: DashboardService) { }

  get monthYearDisplay(): string {
    const str = this.currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  ngOnInit(): void {
    this.generateCalendar();
    this.loadDashboardData();
  }

  changeMonth(offset: number) {
    const newDate = new Date(this.currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    this.currentDate = newDate;
    this.generateCalendar();
  }

  // CAMBIO 2: El botón "Hoy" ahora te lleva a la fecha real
  goToToday() {
    this.currentDate = new Date(); 
    this.generateCalendar();
  }

  loadDashboardData() {
    this.dashboardService.getData().subscribe({
      next: (data: DashboardData) => {
        this.menuCounts = data.menuCounts;
        this.notifications = data.notifications;
        data.calendarEvents.forEach((evt: any) => {
          const dateStr = new Date(evt.date).toISOString().split('T')[0];
          this.eventsMap[dateStr] = evt.type;
        });
        this.generateCalendar();
      },
      error: err => console.error('Error conectando al backend:', err)
    });
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayCurrentMonth = new Date(year, month + 1, 0).getDate();
    const lastDayPrevMonth = new Date(year, month, 0).getDate();

    // CAMBIO 3: Guardamos la fecha real de hoy en una variable para comparar
    const todayReal = new Date();

    const days = [];

    // A) Mes anterior
    for (let i = firstDayIndex; i > 0; i--) {
      days.push({
        day: lastDayPrevMonth - i + 1,
        isCurrentMonth: false,
        isSelected: false, // Nunca seleccionamos días del mes pasado
        type: null
      });
    }

    // B) Mes actual
    for (let i = 1; i <= lastDayCurrentMonth; i++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;

      // LÓGICA DE SELECCIÓN REAL:
      // Comprobamos si el día 'i' coincide con el día real, 
      // y si el mes/año que estamos viendo coinciden con el mes/año real.
      const isToday = (i === todayReal.getDate()) && 
                      (month === todayReal.getMonth()) && 
                      (year === todayReal.getFullYear());

      days.push({
        day: i,
        isCurrentMonth: true,
        isSelected: isToday, // <--- Aquí aplicamos el booleano
        type: this.eventsMap[dateStr]
      });
    }

    // C) Mes siguiente
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isSelected: false,
        type: null
      });
    }

    this.daysInMonth = days;
  }

  openCreateEvent() { this.showCreateEvent = true; }
  
  closeCreateEvent() { this.showCreateEvent = false; }

  // NUEVO MÉTODO para recargar tras guardar
  onEventSaved() {
    this.loadDashboardData(); // Recarga los datos del backend
    this.showCreateEvent = false; // Cierra el modal
  }
  
  getNotifClass(type: string): string {
    const classes: any = { examen: 'red', tarea: 'green', reunion: 'purple' };
    return classes[type] || '';
  }
} 