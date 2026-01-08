import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardData {
  menuCounts: {
    examenes: number;
    tareas: number;
    reuniones: number;
  };
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    time: string;
    badge: string;
  }>;
  calendarEvents: Array<{
    date: string;
    type: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:3000/api/dashboard';

  constructor(private http: HttpClient) { }

  getData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(this.apiUrl);
  }
}