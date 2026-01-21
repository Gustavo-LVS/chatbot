import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface OllamaMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface OllamaResponse {
    model: string;
    message: OllamaMessage;
    done: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class OllamaService {
    private readonly baseUrl = 'http://localhost:11434';
    private readonly model = 'tinyllama'; // Modelo leve (~637MB)

    /**
     * Envia uma mensagem para o Ollama e retorna a resposta completa
     */
    async chat(messages: OllamaMessage[]): Promise<string> {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model,
                messages: messages,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Erro ao conectar com Ollama: ${response.statusText}`);
        }

        const data: OllamaResponse = await response.json();
        return data.message.content;
    }

    /**
     * Envia uma mensagem e recebe a resposta em streaming (texto aparece gradualmente)
     */
    chatStream(messages: OllamaMessage[]): Observable<string> {
        return new Observable(observer => {
            const controller = new AbortController();

            fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    stream: true
                }),
                signal: controller.signal
            })
            .then(async response => {
                if (!response.ok) {
                    throw new Error(`Erro ao conectar com Ollama: ${response.statusText}`);
                }

                const reader = response.body?.getReader();
                if (!reader) {
                    throw new Error('Não foi possível ler a resposta');
                }

                const decoder = new TextDecoder();
                let fullContent = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            const json: OllamaResponse = JSON.parse(line);
                            if (json.message?.content) {
                                fullContent += json.message.content;
                                observer.next(fullContent);
                            }
                        } catch {
                            // Ignora linhas que não são JSON válido
                        }
                    }
                }

                observer.complete();
            })
            .catch(error => {
                observer.error(error);
            });

            return () => {
                controller.abort();
            };
        });
    }

    /**
     * Continua uma resposta de onde parou usando /api/generate
     * Funciona independente do modelo pois usa completion nativa
     */
    continueStream(messages: OllamaMessage[], partialResponse: string): Observable<string> {
        return new Observable(observer => {
            const controller = new AbortController();

            // Converte histórico em prompt formatado
            let prompt = '';
            for (const msg of messages) {
                if (msg.role === 'system') {
                    prompt += `System: ${msg.content}\n\n`;
                } else if (msg.role === 'user') {
                    prompt += `User: ${msg.content}\n\n`;
                } else if (msg.role === 'assistant') {
                    prompt += `Assistant: ${msg.content}\n\n`;
                }
            }
            
            // Adiciona o início da resposta para o modelo continuar
            prompt += `Assistant: ${partialResponse}`;

            fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: true,
                    raw: true // Usa o prompt exatamente como enviado
                }),
                signal: controller.signal
            })
            .then(async response => {
                if (!response.ok) {
                    throw new Error(`Erro ao conectar com Ollama: ${response.statusText}`);
                }

                const reader = response.body?.getReader();
                if (!reader) {
                    throw new Error('Não foi possível ler a resposta');
                }

                const decoder = new TextDecoder();
                let newContent = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            const json = JSON.parse(line);
                            if (json.response) {
                                newContent += json.response;
                                observer.next(newContent);
                            }
                        } catch {
                            // Ignora linhas que não são JSON válido
                        }
                    }
                }

                observer.complete();
            })
            .catch(error => {
                observer.error(error);
            });

            return () => {
                controller.abort();
            };
        });
    }

    /**
     * Verifica se o Ollama está rodando
     */
    async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Lista os modelos disponíveis
     */
    async listModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) return [];
            
            const data = await response.json();
            return data.models?.map((m: { name: string }) => m.name) ?? [];
        } catch {
            return [];
        }
    }

    /**
     * Baixa um modelo (pode demorar dependendo do tamanho)
     */
    async pullModel(modelName: string = this.model): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/pull`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: modelName })
        });

        if (!response.ok) {
            throw new Error(`Erro ao baixar modelo: ${response.statusText}`);
        }

        // Aguarda o download completo
        const reader = response.body?.getReader();
        if (reader) {
            while (true) {
                const { done } = await reader.read();
                if (done) break;
            }
        }
    }
}
