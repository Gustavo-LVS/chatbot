import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css']
})
export class ChatComponent {
    messages: Array<{ text: string, isUser: boolean }> = [
        { text: 'Olá! Como posso ajudar você hoje?', isUser: false }
    ];

    sendMessage(input: HTMLInputElement) {
        const text = input.value.trim();
        if (text) {
            this.messages.push({ text, isUser: true });
            input.value = '';

            // Simular resposta
            setTimeout(() => {
                this.messages.push({
                    text: 'Esta é uma resposta simulada.',
                    isUser: false
                });
            }, 1000);
        }
    }
}
