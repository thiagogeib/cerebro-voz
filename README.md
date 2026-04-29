# 🗣️ cerebro-voz

Interface de Comunicação Aumentativa (AAC) com IA para pessoas com afasia progressiva primária.

Desenvolvido para um familiar com Demência Frontotemporal + APP — onde a cognição está intacta mas a fala está comprometida.

## O que faz

- **Grade de palavras/símbolos** organizadas por categoria (família, necessidades, sentimentos, ações, memórias)
- **Voz sintetizada** em pt-BR via Web Speech API (gratuita, nativa do Chrome)
- **IA que completa frases** — o usuário toca em palavras e a IA gera uma frase humanizada e contextual
- **Contexto pessoal** — você escreve memórias, família e hábitos da pessoa; a IA usa isso para sugerir frases mais próximas da realidade dela

## Como rodar localmente

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/cerebro-voz.git
cd cerebro-voz

# 2. Instale as dependências
npm install

# 3. Configure a chave da API
cp .env.example .env
# Edite o .env e coloque sua chave do Anthropic
# https://console.anthropic.com/settings/keys

# 4. Rode
npm run dev
```

## Deploy no GitHub Pages

1. Suba o código no GitHub
2. Vá em **Settings → Secrets → Actions** e adicione:
   - `VITE_ANTHROPIC_KEY` = sua chave do Anthropic
3. Vá em **Settings → Pages** e escolha **GitHub Actions** como source
4. Faça um push para `main` — o deploy acontece automaticamente

URL final: `https://SEU_USUARIO.github.io/cerebro-voz/`

## Voz no celular

A Web Speech API funciona melhor no **Chrome para Android**. Abra o link no Chrome, não em WebView ou outros browsers.

## Próximas etapas

- [ ] Integração com Obsidian via plugin
- [ ] Suporte a eye tracking
- [ ] Modo offline (PWA)
- [ ] Conexão com sinais EEG do capacete
