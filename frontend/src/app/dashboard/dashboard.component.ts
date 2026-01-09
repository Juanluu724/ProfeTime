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

  // Ajustado para coincidir con tu imagen (Enero 2026)
  currentDate = new Date(2026, 0, 9);
  selectedDay = 9; // Para que aparezca el recuadro azul en el día 9

  weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  daysInMonth: any[] = []; // Ahora contendrá días del mes previo, actual y siguiente

  eventsMap: { [key: string]: string } = {};

  // 🔹 CONTROL MODAL
  showCreateEvent = false;

  constructor(private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.generateCalendar();
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.dashboardService.getData().subscribe({
      next: (data: DashboardData) => {
        this.menuCounts = data.menuCounts;
        this.notifications = data.notifications;

        // Mapear eventos
        data.calendarEvents.forEach((evt: any) => {
          const dateStr = new Date(evt.date).toISOString().split('T')[0];
          this.eventsMap[dateStr] = evt.type;
        });

        // 3. Volver a generar el calendario para que aparezcan los eventos (puntitos de colores)
        this.generateCalendar();
      },
      error: err => {
        console.error('Error conectando al backend:', err);
        // El calendario seguirá visible (aunque sin eventos) gracias al paso 1
      }
    });
  }

  // 🔹 LÓGICA DE CALENDARIO MEJORADA (Para diseño grid separado)
  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // 1. Obtener datos clave de fechas
    const firstDayIndex = new Date(year, month, 1).getDay(); // Día semana del 1ro
    const lastDayCurrentMonth = new Date(year, month + 1, 0).getDate(); // Último día mes actual
    const lastDayPrevMonth = new Date(year, month, 0).getDate(); // Último día mes anterior

    const days = [];

    // A) DÍAS DEL MES ANTERIOR (Para rellenar huecos al principio)
    // Se calculan hacia atrás para que queden grisáceos
    for (let i = firstDayIndex; i > 0; i--) {
      days.push({
        day: lastDayPrevMonth - i + 1,
        isCurrentMonth: false, // Esto activará la clase .faded en el HTML
        isSelected: false,
        type: null
      });
    }

    // B) DÍAS DEL MES ACTUAL
    for (let i = 1; i <= lastDayCurrentMonth; i++) {
      // Construir la key de fecha para buscar eventos (YYYY-MM-DD)
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;

      days.push({
        day: i,
        isCurrentMonth: true,
        isSelected: i === this.selectedDay, // Esto activará el borde azul
        type: this.eventsMap[dateStr] // 'examen', 'tarea', etc.
      });
    }

    // C) DÍAS DEL MES SIGUIENTE (Para completar la cuadrícula visualmente)
    // Normalmente una vista de mes tiene 35 (5 filas) o 42 (6 filas) celdas
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        isCurrentMonth: false, // Grisáceo
        isSelected: false,
        type: null
      });
    }

    this.daysInMonth = days;
  }

  // 🔹 BOTÓN CREAR EVENTO (Intacto)
  openCreateEvent() {
    this.showCreateEvent = true;
  }

  closeCreateEvent() {
    this.showCreateEvent = false;
  }

  getNotifClass(type: string): string {
    const classes: any = {
      examen: 'red',
      tarea: 'green',
      reunion: 'purple'
    };
    return classes[type] || '';
  }
}