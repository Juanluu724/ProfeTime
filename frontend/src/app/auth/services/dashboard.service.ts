import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs'; // Importar Subject
import { CalendarEvent } from '../../models/event.model';
import { io, Socket } from 'socket.io-client'; // Importar socket

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private dashboardUrl = 'http://localhost:3000/api/dashboard';
  private eventsUrl = 'http://localhost:3000/api/events';
  
  private socket: Socket;
  // Un observable para que el componente se suscriba a eventos nuevos
  public onNewEvent$: Subject<CalendarEvent> = new Subject();

  constructor(private http: HttpClient) { 
    // Inicializar conexión socket
    this.socket = io('http://localhost:3000');
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    const userId = this.getUserId();
    if (userId) {
        // Unirse a la sala con mi ID
        this.socket.emit('join_room', userId);
        
        // Escuchar cuando me comparten algo
        this.socket.on('nuevo_evento_compartido', (event: CalendarEvent) => {
            console.log('Recibido evento en tiempo real:', event);
            this.onNewEvent$.next(event); // Avisar al componente
            alert(`¡Tienes un nuevo evento compartido: ${event.title}!`);
        });
    }
  }
  
  // Extraemos lógica de obtener ID para reusar
  private getUserId(): string | null {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const userObject = JSON.parse(userString);
        return userObject.codigo_usuario;
      } catch (e) { return null; }
    }
    return null;
  }

  private getHeaders() {
    const userId = this.getUserId();
    const headers = userId ? new HttpHeaders({ 'x-user-id': userId }) : new HttpHeaders();
    return { headers: headers };
  }

  getDashboard(): Observable<any> {
    return this.http.get(this.dashboardUrl, this.getHeaders());
  }

  getEvents(): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(this.eventsUrl, this.getHeaders());
  }

  createEvent(event: any): Observable<any> {
    return this.http.post(this.eventsUrl, event, this.getHeaders());
  }

  updateEvent(event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.put<CalendarEvent>(`${this.eventsUrl}/${event.codigo_evento}`, event, this.getHeaders());
  }

  deleteEvent(codigo_evento: string): Observable<any> {
    return this.http.delete(`${this.eventsUrl}/${codigo_evento}`, this.getHeaders());
  }
}