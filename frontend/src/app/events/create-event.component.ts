import { Component, EventEmitter, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-create-event',
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.scss']
})
export class CreateEventComponent {

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  event = {
    title: '',
    type: 'tarea',
    date: '',
    startTime: '',
    endTime: '',
    description: '',
    location: '',
    meet: '',
    drive: '',
    maps: ''
  };

  constructor(private http: HttpClient) {}

  save() {

    if (!this.event.title || !this.event.date || !this.event.type) {
      alert('Faltan datos obligatorios');
      return;
    }

    // 👇 SOLO lo que el backend espera
    const payload = {
      title: this.event.title,
      type: this.event.type,
      date: this.event.date // yyyy-mm-dd (input date ya lo hace bien)
    };

    this.http.post('http://localhost:3000/api/events/create', payload)
      .subscribe({
        next: () => {
          this.saved.emit();   // 🔥 AVISA AL DASHBOARD
          this.close.emit();   // cierra modal
        },
        error: (err) => {
          console.error(err);
          alert('Error al guardar el evento');
        }
      });
  }
}
