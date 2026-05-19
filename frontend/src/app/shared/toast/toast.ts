import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      @for (t of toast.toasts(); track t.id) {
        <div
          class="px-4 py-3 rounded-lg shadow-lg text-sm text-white flex items-start gap-3 animate-fadein"
          [class.bg-red-600]="t.kind === 'error'"
          [class.bg-emerald-600]="t.kind === 'success'"
          [class.bg-neutral-800]="t.kind === 'info'"
        >
          <span class="flex-1 leading-snug">{{ t.message }}</span>
          <button
            class="text-white/70 hover:text-white text-lg leading-none"
            (click)="toast.dismiss(t.id)"
            aria-label="Dismiss"
          >×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes fadein {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .animate-fadein { animation: fadein 180ms ease-out; }
  `],
})
export class ToastHost {
  toast = inject(ToastService);
}
