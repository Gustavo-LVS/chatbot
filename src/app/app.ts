import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { initializeIconLibrary } from './icon-library.config';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FontAwesomeModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('chatbot');
  
  constructor() {
    // Inicializa a biblioteca de ícones
    const library = inject(FaIconLibrary);
    initializeIconLibrary(library);
  }
}
