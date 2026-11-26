import { Component, computed, effect, input, OnDestroy, OnInit, signal, untracked } from '@angular/core';
import { cambiarIdioma, idioma, t } from '../i18n';
import { MAX_LARGO, Modo } from '../juego/motor';
import { colorDe, imagen, nombrePersonaje, personaje, PERSONAJES, partesConsigna } from '../juego/personajes';
import { contar } from '../juego/analitica';
import { codigoValido, Resumen, Vista } from '../juego/protocolo';
import { compartirTarjeta } from '../juego/tarjeta';
import { Cliente } from '../juego/red';

type Conexion = 'fuera' | 'conectando' | 'conectado' | 'sin-sala' | 'caido';

function leer(clave: string): string {
  try {
    return localStorage.getItem(clave) ?? '';
  } catch {
    return '';
  }
}

function guardar(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento */
  }
}

function leerSesion(): string {
  try {
    return sessionStorage.getItem('chamuyo-id') ?? '';
  } catch {
    return '';
  }
}

function guardarSesion(id: string): void {
  try {
    sessionStorage.setItem('chamuyo-id', id);
  } catch {
    /* sin almacenamiento */
  }
}

@Component({
  selector: 'app-jugador',
  templateUrl: './jugador.html',
  styleUrl: './jugador.css',
})
export class PantallaJugador implements OnInit, OnDestroy {
  codigoInicial = input('');

  protected readonly t = t;
  protected readonly idioma = idioma;
  protected readonly personajes = PERSONAJES;
  protected readonly imagen = imagen;
  protected readonly nombrePersonaje = nombrePersonaje;
  protected readonly partes = partesConsigna;
  protected readonly maxLargo = MAX_LARGO;
  protected readonly colorDe = colorDe;
  protected readonly modos: Modo[] = ['mixto', 'chamuyo', 'ocurrencias', 'impostor', 'minijuegos'];

  protected codigo = signal('');
  protected nombre = signal(leer('chamuyo-nombre'));
  protected avatar = signal<string>(personaje(leer('chamuyo-avatar') || PERSONAJES[Math.floor(Math.random() * PERSONAJES.length)].id).id);
  protected conexion = signal<Conexion>('fuera');
  protected vista = signal<Vista | null>(null);
  protected borrador = signal('');
  protected modoElegido = signal<Modo>('mixto');
  protected fin = signal(0);
  protected ahora = signal(Date.now());
  protected compartiendo = signal(false);
  protected opinion = signal<number | null>(null);
  /** Posición del joystick de los minijuegos, entre -1 y 1. */
  protected palanca = signal({ x: 0, y: 0 });
  /** En Contá hasta diez vale un solo toque: después el botón queda en "¡Tocaste!". */
  protected tocado = signal(false);
  protected readonly caritas = [
    { valor: 1, emoji: '😴' },
    { valor: 2, emoji: '😐' },
    { valor: 3, emoji: '🙂' },
    { valor: 4, emoji: '😄' },
    { valor: 5, emoji: '🤩' },
  ];

  protected puedeEntrar = computed(() => codigoValido(this.codigo()));
  protected segundos = computed(() => Math.max(0, Math.ceil((this.fin() - this.ahora()) / 1000)));
  protected nombreFinal = computed(() => (this.nombre().trim() || nombrePersonaje(this.avatar(), idioma())).slice(0, 14));

  private cliente: Cliente | null = null;
  private reloj: ReturnType<typeof setInterval> | null = null;
  private ultimaVista = '';
  // El id vive en sessionStorage: sobrevive a recargar la pestaña, pero cada pestaña es otro jugador.
  private id = leerSesion() || this.nuevoId();
  private arrastrando = false;
  private ultimoEnvio = 0;
  private pendiente: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Vibra cuando cambia lo que hay que hacer, para que nadie se quede mirando la tele sin responder.
    effect(() => {
      const v = this.vista();
      const clave = v?.v === 'control' ? `control-${v.etapa}` : v?.v === 'escribir' ? `escribir-${v.impostor?.vuelta ?? 0}` : (v?.v ?? '');
      if (!v || clave === this.ultimaVista) return;
      this.ultimaVista = clave;
      if (v.v === 'escribir' || v.v === 'votar' || clave === 'control-intro') navigator.vibrate?.(v.v === 'escribir' && v.impostor?.soy ? [60, 80, 60] : 60);
      if (clave === 'control-jugando') navigator.vibrate?.([40, 60, 40]);
      if (clave !== 'control-jugando') untracked(() => this.soltarPalanca(false));
      untracked(() => this.tocado.set(false));
    });
  }

  ngOnInit(): void {
    this.codigo.set(this.codigoInicial().toUpperCase());
    this.reloj = setInterval(() => this.ahora.set(Date.now()), 250);
  }

  ngOnDestroy(): void {
    this.cliente?.cerrar();
    if (this.reloj) clearInterval(this.reloj);
    if (this.pendiente) clearTimeout(this.pendiente);
  }

  protected escribirCodigo(valor: string): void {
    this.codigo.set(valor.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4));
  }

  protected entrar(): void {
    if (!this.puedeEntrar()) return;
    const nombre = this.nombreFinal();
    guardar('chamuyo-nombre', nombre);
    guardar('chamuyo-avatar', this.avatar());
    guardarSesion(this.id);
    history.replaceState(null, '', `?sala=${this.codigo()}`);
    this.cliente?.cerrar();
    this.cliente = new Cliente(this.codigo(), () => ({ t: 'hola', id: this.id, nombre, avatar: this.avatar() }), {
      estado: (e) => this.conexion.set(e),
      vista: (v) => this.recibir(v),
    });
    this.cliente.conectar();
  }

  protected salir(): void {
    this.cliente?.cerrar();
    this.cliente = null;
    this.vista.set(null);
    this.conexion.set('fuera');
  }

  protected mandar(): void {
    const texto = this.borrador().trim();
    if (!texto) return;
    this.cliente?.enviar({ t: 'responder', texto });
  }

  protected votar(opcion: string): void {
    this.cliente?.enviar({ t: 'votar', opcion });
  }

  protected empezar(): void {
    this.cliente?.enviar({ t: 'empezar', modo: this.modoElegido() });
  }

  protected async compartir(r: Resumen): Promise<void> {
    if (this.compartiendo()) return;
    this.compartiendo.set(true);
    try {
      await compartirTarjeta(r);
      contar('resultado-compartido/celular');
    } finally {
      this.compartiendo.set(false);
    }
  }

  /** Opinión de un toque al final de la partida; se cuenta de forma anónima. */
  protected opinar(valor: number): void {
    if (this.opinion() !== null) return;
    this.opinion.set(valor);
    contar(`opinion/${valor}`);
  }

  protected otra(): void {
    this.cliente?.enviar({ t: 'otra' });
  }

  protected nombreModo(m: Modo): string {
    const x = t();
    return { mixto: x.modoMixto, chamuyo: x.modoChamuyo, ocurrencias: x.modoOcurrencias, minijuegos: x.modoMinijuegos, impostor: x.modoImpostor }[m];
  }

  // ---- controles de los minijuegos ----

  protected tocar(ev: PointerEvent): void {
    ev.preventDefault();
    const v = this.vista();
    if (v?.v === 'control' && v.juego === 'diez') {
      if (this.tocado()) return;
      this.tocado.set(true);
    }
    this.cliente?.enviar({ t: 'toque' });
    navigator.vibrate?.(12);
  }

  protected agarrarPalanca(ev: PointerEvent): void {
    ev.preventDefault();
    try {
      // Sigue al dedo aunque salga del área del joystick.
      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    } catch {
      /* puntero que ya no está activo */
    }
    this.arrastrando = true;
    this.moverPalanca(ev);
  }

  protected moverPalanca(ev: PointerEvent): void {
    if (!this.arrastrando) return;
    const base = (ev.currentTarget as HTMLElement).querySelector('.base');
    if (!base) return;
    const caja = base.getBoundingClientRect();
    // La perilla llega hasta el borde de la base: un 29% del ancho desde el centro.
    const radio = caja.width * 0.29;
    let x = (ev.clientX - (caja.left + caja.width / 2)) / radio;
    let y = (ev.clientY - (caja.top + caja.height / 2)) / radio;
    const largo = Math.hypot(x, y);
    if (largo > 1) {
      x /= largo;
      y /= largo;
    }
    this.palanca.set({ x, y });
    this.enviarPalanca(false);
  }

  protected soltarPalanca(enviar = true): void {
    const { x, y } = this.palanca();
    const estaba = this.arrastrando || x !== 0 || y !== 0;
    this.arrastrando = false;
    this.palanca.set({ x: 0, y: 0 });
    if (enviar && estaba) this.enviarPalanca(true);
  }

  /** Manda la posición como mucho cada 50 ms, y siempre la última. */
  private enviarPalanca(inmediato: boolean): void {
    const espera = 50 - (performance.now() - this.ultimoEnvio);
    if (!inmediato && espera > 0) {
      this.pendiente ??= setTimeout(() => {
        this.pendiente = null;
        this.enviarPalanca(true);
      }, espera);
      return;
    }
    if (this.pendiente) clearTimeout(this.pendiente);
    this.pendiente = null;
    this.ultimoEnvio = performance.now();
    const { x, y } = this.palanca();
    this.cliente?.enviar({ t: 'mando', x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
  }

  protected idiomaContrario(): void {
    cambiarIdioma(idioma() === 'es' ? 'en' : 'es');
  }

  private recibir(v: Vista): void {
    const antes = this.vista();
    // Una pista nueva (o la segunda vuelta del Impostor) empieza con el cuadro vacío.
    if (v.v === 'escribir' && (antes?.v !== 'escribir' || antes.impostor?.vuelta !== v.impostor?.vuelta)) this.borrador.set('');
    if ('restante' in v) this.fin.set(Date.now() + v.restante);
    this.vista.set(v);
  }

  private nuevoId(): string {
    return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
