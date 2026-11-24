<div align="center">

<a href="https://nahuelbenitezs.github.io/chamuyo/"><img src="public/og.jpg" alt="Chamuyo: the party game where you fool your friends" width="100%" /></a>

# Chamuyo

**The party game where you fool your friends.**
One shared screen, everyone plays on their phone. 2 to 8 players, in English or Spanish. Free, nothing to install, no accounts.

**[▶ Play now](https://nahuelbenitezs.github.io/chamuyo/)** · [Español](#español)

</div>

## How to play

1. **Open a room** on a TV or a computer. Sharing your screen on a video call works too.
2. **Join from your phone** by scanning the QR code or typing the 4-letter code.
3. **Fool everyone.** Write believable lies, vote for the truth and laugh at everyone else's answers.

### Modes

- **Chamuyo.** A real fact with a blank: *"Octopuses have ___ hearts."* Everyone makes up a fake answer, then all the answers are mixed with the real one. You score by finding the truth and by fooling your friends with your lie.
- **Wisecracks.** A prompt, everyone answers, and the funniest one wins the votes.
- **Mixed.** One round of each, taking turns. The last round is worth double.

## How it works

- **No game server.** The screen that opens the room runs the whole game. Phones connect to it directly over WebRTC with [PeerJS](https://peerjs.com/); its public server only introduces the devices to each other.
- **Angular 22** with signals and zoneless change detection.
- **The game rules are pure functions** in [`src/app/juego/motor.ts`](src/app/juego/motor.ts), tested with Vitest.
- **Sound effects are synthesized** with the Web Audio API, so there are no audio files.
- **Characters** are original stickers; [`scripts/recortar-arte.py`](scripts/recortar-arte.py) cuts them out of the source sheets.
- **Every phone gets only what it needs to see**: the screen sends each player their own view ([`protocolo.ts`](src/app/juego/protocolo.ts)), so nobody can peek at other players' answers.

## Run it locally

```bash
npm install
npm start        # http://localhost:4200
npm test         # game engine tests
```

Open the room in one tab and join from other tabs or from your phone on the same network.

## Add prompts and facts

All the content lives in [`src/app/contenido`](src/app/contenido), one file per language. Pull requests with new prompts are welcome. For facts, include a reliable source in the pull request: every fact in the game has to be true.

## License

[MIT](LICENSE). Made by [Nahuel Benítez](https://github.com/nahuelbenitezs).

---

## Español

**El juego de fiesta para engañar a tus amigos.** Una pantalla para todos y cada uno juega desde su celular. De 2 a 8 personas, en español o inglés. Gratis, sin instalar nada y sin cuentas.

**[▶ Jugar ahora](https://nahuelbenitezs.github.io/chamuyo/)**

### Cómo se juega

1. **Abrí una sala** en la tele o la compu. También funciona compartiendo pantalla en una videollamada.
2. **Entrá desde el celular** escaneando el QR o con el código de 4 letras.
3. **Chamuyá.** Escribí mentiras creíbles, votá la verdad y reíte de las respuestas de los demás.

### Modos

- **Chamuyo.** Un dato real con un hueco: *"Los pulpos tienen ___ corazones."* Cada uno inventa una respuesta falsa y después se mezclan con la verdadera. Sumás puntos si encontrás la verdad y por cada amigo que cae en tu mentira.
- **Ocurrencias.** Una consigna, todos responden y se vota la más graciosa.
- **Mixto.** Una ronda de cada, alternadas. La última vale doble.

### Cómo funciona

No hay servidor de juego: la pantalla que abre la sala maneja toda la partida y los celulares se conectan directo a ella por WebRTC con PeerJS. Está hecho con Angular 22, y las reglas del juego son funciones puras con tests en Vitest.
