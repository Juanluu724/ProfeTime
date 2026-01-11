import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CalendarEvent } from '../../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private dashboardUrl = 'http://localhost:3000/api/dashboard';
  private eventsUrl = 'http://localhost:3000/api/events';

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<any> {
    return this.http.get(this.dashboardUrl);
  }

  createEvent(event: CalendarEvent): Observable<any> {
    return this.http.post(this.eventsUrl, event);
  }
}
