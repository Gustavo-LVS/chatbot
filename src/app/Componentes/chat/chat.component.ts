import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../../services/auth.service';
import { OllamaService, OllamaMessage } from '../../services/ollama.service';

interface ChatMessage {
    text: string;
    isUser: boolean;
}

interface Chat {
    id: string;
    title: string;
    messages: ChatMessage[];
    history: OllamaMessage[]; // Histórico para contexto do Ollama
}

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
    isLoading = false;
    ollamaAvailable = false;
    private shouldScroll = false;

    get messages(): ChatMessage[] {
        return this.currentChat?.messages ?? [];
    }

    get currentChat(): Chat | undefined {
        return this.chats.find(c => c.id === this.currentChatId);
    }

    constructor(
        private authService: AuthService,
        private ollamaService: OllamaService
    ) {}

    async ngOnInit(): Promise<void> {
        this.username = this.authService.getUsername() || 'Usuário';
        this.createNewChat();
        
        // Verifica se o Ollama está disponível
        this.ollamaAvailable = await this.ollamaService.isAvailable();
        if (!this.ollamaAvailable) {
            console.warn('Ollama não está disponível. Execute: docker-compose up -d');
        }
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
        if (this.currentChat && this.currentChat.messages.length === 0) {
            return;
        }

        const newChat: Chat = {
            id: crypto.randomUUID(),
            title: 'Novo chat',
            messages: [],
            history: [
                {
                    role: 'system',
                    content: 'Você é um assistente útil e amigável. Responda em português de forma clara e concisa.'
                }
            ]
        };
        this.chats.unshift(newChat);
        this.currentChatId = newChat.id;
    }

    selectChat(chatId: string): void {
        this.currentChatId = chatId;
        this.shouldScroll = true;
    }

    async sendMessage(input: HTMLTextAreaElement): Promise<void> {
        const text = input.value.trim();
        if (!text || !this.currentChat || this.isLoading) return;

        // Atualiza o título do chat com a primeira mensagem
        if (this.currentChat.messages.length === 0) {
            this.currentChat.title = text.length > 30 ? text.substring(0, 30) + '...' : text;
        }

        // Adiciona mensagem do usuário
        this.currentChat.messages.push({ text, isUser: true });
        this.currentChat.history.push({ role: 'user', content: text });
        input.value = '';
        this.shouldScroll = true;
        
        // Inicia o loading
        this.isLoading = true;

        // Adiciona mensagem vazia do bot (será preenchida com streaming)
        const botMessageIndex = this.currentChat.messages.length;
        this.currentChat.messages.push({ text: '', isUser: false });

        try {
            if (!this.ollamaAvailable) {
                // Fallback se Ollama não estiver disponível
                this.currentChat.messages[botMessageIndex].text = 
                    '⚠️ Ollama não está disponível. Execute `docker-compose up -d` e baixe o modelo com `docker exec ollama ollama pull tinyllama`';
                return;
            }

            // Usa streaming para mostrar resposta gradualmente
            this.ollamaService.chatStream(this.currentChat.history).subscribe({
                next: (content) => {
                    if (this.currentChat) {
                        this.currentChat.messages[botMessageIndex].text = content;
                        this.shouldScroll = true;
                    }
                },
                error: (error) => {
                    console.error('Erro ao comunicar com Ollama:', error);
                    if (this.currentChat) {
                        this.currentChat.messages[botMessageIndex].text = 
                            '❌ Erro ao conectar com o Ollama. Verifique se está rodando.';
                    }
                    this.isLoading = false;
                },
                complete: () => {
                    // Adiciona resposta ao histórico
                    if (this.currentChat) {
                        this.currentChat.history.push({
                            role: 'assistant',
                            content: this.currentChat.messages[botMessageIndex].text
                        });
                    }
                    this.isLoading = false;
                }
            });
        } catch (error) {
            console.error('Erro:', error);
            this.currentChat.messages[botMessageIndex].text = 
                '❌ Erro inesperado. Tente novamente.';
            this.isLoading = false;
        }
    }

    handleEnter(event: KeyboardEvent, input: HTMLTextAreaElement): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage(input);
        }
    }
}
