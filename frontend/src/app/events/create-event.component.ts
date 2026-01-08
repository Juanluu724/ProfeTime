import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type EventType = 'tarea' | 'examen' | 'reunion' | 'otro';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.scss']
})
export class CreateEventComponent implements OnInit {

  @Input() type: EventType = 'tarea';
  @Output() close = new EventEmitter<void>();

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

  ngOnInit(): void {
    this.event.type = this.type;
  }

  save() {
    // Aquí luego irá backend o service
    console.log('Evento creado:', this.event);
    this.close.emit();
  }
}
