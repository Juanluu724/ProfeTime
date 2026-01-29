import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent {
  @Input() data: any[] = [];
  @Output() open = new EventEmitter<any>();
  @Output() dismiss = new EventEmitter<any>();

  // ASCII-only icon labels to avoid external icon fonts.
  getIcon(type: string): string {
    const icons: Record<string, string> = {
      examen: 'EX',
      reunion: 'RE',
      tarea: 'TA',
      compartido: 'CO',
      otro: 'OT'
    };
    return icons[type] || 'OT';
  }

  // CSS class for coloring by type.
  getStyleClass(type: string): string {
    return 'type-' + type;
  }

  onDismiss(item: any) {
    this.dismiss.emit(item);
  }

  onOpen(item: any) {
    this.open.emit(item);
  }
}
