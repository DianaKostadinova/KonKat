import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  toasts = this._toasts.asReadonly();

  private nextId = 1;

  success(message: string)  { this.push('success', message); }
  error(message: string)    { this.push('error', message); }
  info(message: string)     { this.push('info', message); }

  dismiss(id: number) {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }

  private push(kind: ToastKind, message: string) {
    const id = this.nextId++;
    this._toasts.update(list => [...list, { id, kind, message }]);
    // Auto-dismiss after 5s (errors stay 8s).
    setTimeout(() => this.dismiss(id), kind === 'error' ? 8000 : 5000);
  }
}
