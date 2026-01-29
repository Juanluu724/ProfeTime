import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  ttlMs: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly toast$ = new Subject<Toast>();

  stream(): Observable<Toast> {
    return this.toast$.asObservable();
  }

  success(message: string, title?: string, ttlMs = 2800) {
    this.emit({ type: 'success', message, title, ttlMs });
  }

  error(message: string, title?: string, ttlMs = 3500) {
    this.emit({ type: 'error', message, title, ttlMs });
  }

  warning(message: string, title?: string, ttlMs = 3200) {
    this.emit({ type: 'warning', message, title, ttlMs });
  }

  info(message: string, title?: string, ttlMs = 2800) {
    this.emit({ type: 'info', message, title, ttlMs });
  }

  private emit(input: Omit<Toast, 'id'>) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.toast$.next({ id, ...input });
  }
}

