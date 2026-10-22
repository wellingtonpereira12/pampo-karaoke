# 🎤 Pampo Karaokê

> **O Seu Palco Inteligente**: Sistema profissional de karaokê web com suporte a múltiplos microfones, efeitos de voz em tempo real (Reverb, Delay, Estúdio, Megafone, Robô), mixagem de saída de áudio e busca inteligente integrada do YouTube com letras.

---

## ✨ Principais Funcionalidades

- **Múltiplos Microfones Simultâneos**: Conecte 1, 2 ou quantos microfones quiser (`Microfone 1`, `Microfone 2`, etc.) através do botão minimalist `+`.
- **Mixer com Retorno em Tempo Real**: Ouça sua voz saindo diretamente nas caixas de som com baixíssima latência (Web Audio API). Você pode ativar ou desativar o retorno individualmente por microfone.
- **VU Meter Reativo com Anel Verde**: Indicador visual dinâmico com anel luminoso pulsante e medidor de decibéis em tempo real conforme você canta.
- **Roteamento de Caixas de Som**: Escolha a saída de áudio desejada (alto-falantes do PC, caixas Bluetooth, interfaces USB ou TV HDMI) com controle de volume master.
- **Busca Integrada estilo "Escolha seu som"**: Barra central intuitiva onde você só precisa digitar o nome da música e o sistema automaticamente encontra as melhores versões de karaokê com letra (não precisa digitar "karaoke"). Também aceita qualquer link direto do YouTube!
- **Palco / Player em Tela Cheia**: Tela gigante e limpa para leitura fácil das letras mesmo à distância, com botão de aplausos/chuva de confetes (`canvas-confetti`).
- **Rack de Efeitos de Voz Profissionais**:
  - 🌟 **Karaokê Show**: O reverb clássico e aveludado de shows ao vivo com compressor dinâmico para suavizar picos.
  - 🎙️ **Estúdio Cristal**: Voz nítida, de alta definição, com realce de agudos e corte de graves indesejados.
  - 🌊 **Eco de Arena**: Delay estéreo sincronizado com repetições suaves no estilo estádio.
  - 🔥 **Mega Voz**: Graves encorpados e calor analógico para timbres graves e médios.
  - 📻 **Rádio / Megafone**: Efeito vintage com filtro passa-faixa estilo ligação telefônica.
  - 🤖 **Robô Cibernético**: Modulação de frequência ring modulation para vozes futuristas.
  - 🔇 **Voz Limpa (Dry)**: Sinal 100% puro e sem efeitos.
  - 🎚️ **Ajuste Fino**: Sliders manuais de Reverb Wet, Eco/Delay, Equalizador (Graves/Médios/Agudos) e Compressor.
- **Design Minimalista & Dark**: Visual moderno em tons grafite/ardósia escuros com foco nos botões circulares e sem excesso de texto.

---

## 🚀 Como Executar

### 1. Modo de Desenvolvimento (Vite com Hot Reload)
```bash
npm install
npm run dev
```
Acesse `http://localhost:5173`.

### 2. Modo de Produção
```bash
npm run build
npm start
```
Acesse `http://localhost:3000`.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Engine de Áudio**: Web Audio API nativo (`MediaStreamAudioSourceNode`, `DynamicsCompressorNode`, `BiquadFilterNode`, `DelayNode`, `ConvolverNode` com resposta ao impulso estereofônica sintetizada via algoritmo, `AnalyserNode` para VU meters e `setSinkId` para alto-falantes).
- **Backend / Proxy**: Node.js, Express, `yt-search`.

---

Desenvolvido para **Pampo Karaokê** 🎶
