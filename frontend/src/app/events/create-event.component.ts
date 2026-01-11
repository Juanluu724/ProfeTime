import { Component, EventEmitter, Output } from '@angular/core';
import { DashboardService } from '../auth/services/dashboard.service';
import { CalendarEvent } from '../models/event.model';

@Component({
  selector: 'app-create-event',
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.scss']
})
export class CreateEventComponent {

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<CalendarEvent>();

  errorMessage = '';
  saving = false;

  event: CalendarEvent = {
    title: '',
    type: 'tarea',
    date: ''
  };

  constructor(private dashboardService: DashboardService) {}

  save(): void {
    this.errorMessage = '';
    if (!this.event.title || !this.event.type || !this.event.date) {
      this.errorMessage = 'Completa titulo, tipo y fecha.';
      return;
    }

    this.saving = true;
    this.dashboardService.createEvent(this.event).subscribe({
      next: (created) => {
        this.saving = false;
        this.saved.emit({ ...this.event, ...(created || {}) });
      },
      error: () => {
        this.saving = false;
        this.errorMessage = 'No se pudo guardar el evento.';
      }
    });
  }
}
