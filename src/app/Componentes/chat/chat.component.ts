import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../../services/auth.service';

interface ChatMessage {
    text: string;
    isUser: boolean;
}

interface Chat {
    id: string;
    title: string;
    messages: ChatMessage[];
}

/** Delay em ms para simular resposta do bot */
const BOT_RESPONSE_DELAY_MS = 800;

const BOT_DEFAULT_RESPONSE = 'Olá! Sou o ChatBot. Como posso ajudá-lo hoje? Estou aqui para responder suas perguntas e auxiliar no que você precisar.';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FontAwesomeModule],
    templateUrl: './chat.component.html',
})
export class ChatComponent implements OnInit, AfterViewChecked {
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
    
    chats: Chat[] = [];
    currentChatId: string = '';
    username = '';
    showUserMenu = false;
    private shouldScroll = false;

    get messages(): ChatMessage[] {
        return this.currentChat?.messages ?? [];
    }

    get currentChat(): Chat | undefined {
        return this.chats.find(c => c.id === this.currentChatId);
    }

    constructor(private authService: AuthService) {}

    ngOnInit(): void {
        this.username = this.authService.getUsername() || 'Usuário';
        this.createNewChat();
    }

    ngAfterViewChecked(): void {
        if (this.shouldScroll) {
            this.scrollToBottom();
            this.shouldScroll = false;
        }
    }

    private scrollToBottom(): void {
        if (this.messagesContainer) {
            const container = this.messagesContainer.nativeElement;
            container.scrollTop = container.scrollHeight;
        }
    }

    logout(): void {
        this.authService.logout();
    }

    toggleUserMenu(): void {
        this.showUserMenu = !this.showUserMenu;
    }

    createNewChat(): void {
        // Se o chat atual estiver vazio, não cria outro
        if (this.currentChat && this.currentChat.messages.length === 0) {
            return;
        }

        const newChat: Chat = {
            id: crypto.randomUUID(),
            title: 'Novo chat',
            messages: []
        };
        this.chats.unshift(newChat);
        this.currentChatId = newChat.id;
    }

    selectChat(chatId: string): void {
        this.currentChatId = chatId;
    }

    sendMessage(input: HTMLTextAreaElement): void {
        const text = input.value.trim();
        if (!text || !this.currentChat) return;

        // Atualiza o título do chat com a primeira mensagem
        if (this.currentChat.messages.length === 0) {
            this.currentChat.title = text.length > 30 ? text.substring(0, 30) + '...' : text;
        }

        this.currentChat.messages.push({ text, isUser: true });
        input.value = '';
        this.shouldScroll = true;

        setTimeout(() => {
            this.currentChat?.messages.push({ text: BOT_DEFAULT_RESPONSE, isUser: false });
            this.shouldScroll = true;
        }, BOT_RESPONSE_DELAY_MS);
    }

    handleEnter(event: KeyboardEvent, input: HTMLTextAreaElement): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage(input);
        }
    }
}