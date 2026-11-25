import { Component, computed, effect, input, OnDestroy, OnInit, signal } from '@angular/core';
import { cambiarIdioma, idioma, t } from '../i18n';
import { MAX_LARGO, Modo } from '../juego/motor';
import { imagen, nombrePersonaje, personaje, PERSONAJES, partesConsigna } from '../juego/personajes';
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

  constructor() {
    // Vibra cuando cambia lo que hay que hacer, para que nadie se quede mirando la tele sin responder.
    effect(() => {
      const v = this.vista();
      if (!v || v.v === this.ultimaVista) return;
      this.ultimaVista = v.v;
      if (v.v === 'escribir' || v.v === 'votar') navigator.vibrate?.(60);
    });
  }

  ngOnInit(): void {
    this.codigo.set(this.codigoInicial().toUpperCase());
    this.reloj = setInterval(() => this.ahora.set(Date.now()), 250);
  }

  ngOnDestroy(): void {
    this.cliente?.cerrar();
    if (this.reloj) clearInterval(this.reloj);
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

  protected idiomaContrario(): void {
    cambiarIdioma(idioma() === 'es' ? 'en' : 'es');
  }

  private recibir(v: Vista): void {
    if (v.v === 'escribir' && this.vista()?.v !== 'escribir') this.borrador.set('');
    if ('restante' in v) this.fin.set(Date.now() + v.restante);
    this.vista.set(v);
  }

  private nuevoId(): string {
    return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
