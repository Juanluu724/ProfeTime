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
  generatingMeet = false;
  creatingDrive = false;

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

  generateMeet(): void {
    this.errorMessage = '';
    if (!this.event.date) {
      this.errorMessage = 'La fecha es obligatoria para Meet.';
      return;
    }

    this.generatingMeet = true;
    this.dashboardService
      .generateMeet({
        date: this.event.date,
        startTime: this.event.startTime,
        endTime: this.event.endTime,
        title: this.event.title
      })
      .subscribe({
        next: (res) => {
          this.generatingMeet = false;
          if (res.meetLink) {
            this.event.meet = res.meetLink;
          } else {
            this.errorMessage = 'No se pudo generar el enlace de Meet.';
          }
        },
        error: () => {
          this.generatingMeet = false;
          this.errorMessage = 'Error al generar Meet.';
        }
      });
  }

  attachDrive(): void {
    this.errorMessage = '';
    this.creatingDrive = true;
    this.dashboardService
      .createDriveFolder({ name: this.event.title || 'ProfeTime' })
      .subscribe({
        next: (res) => {
          this.creatingDrive = false;
          if (res.link) {
            this.event.drive = res.link;
          } else {
            this.errorMessage = 'No se pudo crear la carpeta de Drive.';
          }
        },
        error: () => {
          this.creatingDrive = false;
          this.errorMessage = 'Error al crear carpeta en Drive.';
        }
      });
  }
}
