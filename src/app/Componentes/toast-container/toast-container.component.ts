import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  template: `
    <div class="fixed top-4 right-4 z-9999 flex flex-col gap-2">
      @for (toast of toasts$ | async; track toast.id) {
        <div
          [class]="getToastClass(toast.severity)"
          class="min-w-[300px] max-w-md rounded-xl shadow-2xl p-3.5 flex items-start gap-3 backdrop-blur-sm border animate-slide-in">
          <div class="shrink-0 mt-0.5">
            <fa-icon [icon]="['fas', getIcon(toast.severity)]" class="text-lg"></fa-icon>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-sm mb-0.5">{{ toast.summary }}</h4>
            <p class="text-xs opacity-90">{{ toast.detail }}</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .animate-slide-in {
      animation: slide-in 0.2s ease-out;
    }
  `]
})
export class ToastContainerComponent {
  toasts$;

  constructor(private toastService: ToastService) {
    this.toasts$ = this.toastService.toasts;
  }

  getToastClass(severity: Toast['severity']): string {
    const classes = {
      success: 'bg-emerald-500/95 text-white border-emerald-600',
      error: 'bg-red-500/95 text-white border-red-600',
      info: 'bg-blue-500/95 text-white border-blue-600',
      warn: 'bg-amber-500/95 text-white border-amber-600'
    };
    return classes[severity];
  }

  getIcon(severity: Toast['severity']): string {
    const icons = {
      success: 'check-circle',
      error: 'times-circle',
      info: 'info-circle',
      warn: 'exclamation-triangle'
    };
    return icons[severity];
  }
}
