# chatbot

Chat em Angular com um modelo de linguagem que roda na própria máquina, pelo [Ollama](https://ollama.com). Nenhuma mensagem sai do computador.

## Funcionalidades

- Conversa com o modelo `tinyllama` (leve, cerca de 640 MB), com resposta em streaming
- Botão para o modelo continuar uma resposta que parou no meio
- Telas de cadastro e login, com rotas protegidas
- Avisos (toasts) e interface em Tailwind CSS

> O cadastro e o login são locais, de demonstração: os usuários ficam no navegador (`localStorage`). Não há servidor de autenticação.

## Stack

Angular 20, Tailwind CSS, Font Awesome e Docker (Ollama).

## Como rodar

1. Suba o Ollama e baixe o modelo:

   ```bash
   docker compose up -d
   docker exec -it ollama ollama pull tinyllama
   ```

2. Rode o front:

   ```bash
   npm install
   npm start
   ```

Abra `http://localhost:4200`. O front fala com o Ollama em `http://localhost:11434`.
