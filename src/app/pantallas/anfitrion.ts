import { Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import QRCode from 'qrcode';
import { cargarContenido } from '../contenido/cargar';
import { Garabato } from '../juego/garabato';
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
  minimoPara,
  cerrarDibujos,
  faltanDibujar,
  guardarDibujo,
  Ronda,
  Trazo,
  VUELTAS_IMPOSTOR,
  Modo,
  nuevaPartida,
  Opcion,
  Partida,
  puedenVotar,
  puntosPorOpcion,
  puntuar,
  resultadoMinijuego,
  quitarJugador,
  ranking,
  responder,
  volverAlLobby,
  votar,
} from '../juego/motor';
import { colorDe, imagen, partesConsigna } from '../juego/personajes';
import { contar } from '../juego/analitica';
import { dibujar, Recursos } from '../minijuegos/dibujo';
import { crear, Entrada, EstadoMinijuego, paso as pasoMinijuego, puestos, vivos } from '../minijuegos/juegos';
import type { EscenaAgua } from '../minijuegos/agua3d';
import { EtapaMinijuego, idJefe, MsgJugador, resumen, vistaPara } from '../juego/protocolo';
import { compartirTarjeta } from '../juego/tarjeta';
import { Anfitrion } from '../juego/red';
import { alternarSonido, sfx, sonidoActivo } from '../juego/sonido';

const SEG = 1000;
const TIEMPO = { chamuyo: 75 * SEG, ocurrencias: 60 * SEG, impostor: 45 * SEG, garabato: 50 * SEG, dibujar: 90 * SEG, votar: 35 * SEG, paso: 3400, tabla: 7000 };

@Component({
  selector: 'app-anfitrion',
  templateUrl: './anfitrion.html',
  styleUrl: './anfitrion.css',
  imports: [Garabato],
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
  protected readonly vueltasImpostor = VUELTAS_IMPOSTOR;
  protected minimo = computed(() => minimoPara(this.modo()));
  private arrancando = false;

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
  protected etapaMinijuego = signal<EtapaMinijuego>('intro');
  protected readonly modos: Modo[] = ['mixto', 'chamuyo', 'ocurrencias', 'impostor', 'garabatos', 'minijuegos'];
  private lienzo = viewChild<ElementRef<HTMLCanvasElement>>('lienzo');
  private marco = viewChild<ElementRef<HTMLElement>>('marco');
  /** Escena 3D de Al agua; three.js se baja recién cuando toca ese juego. */
  private escena3d: EscenaAgua | null = null;
  private modulo3d: Promise<typeof import('../minijuegos/agua3d')> | null = null;
  private estadoMj: EstadoMinijuego | null = null;
  private entradas: Record<string, Entrada> = {};
  private cuadro: number | null = null;
  private ultimoCuadro = 0;
  private imagenes = new Map<string, HTMLImageElement>();
  private recursos: Recursos = {
    avatar: (id) => this.imagenDe(imagen(this.avatarDe(id))),
    nombre: (id) => this.nombreDe(id),
    color: (id) => colorDe(this.avatarDe(id)),
    empanadas: [1, 2, 3, 4].map((i) => this.imagenDe(`arte/minijuegos/empanada-${i}.webp`)),
    fondos: {
      empanadas: this.imagenDe('arte/minijuegos/fondo-empanadas.webp'),
      patio: this.imagenDe('arte/minijuegos/fondo-patio.webp'),
      papa: this.imagenDe('arte/minijuegos/fondo-papa.webp'),
      serpentina: this.imagenDe('arte/minijuegos/fondo-serpentina.webp'),
    },
    papa: this.imagenDe('arte/minijuegos/papa-caliente.webp'),
    textos: {
      get esperaYa() {
        return t().esperaYa;
      },
      get ya() {
        return t().ya;
      },
      get nadie() {
        return t().nadie;
      },
      get ganoSub() {
        return t().ganoSub;
      },
      get afuera() {
        return t().afuera;
      },
      get boom() {
        return t().boom;
      },
      get contaEnTuCabeza() {
        return t().contaEnTuCabeza;
      },
      get tocaALos() {
        return t().tocaALos;
      },
      get sinTocar() {
        return t().sinTocar;
      },
      get quedan() {
        return t().quedan;
      },
    },
    capa3d: false,
  };

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
  protected empate = computed(() => {
    const o = this.ordenados();
    return o.length > 1 && o[0].puntos === o[1].puntos;
  });
  protected vacios = computed(() =>
    Array.from({ length: Math.max(0, MAX_JUGADORES - this.jugadores().length) }, (_, i) => i),
  );
  protected listos = computed(() => {
    const p = this.partida();
    if (p.fase === 'dibujar') return new Set(p.dibujosListos);
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
    // El contenido se va bajando mientras la sala espera jugadores.
    void cargarContenido(idioma());
    this.red.abrir();
    this.reloj = setInterval(() => this.tic(), 250);
    void this.mantenerPantalla();
  }

  protected nombreModo(m: Modo): string {
    const x = t();
    return {
      mixto: x.modoMixto,
      chamuyo: x.modoChamuyo,
      ocurrencias: x.modoOcurrencias,
      minijuegos: x.modoMinijuegos,
      impostor: x.modoImpostor,
      garabatos: x.modoGarabatos,
    }[m];
  }

  protected descModo(m: Modo): string {
    const x = t();
    return {
      mixto: x.modoMixtoDesc,
      chamuyo: x.modoChamuyoDesc,
      ocurrencias: x.modoOcurrenciasDesc,
      minijuegos: x.modoMinijuegosDesc,
      impostor: x.modoImpostorDesc,
      garabatos: x.modoGarabatosDesc,
    }[m];
  }

  ngOnDestroy(): void {
    this.detenerCuadros();
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

  protected async empezar(modo: Modo = this.modo()): Promise<void> {
    if (this.arrancando || this.partida().fase !== 'lobby' || this.partida().jugadores.length < minimoPara(modo)) return;
    this.arrancando = true;
    let contenido;
    try {
      contenido = await cargarContenido(idioma());
    } finally {
      this.arrancando = false;
    }
    // Mientras bajaba el contenido pudo irse alguien o cambiar algo: se vuelve a mirar.
    const p = this.partida();
    if (p.fase !== 'lobby' || p.jugadores.length < minimoPara(modo)) return;
    this.modo.set(modo);
    const usados = leerUsados();
    const nueva = iniciar(p, modo, this.rondas(), contenido, Math.random, usados);
    guardarUsados([...usados, ...nueva.plan.filter((x) => x.tipo !== 'minijuego').map(claveDe)]);
    if (nueva.fase === 'lobby') return;
    this.partida.set(nueva);
    contar(`partida-empezada/${modo}`);
    if (nueva.fase === 'dibujar') this.entrarDibujar();
    else this.entrarEscribir();
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
    this.detenerCuadros();
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
      case 'dibujo':
        this.partida.set(guardarDibujo(p, id, msg.trazos, !!msg.listo));
        if (msg.listo) sfx.listo();
        if (this.partida().fase === 'dibujar' && !faltanDibujar(this.partida()).length) this.programar(() => this.cerrarDibujo(), 900);
        // Solo hace falta avisarle a los celulares cuando alguien termina.
        if (!msg.listo) return;
        break;
      case 'votar':
        this.partida.set(votar(p, id, msg.opcion));
        sfx.listo();
        if (!faltanVotar(this.partida()).length) this.programar(() => this.cerrarVotacion(), 700);
        break;
      case 'empezar':
        if (idJefe(p) === id) this.empezar(msg.modo);
        return;
      case 'mando':
        this.entrada(id).x = Math.max(-1, Math.min(1, Number(msg.x) || 0));
        this.entrada(id).y = Math.max(-1, Math.min(1, Number(msg.y) || 0));
        return;
      case 'toque':
        this.entrada(id).toques += 1;
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
    for (const [conexion, id] of this.jugadorDe) this.red.enviar(conexion, vistaPara(p, id, restante, this.etapaMinijuego()));
  }

  // ---- ritmo de la partida ----

  private entrarEscribir(): void {
    const r = this.partida().ronda;
    if (!r) return this.terminar();
    if (r.tipo === 'minijuego') return this.entrarMinijuego();
    this.paso.set(-1);
    this.fin.set(Date.now() + (r.tipo === 'chamuyo' ? TIEMPO.chamuyo : r.tipo === 'impostor' ? TIEMPO.impostor : r.tipo === 'garabato' ? TIEMPO.garabato : TIEMPO.ocurrencias));
    this.programar(() => this.cerrarEscritura(), this.restante());
    sfx.fase();
    this.difundir();
  }

  // ---- garabatos ----

  private entrarDibujar(): void {
    this.paso.set(-1);
    this.fin.set(Date.now() + TIEMPO.dibujar);
    this.programar(() => this.cerrarDibujo(), TIEMPO.dibujar);
    sfx.fase();
    this.difundir();
  }

  private cerrarDibujo(): void {
    if (this.partida().fase !== 'dibujar') return;
    this.partida.update((p) => cerrarDibujos(p, Math.random));
    if (this.partida().fase === 'final') return this.terminar();
    this.entrarEscribir();
  }

  protected dibujoDe(id: string | null): Trazo[] {
    return id ? (this.partida().dibujos[id] ?? []) : [];
  }

  /** En Chamuyo y en Garabatos hay una opción verdadera y las demás son mentiras. */
  protected esChamuyo(r: Ronda): boolean {
    return r.tipo === 'chamuyo' || r.tipo === 'garabato';
  }

  private cerrarEscritura(): void {
    this.partida.update((p) => cerrarEscritura(p, Math.random));
    // Impostor: después de la primera vuelta de pistas viene la segunda.
    if (this.partida().fase === 'escribir') return this.entrarEscribir();
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
    if (this.ronda()?.tipo === 'impostor') return this.revelarImpostor();
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

  /** Impostor: primero se ve quién votó a quién; después, quién era y la palabra. */
  private revelarImpostor(): void {
    this.programar(() => {
      this.paso.set(0);
      if (this.ronda()?.descubierto) sfx.verdad();
      else sfx.revela();
      setTimeout(() => sfx.puntos(), 1200);
      this.programar(() => this.mostrarTabla(), 6000);
    }, 3200);
  }

  /** A quién votó un jugador en la ronda de Impostor. */
  protected votoDe(id: string): string | null {
    const r = this.ronda();
    const op = r?.votos[id];
    return op ? (r!.opciones.find((o) => o.id === op)?.autores[0] ?? null) : null;
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

  // ---- minijuegos ----

  private entrarMinijuego(): void {
    this.paso.set(-1);
    this.fin.set(0);
    this.etapaMinijuego.set('intro');
    this.estadoMj = null;
    // Para Al agua, three.js se va bajando mientras dura la presentación.
    if (this.partida().ronda?.minijuego === 'agua') this.modulo3d ??= import('../minijuegos/agua3d');
    sfx.fase();
    this.difundir();
    this.programar(() => this.comenzarMinijuego(), 4500);
  }

  private comenzarMinijuego(): void {
    const r = this.partida().ronda;
    if (!r?.minijuego) return;
    const ids = this.jugadores().filter((j) => j.conectado).map((j) => j.id);
    this.estadoMj = crear(r.minijuego, ids, Math.random);
    this.entradas = {};
    if (r.minijuego === 'agua') void this.montar3d(ids);
    this.etapaMinijuego.set('jugando');
    sfx.fase();
    this.difundir();
    this.ultimoCuadro = performance.now();
    this.cuadro = requestAnimationFrame((ahora) => this.avanzarCuadro(ahora));
  }

  private avanzarCuadro(ahora: number): void {
    const e = this.estadoMj;
    if (!e) return;
    // El juego sigue el tiempo real aunque la pantalla dibuje pocos cuadros: si pasó mucho desde
    // el último, se avanza en pasos cortos (y como mucho un segundo, por si la pestaña
    // estuvo en segundo plano).
    let falta = Math.min(1, Math.max(0, (ahora - this.ultimoCuadro) / 1000));
    this.ultimoCuadro = ahora;
    const antes = e.id === 'ahora' ? e.etapa : null;
    const revelabaDiez = e.id === 'diez' && e.revelarDesde !== null;
    const vivosAntes = vivos(e);
    do {
      const dt = Math.min(1 / 30, falta);
      pasoMinijuego(e, dt, this.entradas, Math.random);
      // Los toques cuentan una sola vez.
      for (const entrada of Object.values(this.entradas)) entrada.toques = 0;
      falta -= dt;
    } while (falta > 0 && !e.fin);
    if (e.id === 'ahora' && antes !== e.etapa && e.etapa === 'ya') sfx.verdad();
    if (e.id === 'diez' && !revelabaDiez && e.revelarDesde !== null) sfx.verdad();
    // Alguien quedó afuera (empanada, agua, papa o choque).
    if (vivosAntes !== null && (vivos(e) ?? 0) < vivosAntes) sfx.revela();
    if (e.id === 'agua') this.escena3d?.dibujar(e);
    const ctx = this.lienzo()?.nativeElement.getContext('2d');
    if (ctx) dibujar(ctx, e, this.recursos);
    if (e.fin) this.terminarMinijuego();
    else this.cuadro = requestAnimationFrame((t2) => this.avanzarCuadro(t2));
  }

  private terminarMinijuego(): void {
    this.detenerCuadros();
    if (!this.estadoMj) return;
    const final = puestos(this.estadoMj);
    this.partida.update((p) => resultadoMinijuego(p, final));
    this.etapaMinijuego.set('resultado');
    sfx.fanfarria();
    this.difundir();
    this.programar(() => this.mostrarTabla(), 5000);
  }

  private detenerCuadros(): void {
    if (this.cuadro !== null) cancelAnimationFrame(this.cuadro);
    this.cuadro = null;
    this.escena3d?.destruir();
    this.escena3d = null;
    this.recursos.capa3d = false;
  }

  /** Arma la pileta en 3D detrás del lienzo. Sin WebGL, el juego sigue en la versión plana. */
  private async montar3d(ids: string[]): Promise<void> {
    try {
      const { EscenaAgua } = await (this.modulo3d ??= import('../minijuegos/agua3d'));
      const marco = this.marco()?.nativeElement;
      if (!marco || this.estadoMj?.id !== 'agua' || this.estadoMj.fin || this.escena3d) return;
      this.escena3d = new EscenaAgua(marco, ids, {
        url: (id) => imagen(this.avatarDe(id)),
        color: (id) => colorDe(this.avatarDe(id)),
      });
      this.recursos.capa3d = true;
    } catch {
      this.escena3d = null;
      this.recursos.capa3d = false;
    }
  }

  private entrada(id: string): Entrada {
    return (this.entradas[id] ??= { x: 0, y: 0, toques: 0 });
  }

  private imagenDe(src: string): HTMLImageElement {
    let im = this.imagenes.get(src);
    if (!im) {
      im = new Image();
      im.src = src;
      this.imagenes.set(src, im);
    }
    return im;
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
