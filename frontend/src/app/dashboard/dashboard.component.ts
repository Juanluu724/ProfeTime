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

  currentDate = new Date(2026, 0, 1);
  weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  daysInMonth: any[] = [];

  eventsMap: { [key: string]: string } = {};

  // 🔹 CONTROL MODAL
  showCreateEvent = false;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadDashboardData();
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
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null });
    }

    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${(month + 1)
        .toString()
        .padStart(2, '0')}-${i.toString().padStart(2, '0')}`;

      days.push({
        day: i,
        type: this.eventsMap[dateStr]
      });
    }

    this.daysInMonth = days;
  }

  // 🔹 BOTÓN CREAR EVENTO
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
