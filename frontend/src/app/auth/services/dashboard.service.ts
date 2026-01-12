import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // <--- OJO: Importar HttpHeaders
import { Observable } from 'rxjs';
import { CalendarEvent } from '../../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private dashboardUrl = 'http://localhost:3000/api/dashboard';
  private eventsUrl = 'http://localhost:3000/api/events';

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const userId = localStorage.getItem('userId') || ''; 
    return {
      headers: new HttpHeaders({
        'x-user-id': userId 
      })
    };
  }

  getDashboard(): Observable<any> {
    return this.http.get(this.dashboardUrl, this.getHeaders());
  }

  getEvents(): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(this.eventsUrl, this.getHeaders());
  }

  createEvent(event: CalendarEvent): Observable<any> {
    return this.http.post(this.eventsUrl, event, this.getHeaders());
  }

  updateEvent(event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.put<CalendarEvent>(`${this.eventsUrl}/${event.codigo_evento}`, event, this.getHeaders());
  }

  deleteEvent(codigo_evento: string): Observable<any> {
    return this.http.delete(`${this.eventsUrl}/${codigo_evento}`, this.getHeaders());
  }
}