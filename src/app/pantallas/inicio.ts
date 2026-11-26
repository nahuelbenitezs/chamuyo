import { Component, computed, effect, OnDestroy, OnInit, output, signal } from '@angular/core';
import { cargarContenido } from '../contenido/cargar';
import { cambiarIdioma, idioma, t } from '../i18n';
import { contar } from '../juego/analitica';
import { Dato, mezclar } from '../juego/motor';
import { imagen, PERSONAJES, partesConsigna } from '../juego/personajes';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class PantallaInicio implements OnInit, OnDestroy {
  crear = output<void>();
  unirse = output<void>();

  protected readonly t = t;
  protected readonly idioma = idioma;
  protected readonly partes = partesConsigna;
  protected readonly personajes = PERSONAJES;
  protected readonly imagen = imagen;
  protected tocado = signal<string | null>(null);
  private soltar: ReturnType<typeof setTimeout> | null = null;

  protected tocar(id: string): void {
    this.tocado.set(id);
    if (this.soltar) clearTimeout(this.soltar);
    this.soltar = setTimeout(() => this.tocado.set(null), 1400);
  }

  /** En un celular el juego se usa de control: lo principal es entrar con un código o mandar el link a la tele. */
  protected readonly esCelu = matchMedia('(pointer: coarse) and (max-width: 820px)').matches;
  protected copiado = signal(false);

  /** Muestra de juego en la portada: va rotando sola hasta que alguien la juega. */
  protected indice = signal(0);
  protected revelado = signal(false);
  protected elegida = signal<string | null>(null);
  protected racha = signal(0);
  protected jugadas = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;
  private tick = 0;

  private datos = signal<Dato[]>([]);

  constructor() {
    effect(() => {
      const lengua = idioma();
      void cargarContenido(lengua).then((c) => {
        if (idioma() === lengua) this.datos.set(c.datos);
      });
    });
  }

  protected muestra = computed(() => {
    const datos = this.datos();
    if (!datos.length) return null;
    const d = datos[this.indice() % datos.length];
    const opciones = mezclar([d.verdad, ...d.senuelos.slice(0, 2)], semilla(this.indice()));
    return { texto: d.texto, verdad: d.verdad, opciones };
  });

  ngOnInit(): void {
    this.indice.set(Math.floor(Math.random() * 40));
    this.timer = setInterval(() => {
      this.tick++;
      if (this.tick % 2 === 1) this.revelado.set(true);
      else {
        this.revelado.set(false);
        this.indice.update((i) => i + 1);
      }
    }, 2600);
  }

  ngOnDestroy(): void {
    this.detenerRotacion();
  }

  private detenerRotacion(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  protected elegir(opcion: string): void {
    const m = this.muestra();
    if (!m || this.elegida()) return;
    if (this.timer) {
      // Primera jugada: deja de rotar sola y se cuenta (una vez por visita). Si justo se estaba
      // mostrando la respuesta, pasa a una pregunta nueva para que la juegue de verdad.
      this.detenerRotacion();
      contar('demo/jugo');
      if (this.revelado()) return this.otra();
    }
    this.elegida.set(opcion);
    this.revelado.set(true);
    this.jugadas.update((n) => n + 1);
    this.racha.update((r) => (opcion === m.verdad ? r + 1 : 0));
  }

  protected otra(): void {
    this.elegida.set(null);
    this.revelado.set(false);
    this.indice.update((i) => i + 1);
  }

  /** Manda el link con lo que tenga el celular (WhatsApp, mail…); si no se puede, lo copia. */
  protected async mandarLink(): Promise<void> {
    const url = `${location.origin}${location.pathname}`;
    const texto = t().textoMandarLink;
    contar('inicio/mandar-link');
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Chamuyo', text: texto, url });
      } catch {
        /* lo cancelaron */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${texto} ${url}`);
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2500);
    } catch {
      /* sin portapapeles */
    }
  }

  protected idiomaContrario(): void {
    cambiarIdioma(idioma() === 'es' ? 'en' : 'es');
  }
}

function semilla(n: number): () => number {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
