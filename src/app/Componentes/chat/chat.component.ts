import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FontAwesomeModule],
    templateUrl: './chat.component.html'
})
export class ChatComponent implements OnInit {
    messages: Array<{ text: string, isUser: boolean }> = [];
    username: string = '';

    constructor(private authService: AuthService) { }

    ngOnInit() {
        this.username = this.authService.getUsername() || 'Usuário';
    }

    logout() {
        this.authService.logout();
    }

    sendMessage(input: HTMLTextAreaElement) {
        const text = input.value.trim();
        if (text) {
            this.messages.push({ text, isUser: true });
            input.value = '';

            // Simular resposta do bot
            setTimeout(() => {
                this.messages.push({
                    text: 'Olá! Sou o ChatBot. Como posso ajudá-lo hoje? Estou aqui para responder suas perguntas e auxiliar no que você precisar.',
                    isUser: false
                });
            }, 800);
        }
    }

    handleEnter(event: KeyboardEvent, input: HTMLTextAreaElement) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage(input);
        }
    }
}