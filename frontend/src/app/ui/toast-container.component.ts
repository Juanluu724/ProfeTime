import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Toast, ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack" aria-live="polite" aria-relevant="additions">
      <div
        *ngFor="let t of toasts"
        class="toast"
        [class.success]="t.type === 'success'"
        [class.error]="t.type === 'error'"
        [class.warning]="t.type === 'warning'"
        [class.info]="t.type === 'info'"
        (click)="dismiss(t.id)"
        role="status"
      >
        <div class="toast-title" *ngIf="t.title">{{ t.title }}</div>
        <div class="toast-msg">{{ t.message }}</div>
      </div>
    </div>
  `,
  styles: [
    `
      .toast-stack {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: min(360px, calc(100vw - 32px));
        pointer-events: none;
      }

      .toast {
        pointer-events: auto;
        cursor: pointer;
        border-radius: 14px;
        padding: 12px 14px;
        background: rgba(17, 24, 39, 0.92);
        color: #fff;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
        border: 1px solid rgba(255, 255, 255, 0.12);
        animation: toastIn 180ms ease-out;
        backdrop-filter: blur(10px);
      }

      .toast-title {
        font-weight: 700;
        font-size: 13px;
        margin-bottom: 4px;
        letter-spacing: 0.2px;
      }

      .toast-msg {
        font-size: 13px;
        opacity: 0.95;
        line-height: 1.25rem;
      }

      .toast.success {
        border-left: 4px solid #22c55e;
      }
      .toast.error {
        border-left: 4px solid #ef4444;
      }
      .toast.warning {
        border-left: 4px solid #f59e0b;
      }
      .toast.info {
        border-left: 4px solid #3b82f6;
      }

      @keyframes toastIn {
        from {
          transform: translateY(-6px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `
  ]
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private sub?: Subscription;
  private timers = new Map<string, any>();

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.sub = this.toastService.stream().subscribe((t) => {
      this.toasts = [t, ...this.toasts].slice(0, 5);
      const timer = setTimeout(() => this.dismiss(t.id), t.ttlMs);
      this.timers.set(t.id, timer);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
  }

  dismiss(id: string) {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }
}

