import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import QRCode from 'qrcode';
import { contenidoEn } from '../contenido/en';
import { contenidoEs } from '../contenido/es';
import { cambiarIdioma, idioma, t } from '../i18n';
import {
  agregarJugador,
  avanzar,
  claveDe,
  cerrarEscritura,
  faltanResponder,
  faltanVotar,
  iniciar,
  MAX_JUGADORES,
  MIN_JUGADORES,
  Modo,
  nuevaPartida,
  Opcion,
  Partida,
  puedenVotar,
  puntosPorOpcion,
  puntuar,
  quitarJugador,
  ranking,
  responder,
  volverAlLobby,
  votar,
} from '../juego/motor';
import { colorDe, imagen, partesConsigna } from '../juego/personajes';
import { contar } from '../juego/analitica';
import { idJefe, MsgJugador, resumen, vistaPara } from '../juego/protocolo';
import { compartirTarjeta } from '../juego/tarjeta';
import { Anfitrion } from '../juego/red';
import { alternarSonido, sfx, sonidoActivo } from '../juego/sonido';

const SEG = 1000;
const TIEMPO = { chamuyo: 75 * SEG, ocurrencias: 60 * SEG, votar: 35 * SEG, paso: 3400, tabla: 7000 };

@Component({
  selector: 'app-anfitrion',
  templateUrl: './anfitrion.html',
  styleUrl: './anfitrion.css',
})
export class PantallaAnfitrion implements OnInit, OnDestroy {
  private sanitizer = inject(DomSanitizer);
  protected readonly t = t;
  protected readonly idioma = idioma;
  protected readonly sonidoActivo = sonidoActivo;
  protected readonly colorDe = colorDe;
  protected readonly imagen = imagen;
  protected readonly partes = partesConsigna;
  protected readonly max = MAX_JUGADORES;
  protected readonly min = MIN_JUGADORES;

  protected partida = signal<Partida>(nuevaPartida());
  protected codigo = signal<string | null>(null);
  protected error = signal<string | null>(null);
  protected qr = signal<SafeHtml | null>(null);
  protected modo = signal<Modo>('mixto');
  protected rondas = signal(6);
  protected fin = signal(0);
  protected ahora = signal(Date.now());
  protected paso = signal(-1);
  protected copiado = signal(false);
  protected compartiendo = signal(false);

  private red = new Anfitrion({
    abierta: (codigo) => this.alAbrir(codigo),
    mensaje: (c, m) => this.alMensaje(c, m),
    cerrada: (c) => this.alCerrar(c),
    error: () => this.error.set(t().errorSala),
  });
  private jugadorDe = new Map<string, string>();
  private programado: ReturnType<typeof setTimeout> | null = null;
  private reloj: ReturnType<typeof setInterval> | null = null;
  private wakeLock: { release(): Promise<void> } | null = null;

  protected restante = computed(() => Math.max(0, this.fin() - this.ahora()));
  protected segundos = computed(() => Math.ceil(this.restante() / SEG));
  protected ronda = computed(() => this.partida().ronda);
  protected jugadores = computed(() => this.partida().jugadores);
  protected ordenados = computed(() => ranking(this.partida()));
  protected vacios = computed(() =>
    Array.from({ length: Math.max(0, MAX_JUGADORES - this.jugadores().length) }, (_, i) => i),
  );
  protected listos = computed(() => {
    const p = this.partida();
    if (p.fase === 'escribir') return new Set(p.jugadores.map((j) => j.id).filter((id) => !faltanResponder(p).includes(id)));
    if (p.fase === 'votar') {
      const pueden = puedenVotar(p);
      return new Set(p.jugadores.map((j) => j.id).filter((id) => !pueden.includes(id) || id in (p.ronda?.votos ?? {})));
    }
    return new Set<string>();
  });
  /** Orden en que se revelan las opciones: de menos a más votadas y la verdad al final. */
  protected ordenRevelar = computed<Opcion[]>(() => {
    const r = this.ronda();
    if (!r) return [];
    const ops = [...r.opciones].sort((a, b) => a.votantes.length - b.votantes.length);
    if (r.tipo === 'ocurrencias') return ops;
    return [...ops.filter((o) => !o.verdad && o.votantes.length), ...ops.filter((o) => o.verdad)];
  });
  protected urlCorta = computed(() => `${location.host}${location.pathname.replace(/\/$/, '')}`);
  protected urlSala = computed(() => `${location.origin}${location.pathname}?sala=${this.codigo() ?? ''}`);

  ngOnInit(): void {
    this.red.abrir();
    this.reloj = setInterval(() => this.tic(), 250);
    void this.mantenerPantalla();
  }

  ngOnDestroy(): void {
    this.red.cerrar();
    if (this.reloj) clearInterval(this.reloj);
    this.cancelar();
    void this.wakeLock?.release();
  }

  protected nombreDe(id: string): string {
    return this.jugadores().find((j) => j.id === id)?.nombre ?? '';
  }

  protected avatarDe(id: string): string {
    return this.jugadores().find((j) => j.id === id)?.avatar ?? '';
  }

  protected revelada(o: Opcion): boolean {
    const i = this.ordenRevelar().indexOf(o);
    return i !== -1 && i <= this.paso();
  }

  protected puntosDe(o: Opcion): number {
    const r = this.ronda();
    return r ? puntosPorOpcion(r, o) : 0;
  }

  protected reintentar(): void {
    this.error.set(null);
    this.red.cerrar();
    this.red.abrir();
  }

  protected idiomaContrario(): void {
    cambiarIdioma(idioma() === 'es' ? 'en' : 'es');
  }

  protected alternarSonido(): void {
    alternarSonido();
  }

  protected pantallaCompleta(): void {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  }

  protected async copiarEnlace(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.urlSala());
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    } catch {
      /* el usuario puede leer el enlace en pantalla */
    }
  }

  protected empezar(modo: Modo = this.modo()): void {
    const p = this.partida();
    if (p.fase !== 'lobby' || p.jugadores.length < MIN_JUGADORES) return;
    this.modo.set(modo);
    const contenido = idioma() === 'es' ? contenidoEs : contenidoEn;
    const usados = leerUsados();
    const nueva = iniciar(p, modo, this.rondas(), contenido, Math.random, usados);
    guardarUsados([...usados, ...nueva.plan.map(claveDe)]);
    this.partida.set(nueva);
    contar(`partida-empezada/${modo}`);
    this.entrarEscribir();
  }

  protected async compartir(): Promise<void> {
    if (this.compartiendo()) return;
    this.compartiendo.set(true);
    try {
      await compartirTarjeta(resumen(this.partida()));
      contar('resultado-compartido/pantalla');
    } finally {
      this.compartiendo.set(false);
    }
  }

  protected jugarOtra(): void {
    this.cancelar();
    this.partida.update(volverAlLobby);
    this.paso.set(-1);
    this.difundir();
  }

  // ---- red ----

  private alAbrir(codigo: string): void {
    this.codigo.set(codigo);
    contar('sala-creada');
    QRCode.toString(this.urlSala(), {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#131215', light: '#00000000' },
    }).then((svg) => this.qr.set(this.sanitizer.bypassSecurityTrustHtml(svg)));
  }

  private alMensaje(conexion: string, msg: MsgJugador): void {
    if (msg.t === 'hola') {
      const antes = this.partida();
      const despues = agregarJugador(antes, { id: msg.id, nombre: msg.nombre, avatar: msg.avatar });
      this.jugadorDe.set(conexion, msg.id);
      if (despues.jugadores.length > antes.jugadores.length) {
        sfx.entra();
        contar('jugador-unido');
      }
      this.partida.set(despues);
      this.difundir();
      return;
    }
    const id = this.jugadorDe.get(conexion);
    if (!id) return;
    const p = this.partida();
    switch (msg.t) {
      case 'responder':
        this.partida.set(responder(p, id, msg.texto));
        sfx.listo();
        if (!faltanResponder(this.partida()).length) this.programar(() => this.cerrarEscritura(), 700);
        break;
      case 'votar':
        this.partida.set(votar(p, id, msg.opcion));
        sfx.listo();
        if (!faltanVotar(this.partida()).length) this.programar(() => this.cerrarVotacion(), 700);
        break;
      case 'empezar':
        if (idJefe(p) === id) this.empezar(msg.modo);
        return;
      case 'otra':
        if (idJefe(p) === id && p.fase === 'final') this.jugarOtra();
        return;
    }
    this.difundir();
  }

  private alCerrar(conexion: string): void {
    const id = this.jugadorDe.get(conexion);
    this.jugadorDe.delete(conexion);
    if (!id || [...this.jugadorDe.values()].includes(id)) return;
    this.partida.update((p) => quitarJugador(p, id));
    const p = this.partida();
    if (p.fase === 'escribir' && !faltanResponder(p).length) this.programar(() => this.cerrarEscritura(), 700);
    if (p.fase === 'votar' && !faltanVotar(p).length) this.programar(() => this.cerrarVotacion(), 700);
    this.difundir();
  }

  private difundir(): void {
    const p = this.partida();
    const restante = this.restante();
    for (const [conexion, id] of this.jugadorDe) this.red.enviar(conexion, vistaPara(p, id, restante));
  }

  // ---- ritmo de la partida ----

  private entrarEscribir(): void {
    const r = this.partida().ronda;
    if (!r) return this.terminar();
    this.paso.set(-1);
    this.fin.set(Date.now() + (r.tipo === 'chamuyo' ? TIEMPO.chamuyo : TIEMPO.ocurrencias));
    this.programar(() => this.cerrarEscritura(), this.restante());
    sfx.fase();
    this.difundir();
  }

  private cerrarEscritura(): void {
    this.partida.update((p) => cerrarEscritura(p, Math.random));
    if (this.partida().fase === 'votar') {
      this.fin.set(Date.now() + TIEMPO.votar);
      this.programar(() => this.cerrarVotacion(), TIEMPO.votar);
      sfx.fase();
      this.difundir();
    } else {
      this.revelar();
    }
  }

  private cerrarVotacion(): void {
    if (this.partida().fase !== 'votar') return;
    this.partida.update(puntuar);
    this.revelar();
  }

  private revelar(): void {
    this.fin.set(0);
    this.paso.set(-1);
    this.difundir();
    const total = this.ordenRevelar().length;
    const siguientePaso = (i: number) => {
      if (i >= total) {
        this.programar(() => this.mostrarTabla(), total ? 2600 : 600);
        return;
      }
      this.paso.set(i);
      const o = this.ordenRevelar()[i];
      if (o.verdad) sfx.verdad();
      else sfx.revela();
      if (this.puntosDe(o) > 0) setTimeout(() => sfx.puntos(), 900);
      this.programar(() => siguientePaso(i + 1), TIEMPO.paso);
    };
    this.programar(() => siguientePaso(0), 900);
  }

  private mostrarTabla(): void {
    this.partida.update((p) => avanzar(p, Math.random));
    this.difundir();
    this.programar(() => {
      this.partida.update((p) => avanzar(p, Math.random));
      if (this.partida().fase === 'final') this.terminar();
      else this.entrarEscribir();
    }, TIEMPO.tabla);
  }

  private terminar(): void {
    this.cancelar();
    contar('partida-terminada');
    this.fin.set(0);
    sfx.fanfarria();
    this.difundir();
  }

  private programar(fn: () => void, ms: number): void {
    this.cancelar();
    this.programado = setTimeout(() => {
      this.programado = null;
      fn();
    }, ms);
  }

  private cancelar(): void {
    if (this.programado) clearTimeout(this.programado);
    this.programado = null;
  }

  private tic(): void {
    const antes = this.segundos();
    this.ahora.set(Date.now());
    const s = this.segundos();
    const fase = this.partida().fase;
    if (s !== antes && s > 0 && s <= 5 && (fase === 'escribir' || fase === 'votar')) sfx.tic();
  }

  private async mantenerPantalla(): Promise<void> {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } };
      this.wakeLock = (await nav.wakeLock?.request('screen')) ?? null;
    } catch {
      /* no todos los navegadores lo permiten */
    }
  }
}

/** Lo que ya salió en partidas anteriores de esta pantalla, para no repetirlo enseguida. */
const CLAVE_USADOS = 'chamuyo-usados';

function leerUsados(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE_USADOS) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function guardarUsados(claves: string[]): void {
  try {
    localStorage.setItem(CLAVE_USADOS, JSON.stringify([...new Set(claves)].slice(-400)));
  } catch {
    /* sin almacenamiento */
  }
}
