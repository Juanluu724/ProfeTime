import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnChanges, OnDestroy {
  @Input() data: any[] = [];
  @Output() open = new EventEmitter<any>();
  @Output() dismiss = new EventEmitter<any>();

  pulse = false;
  private prevCount = 0;
  private pulseTimer: any = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['data']) return;

    const nextCount = Array.isArray(this.data) ? this.data.length : 0;
    if (nextCount > this.prevCount) {
      this.pulse = true;
      if (this.pulseTimer) {
        clearTimeout(this.pulseTimer);
      }
      this.pulseTimer = setTimeout(() => {
        this.pulse = false;
        this.pulseTimer = null;
      }, 1200);
    }
    this.prevCount = nextCount;
  }

  ngOnDestroy(): void {
    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
      this.pulseTimer = null;
    }
  }

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
