import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  severity: 'success' | 'error' | 'info' | 'warn';
  summary: string;
  detail: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts$ = new BehaviorSubject<Toast[]>([]);
  private nextId = 1;

  get toasts() {
    return this.toasts$.asObservable();
  }

  add(toast: Omit<Toast, 'id'>) {
    const newToast: Toast = { ...toast, id: this.nextId++ };
    const current = this.toasts$.value;
    this.toasts$.next([...current, newToast]);

    // Auto-remove após 2.5 segundos
    setTimeout(() => this.remove(newToast.id), 2500);
  }

  remove(id: number) {
    const current = this.toasts$.value.filter(t => t.id !== id);
    this.toasts$.next(current);
  }

  success(summary: string, detail: string) {
    this.add({ severity: 'success', summary, detail });
  }

  error(summary: string, detail: string) {
    this.add({ severity: 'error', summary, detail });
  }

  info(summary: string, detail: string) {
    this.add({ severity: 'info', summary, detail });
  }

  warn(summary: string, detail: string) {
    this.add({ severity: 'warn', summary, detail });
  }
}
