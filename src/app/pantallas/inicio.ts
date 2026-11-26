import { Component, computed, effect, OnDestroy, OnInit, output, signal } from '@angular/core';
import { cargarContenido } from '../contenido/cargar';
import { cambiarIdioma, idioma, t } from '../i18n';
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

  /** Muestra de juego que va rotando en la portada: un dato real con su verdad y dos mentiras. */
  protected indice = signal(0);
  protected revelado = signal(false);
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
    if (this.timer) clearInterval(this.timer);
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
