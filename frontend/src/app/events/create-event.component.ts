import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core'; // Añadido Input y OnInit
import { DashboardService } from '../auth/services/dashboard.service';
import { CalendarEvent } from '../models/event.model';

@Component({
  selector: 'app-create-event',
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.scss']
})
export class CreateEventComponent implements OnInit {

  @Input() eventToEdit?: CalendarEvent;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<CalendarEvent>();

  errorMessage = '';
  saving = false;

  event: CalendarEvent = {
    title: '',
    type: 'tarea',
    date: ''
  };

  constructor(private dashboardService: DashboardService) { }

  ngOnInit(): void {

    if (this.eventToEdit) {
      this.event = { ...this.eventToEdit };
    }
  }

  save(): void {
    this.errorMessage = '';
    if (!this.event.title || !this.event.date) {
      this.errorMessage = 'El título y la fecha son obligatorios.';
      return;
    }

    this.saving = true;

    if (this.event.codigo_evento) {
      this.dashboardService.updateEvent(this.event).subscribe({
        next: () => {
          this.saving = false;
          this.saved.emit(this.event);
          this.close.emit();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = 'Error al actualizar el evento.';
          console.error(err);
        }
      });
    } else {
      this.dashboardService.createEvent(this.event).subscribe({
        next: (res) => {
          this.saving = false;
          this.saved.emit(res);
          this.close.emit();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = 'Error al crear el evento.';
          console.error(err);
        }
      });
    }
  }
}