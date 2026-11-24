// Conexión entre la pantalla anfitriona y los celulares con PeerJS (WebRTC).
// No hay servidor propio: el servidor público de PeerJS solo presenta a las partes.
import Peer, { DataConnection } from 'peerjs';
import { codigoSala, MsgJugador, PREFIJO_SALA, Vista } from './protocolo';

export interface EventosAnfitrion {
  abierta(codigo: string): void;
  mensaje(conexion: string, msg: MsgJugador): void;
  cerrada(conexion: string): void;
  error(motivo: string): void;
}

export class Anfitrion {
  private peer: Peer | null = null;
  private conexiones = new Map<string, DataConnection>();
  private intentos = 0;

  constructor(private eventos: EventosAnfitrion) {}

  abrir(): void {
    const codigo = codigoSala();
    const peer = new Peer(PREFIJO_SALA + codigo);
    this.peer = peer;
    peer.on('open', () => {
      this.intentos = 0;
      this.eventos.abierta(codigo);
    });
    peer.on('connection', (c) => {
      c.on('open', () => this.conexiones.set(c.connectionId, c));
      c.on('data', (d) => this.eventos.mensaje(c.connectionId, d as MsgJugador));
      const cerrar = () => {
        if (this.conexiones.delete(c.connectionId)) this.eventos.cerrada(c.connectionId);
      };
      c.on('close', cerrar);
      c.on('error', cerrar);
    });
    peer.on('disconnected', () => {
      if (!peer.destroyed) peer.reconnect();
    });
    peer.on('error', (e) => {
      if (e.type === 'unavailable-id' && this.intentos++ < 5) {
        peer.destroy();
        this.abrir();
      } else if (e.type !== 'peer-unavailable') {
        this.eventos.error(e.type);
      }
    });
  }

  enviar(conexion: string, vista: Vista): void {
    const c = this.conexiones.get(conexion);
    if (c?.open) c.send(vista);
  }

  cerrar(): void {
    this.peer?.destroy();
    this.conexiones.clear();
  }
}

export interface EventosCliente {
  estado(estado: 'conectando' | 'conectado' | 'sin-sala' | 'caido'): void;
  vista(v: Vista): void;
}

export class Cliente {
  private peer: Peer | null = null;
  private conexion: DataConnection | null = null;
  private reintento: ReturnType<typeof setTimeout> | null = null;
  private terminado = false;

  constructor(
    private codigo: string,
    private saludo: () => MsgJugador,
    private eventos: EventosCliente,
  ) {}

  conectar(): void {
    this.eventos.estado('conectando');
    if (!this.peer || this.peer.destroyed) {
      this.peer = new Peer();
      this.peer.on('error', (e) => {
        if (e.type === 'peer-unavailable') {
          this.terminado = true;
          this.eventos.estado('sin-sala');
        } else this.caer();
      });
    }
    const peer = this.peer;
    const unir = () => {
      const c = peer.connect(PREFIJO_SALA + this.codigo, { reliable: true });
      this.conexion = c;
      c.on('open', () => {
        this.eventos.estado('conectado');
        c.send(this.saludo());
      });
      c.on('data', (d) => this.eventos.vista(d as Vista));
      c.on('close', () => this.caer());
      c.on('error', () => this.caer());
    };
    if (peer.open) unir();
    else peer.once('open', unir);
  }

  private caer(): void {
    if (this.terminado || this.reintento) return;
    this.eventos.estado('caido');
    this.reintento = setTimeout(() => {
      this.reintento = null;
      if (this.peer?.disconnected) this.peer.reconnect();
      this.conectar();
    }, 1500);
  }

  enviar(msg: MsgJugador): void {
    if (this.conexion?.open) this.conexion.send(msg);
  }

  cerrar(): void {
    this.terminado = true;
    if (this.reintento) clearTimeout(this.reintento);
    this.peer?.destroy();
  }
}
