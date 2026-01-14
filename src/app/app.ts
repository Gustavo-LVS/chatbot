import { Component, signal, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationCancel, NavigationEnd, NavigationError, NavigationStart } from '@angular/router';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { initializeIconLibrary } from './icon-library.config';
import { ToastContainerComponent } from './Componentes/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FontAwesomeModule, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('chatbot');
  protected readonly isLoading = signal(true);
  private loadingStartedAt = Date.now();
  private hideLoadingTimeout: number | undefined;
  
  constructor() {
    // Inicializa a biblioteca de ícones
    const library = inject(FaIconLibrary);
    initializeIconLibrary(library);

    // Mostra uma tela de loading durante o boot e navegações
    const router = inject(Router);
    router.events
      .pipe(
        takeUntilDestroyed(),
        filter(
          (e) =>
            e instanceof NavigationStart ||
            e instanceof NavigationEnd ||
            e instanceof NavigationCancel ||
            e instanceof NavigationError
        )
      )
      .subscribe((e) => {
        if (e instanceof NavigationStart) {
          this.loadingStartedAt = Date.now();
          if (this.hideLoadingTimeout) window.clearTimeout(this.hideLoadingTimeout);
          this.isLoading.set(true);
          return;
        }

        // Evita "flash" de loading em navegações rápidas
        const MIN_MS = 450;
        const elapsed = Date.now() - this.loadingStartedAt;
        const remaining = Math.max(0, MIN_MS - elapsed);
        if (this.hideLoadingTimeout) window.clearTimeout(this.hideLoadingTimeout);
        this.hideLoadingTimeout = window.setTimeout(() => this.isLoading.set(false), remaining);
      });
  }
}
