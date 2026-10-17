# 🔴 Sussy Marble — Sussy Squad

**Sussy Marble** é um fork do [Blue Marble](https://github.com/SwingTheVine/Wplace-BlueMarble) para o [Wplace.live](https://wplace.live), estilizado para a nossa aliança e com features extra vindas de dois forks:

| Origem | O que veio de lá |
|---|---|
| **Blue Marble** (SwingTheVine) – base v0.95.0 | Overlay de templates, filtro de cores, highlight de pixels, assistente de templates, janelas, definições |
| **Skirk Marble** (Seris0) | Error map, barras de progresso, pesquisa de localizações + favoritos, listas de pixels errados/em falta, conceito da cache de tiles |
| **Userscripts fork** (t-wy, branch `custom-improve`) | Deteção fiável do mapa, vários templates, renomear templates, refresh automático dos tiles, pan com WASD, botões de zoom, coordenadas geográficas, teleporte por cor, compatibilidade Userscripts/bookmarklet, fallback de `OffscreenCanvas` |

## Features novas

- 🟥 **Error map** – pixels errados a vermelho, em falta a amarelo, certos com um ponto verde (Definições → *Sussy Marble*). Respeita o filtro de cores.
- 📊 **Barra de progresso** no topo do ecrã e mini-barra na janela principal (com ETA no tooltip).
- 🔍 **Pesquisa de localizações** (OpenStreetMap/Nominatim), **favoritos** guardados, **ir para coordenadas** (`Tl X, Tl Y, Px X, Px Y` ou `lat, lng`), **ir para o canto do template**.
- 🎯 **Pixel Finder** – lista os pixels errados / em falta dos tiles carregados (os mais próximos do último pixel clicado primeiro) e voa até eles.
- ⚡ **Cache inteligente de tiles** – só reprocessa um tile se o canvas ou alguma definição mudou (chave por hash do conteúdo, nunca mostra tiles velhos).
- 📚 **Vários templates ao mesmo tempo**, com janela para renomear (clica no nome), ir ao canto e apagar.
- 🎯 **Botão em cada cor do filtro** que voa para o pixel por pintar mais próximo dessa cor.
- 🔄 **Refresh automático dos tiles** quando mudas definições, cores ou templates (sem mexer no mapa).
- ⌨️ **WASD** para mover o mapa (opcional, Definições), **botões de zoom** 1x–10x (janela 🔍) e **Lat/Lng** junto às coordenadas do pixel (clica para copiar).
- 📱 **Modo mobile** (Definições → *Sussy Marble*): botões maiores, janelas que cabem no ecrã, cache mais leve. Liga-se sozinho em ecrãs táteis na primeira execução (feito a pensar em Firefox Android + Tampermonkey).
- 🌈 **Filtro de cores:** ordenar por tom ou brilho e esconder as cores já terminadas.
- ⛔ **Suspensão:** contagem decrescente e motivo na janela principal quando a conta está suspensa.
- 📷 **Exportar o canvas** (janela 📚): PNG exato da área do template, ou entre dois cantos.
- 🏷️ **Nome da aliança** configurável (Definições → *Sussy Marble*).
- 🔖 **Bookmarklet** (`dist/SussyMarble.bookmarklet.js`) para quem não usa gestor de userscripts.
- 🔒 **Sem telemetria.** O código de telemetria do original foi removido. O script **não pinta pixels por ti**.

## Instalar

Precisas de um gestor de userscripts (Tampermonkey, Violentmonkey…). Abre o link e confirma a instalação:

**[➡️ Instalar Sussy Marble](https://raw.githubusercontent.com/smelbravo/Wplace-SussyMarble/main/dist/SussyMarble.user.js)**

- O ficheiro termina em `.user.js` (não é `.json`): é isso que faz o gestor mostrar o botão de instalar.
- **Firefox Android + Tampermonkey:** se o link não abrir o instalador, abre o Tampermonkey → *Utilitários* → *Instalar a partir de URL* e cola o link acima.
- **Safari / app Userscripts:** usa `dist/SussyMarble-Standalone.user.js`.
- **Sem gestor:** bookmarklet em `dist/SussyMarble.bookmarklet.min.js`.
- As atualizações chegam sozinhas quando subires a versão (ver abaixo).

## Atualizar

1. Muda `version` em `src/SussyMarble.meta.js` e em `package.json`.
2. `npm run build`
3. Faz commit da pasta `dist/` e dá push. O Tampermonkey atualiza sozinho (ou: *Verificar atualizações*).

## Compilar

```bash
npm install
npm run build      # gera dist/SussyMarble*.js
```

## Notas técnicas

- A minificação **não** muda nomes de propriedades (o original fazia-o); assim as definições guardadas mantêm as chaves entre versões.
- Navegação no mapa: o script obtém a instância do mapa pelo botão "My location" do Wplace (técnica do fork do t-wy) e só aceita uma lista fixa de comandos. Se o Wplace mudar isso e o mapa não for encontrado, abre `?lat=&lng=&zoom=` por URL (recarrega a página).
- Só os tiles carregados são analisados: percorre o template no mapa para o Pixel Finder e a barra de progresso ficarem completos.

## Licença e créditos

[MPL-2.0](LICENSE.txt), como o Blue Marble, o Skirk Marble e o fork Userscripts. Ver [CREDITS.md](docs/CREDITS.md).
Não afiliado ao Wplace.live. Usa por tua conta e risco.
