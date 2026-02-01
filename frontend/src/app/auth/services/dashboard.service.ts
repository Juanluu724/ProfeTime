import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { CalendarEvent } from '../../models/event.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private dashboardUrl = `${environment.apiBaseUrl}/api/dashboard`;
  private eventsUrl = `${environment.apiBaseUrl}/api/events`;
  private googleUrl = `${environment.apiBaseUrl}/api/google`;

  private socket: Socket;

  public onNewEvent$: Subject<CalendarEvent> = new Subject();
  public onDeleteEvent$: Subject<string> = new Subject();

  constructor(private http: HttpClient) {
    this.socket = io(environment.apiBaseUrl);
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    const userId = this.getUserId();
    if (!userId) return;

    this.socket.emit('join_room', userId);

    this.socket.on('nuevo_evento_compartido', (event: CalendarEvent) => {
      this.onNewEvent$.next(event);
    });

    this.socket.on('evento_eliminado', (codigo_evento: string) => {
      this.onDeleteEvent$.next(codigo_evento);
    });
  }

  private getUserId(): string | null {
    const userString = localStorage.getItem('profetime_user') || localStorage.getItem('user');
    if (!userString) return null;
    try {
      const userObject = JSON.parse(userString);
      return userObject.codigo_usuario || null;
    } catch {
      return null;
    }
  }

  getDashboard(): Observable<any> {
    return this.http.get(this.dashboardUrl);
  }

  getEvents(filters?: { tipoGrado?: string | null; grado?: string | null; curso?: 1 | 2 | string | null }): Observable<CalendarEvent[]> {
    let params = new HttpParams();
    if (filters?.tipoGrado) params = params.set('tipoGrado', String(filters.tipoGrado));
    if (filters?.grado) params = params.set('grado', String(filters.grado));
    if (filters?.curso !== undefined && filters?.curso !== null && String(filters.curso).trim() !== '') {
      params = params.set('curso', String(filters.curso));
    }
    return this.http.get<CalendarEvent[]>(this.eventsUrl, { params });
  }

  createEvent(event: any): Observable<any> {
    return this.http.post(this.eventsUrl, event);
  }

  updateEvent(event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.put<CalendarEvent>(`${this.eventsUrl}/${event.codigo_evento}`, event);
  }

  deleteEvent(codigo_evento: string): Observable<any> {
    return this.http.delete(`${this.eventsUrl}/${codigo_evento}`);
  }

  generateMeet(payload: {
    date: string;
    startTime?: string;
    endTime?: string;
    title?: string;
  }): Observable<{ meetLink?: string }> {
    return this.http.post<{ meetLink?: string }>(`${this.googleUrl}/meet`, payload);
  }

  createDriveFolder(payload: { name?: string }): Observable<{ link?: string }> {
    return this.http.post<{ link?: string }>(`${this.googleUrl}/drive/folder`, payload);
  }

  getPickerToken(): Observable<{ accessToken: string }> {
    return this.http.get<{ accessToken: string }>(`${this.googleUrl}/picker-token`);
  }

  getGoogleStatus(): Observable<{ linked: boolean }> {
    return this.http.get<{ linked: boolean }>(`${this.googleUrl}/status`);
  }
}
