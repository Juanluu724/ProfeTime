import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notifications-container">
      <div class="header">
        <span class="label">NOTIFICACIONES</span>
        <span class="count-badge">{{ data.length }}</span>
      </div>

      <div class="list">
        <div *ngFor="let item of data" class="item" [ngClass]="getStyleClass(item.type)">
          
          <div class="icon-area">
            <span class="material-icon" [ngClass]="item.type">
              {{ getIcon(item.type) }}
            </span>
          </div>

          <div class="content-area">
            <p class="title">{{ item.title }}</p>
            <small class="time-ago">{{ item.time }}</small>
          </div>

          <div class="badge-area" *ngIf="item.badge">
            <span class="time-pill" [ngClass]="item.type">{{ item.badge }}</span>
          </div>

        </div>
      </div>
    </div>
  `,
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent {
  @Input() data: any[] = [];

  // Función para elegir el icono según el tipo
  getIcon(type: string): string {
    const icons: any = {
      'examen': '📄',      // O usa clases de FontAwesome: 'fa-solid fa-file-lines'
      'reunion': '📹',     // 'fa-solid fa-video'
      'tarea': '✅',       // 'fa-solid fa-check-square'
      'compartido': '👥',  // 'fa-solid fa-user-group'
      'otro': '🔵'
    };
    return icons[type] || '🔵';
  }

  // Clase CSS dinámica según el tipo
  getStyleClass(type: string): string {
    return 'type-' + type;
  }
}