import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../../services/auth.service';
import { OllamaService, OllamaMessage } from '../../services/ollama.service';
import { Subscription, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

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
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
    
    chats: Chat[] = [];
    currentChatId: string = '';
    username = '';
    showUserMenu = false;
    isLoading = false;
    ollamaAvailable = false;
    canContinue = false;
    sessionTimeRemaining = '';
    
    private shouldScroll = false;
    private currentSubscription?: Subscription;
    private pausedText = '';
    private destroy$ = new Subject<void>();

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
        // Verifica se a sessão ainda é válida
        const isValid = await this.authService.forceSessionCheck();
        if (!isValid) {
            this.authService.logout(true);
            return;
        }
        
        this.username = this.authService.getUsername() || 'Usuário';
        this.createNewChat();
        
        // Verifica se o Ollama está disponível
        this.ollamaAvailable = await this.ollamaService.isAvailable();
        if (!this.ollamaAvailable) {
            console.warn('Ollama não está disponível. Execute: docker-compose up -d');
        }
        
        // Atualiza indicador de tempo restante da sessão
        this.updateSessionTimeRemaining();
        interval(60000) // Atualiza a cada minuto
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.updateSessionTimeRemaining();
                
                // Verifica sessão periodicamente
                if (!this.authService.isAuthenticated()) {
                    console.warn('[ChatComponent] Sessão expirada');
                    this.authService.logout(true);
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.currentSubscription?.unsubscribe();
    }

    ngAfterViewChecked(): void {
        if (this.shouldScroll) {
            this.scrollToBottom();
            this.shouldScroll = false;
        }
    }

    private updateSessionTimeRemaining(): void {
        const ms = this.authService.getSessionTimeRemaining();
        if (ms <= 0) {
            this.sessionTimeRemaining = 'Sessão expirada';
            return;
        }
        
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            this.sessionTimeRemaining = `${days}d restantes`;
        } else if (hours > 0) {
            this.sessionTimeRemaining = `${hours}h ${minutes}m restantes`;
        } else {
            this.sessionTimeRemaining = `${minutes}m restantes`;
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

    autoResize(textarea: HTMLTextAreaElement): void {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    stopResponse(): void {
        if (this.currentSubscription) {
            this.currentSubscription.unsubscribe();
            this.currentSubscription = undefined;
            this.isLoading = false;
            
            // Guarda o texto parcial (NÃO adiciona ao histórico ainda)
            if (this.currentChat) {
                const lastMessage = this.currentChat.messages[this.currentChat.messages.length - 1];
                if (lastMessage && !lastMessage.isUser && lastMessage.text) {
                    this.pausedText = lastMessage.text;
                    this.canContinue = true;
                }
            }
        }
    }

    continueResponse(): void {
        if (!this.currentChat || this.isLoading || !this.pausedText) return;
        
        this.canContinue = false;
        this.isLoading = true;
        
        const lastIndex = this.currentChat.messages.length - 1;
        const textoAnterior = this.pausedText;
        
        // Usa o método continueStream que força o modelo a continuar de onde parou
        this.currentSubscription = this.ollamaService.continueStream(
            this.currentChat.history,
            textoAnterior
        ).subscribe({
            next: (newContent) => {
                if (this.currentChat) {
                    // Concatena o novo conteúdo ao texto anterior
                    this.currentChat.messages[lastIndex].text = textoAnterior + newContent;
                    this.shouldScroll = true;
                }
            },
            error: (error) => {
                console.error('Erro:', error);
                this.isLoading = false;
                this.canContinue = true;
            },
            complete: () => {
                if (this.currentChat) {
                    // Salva resposta completa no histórico oficial
                    this.currentChat.history.push({
                        role: 'assistant',
                        content: this.currentChat.messages[lastIndex].text
                    });
                }
                this.isLoading = false;
                this.pausedText = '';
            }
        });
    }

    async sendMessage(input: HTMLTextAreaElement): Promise<void> {
        const text = input.value.trim();
        if (!text || !this.currentChat || this.isLoading) return;

        // Verifica sessão antes de enviar mensagem
        const isValid = this.authService.isAuthenticated();
        if (!isValid) {
            this.authService.logout(true);
            return;
        }

        // Atualiza o título do chat com a primeira mensagem
        if (this.currentChat.messages.length === 0) {
            this.currentChat.title = text.length > 30 ? text.substring(0, 30) + '...' : text;
        }

        // Adiciona mensagem do usuário
        this.currentChat.messages.push({ text, isUser: true });
        this.currentChat.history.push({ role: 'user', content: text });
        input.value = '';
        input.style.height = 'auto';
        this.shouldScroll = true;
        
        // Inicia o loading
        this.isLoading = true;
        this.canContinue = false;

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
            this.currentSubscription = this.ollamaService.chatStream(this.currentChat.history).subscribe({
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
