import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// IMPORTAR EL SERVICIO
import { DashboardService } from '../auth/services/dashboard.service';
import { HttpClientModule } from '@angular/common/http'; // Asegúrate de tener esto si no es standalone puro

type EventType = 'tarea' | 'examen' | 'reunion' | 'otro';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule], // Añadir HttpClientModule si es necesario
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.scss']
})
export class CreateEventComponent implements OnInit {

  @Input() type: EventType = 'tarea';
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>(); // NUEVO OUTPUT

  event = {
    title: '',
    type: 'tarea' as EventType,
    date: '',
    startTime: '',
    endTime: '',
    description: '',
    location: '',
    meet: '',
    drive: '',
    maps: ''
  };

  // INYECTAR SERVICIO
  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.event.type = this.type;
  }

  save() {
    // LLAMADA AL BACKEND
    this.dashboardService.createEvent(this.event).subscribe({
      next: (res) => {
        console.log('Evento creado:', res);
        this.saved.emit(); // Avisamos al padre que se guardó
        this.close.emit(); // Cerramos el modal
      },
      error: (err) => {
        console.error('Error al crear evento:', err);
        alert('Error al guardar el evento');
      }
    });
  }
}