import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
// CORRECCIÓN 1: Aseguramos que la ruta coincida con la carpeta creada en el paso 1
// Tienes que entrar a la carpeta 'auth' antes de ir a 'services'
import { DashboardService, DashboardData } from '../auth/services/dashboard.service';
import { NotificationsComponent } from './components/notifications/notifications.component';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, NotificationsComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  menuCounts = { examenes: 0, tareas: 0, reuniones: 0 };
  notifications: any[] = [];
  
  currentDate = new Date(2026, 0, 1);
  daysInMonth: any[] = [];
  weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  eventsMap: { [key: string]: string } = {}; 

  // Si hiciste el paso 1, este error de inyección desaparecerá
  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.dashboardService.getData().subscribe({
      next: (data: DashboardData) => {
        this.menuCounts = data.menuCounts;
        this.notifications = data.notifications;
        
        // CORRECCIÓN 2: Agregamos el tipo explícito (evt: any) o usamos el tipo real
        data.calendarEvents.forEach((evt: any) => {
          const dateStr = new Date(evt.date).toISOString().split('T')[0];
          this.eventsMap[dateStr] = evt.type;
        });

        this.generateCalendar();
      },
      // CORRECCIÓN 3: Agregamos el tipo explícito (err: any)
      error: (err: any) => console.error('Error conectando al backend:', err)
    });
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, class: 'empty' });
    }

    for (let i = 1; i <= totalDays; i++) {
      const dayString = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      const eventType = this.eventsMap[dayString];

      days.push({ 
        day: i, 
        type: eventType,
        class: 'active' 
      });
    }

    this.daysInMonth = days;
  }

  getNotifClass(type: string): string {
    const classes: any = { 
      'examen': 'notif-red', 
      'tarea': 'notif-green', 
      'reunion': 'notif-purple' 
    };
    return classes[type] || '';
  }
}