// Dibuja un garabato (los trazos de Garabatos) en un canvas de 1000×1000.
import { Component, ElementRef, effect, input, OnDestroy, viewChild } from '@angular/core';
import { PALETA, Trazo } from './motor';

export const PAPEL = PALETA[PALETA.length - 1];

/** Pinta los trazos; con `hasta` se dibuja solo esa cantidad de puntos (para animarlo). */
export function pintarTrazos(ctx: CanvasRenderingContext2D, trazos: readonly Trazo[], hasta = Infinity): void {
  ctx.fillStyle = PAPEL;
  ctx.fillRect(0, 0, 1000, 1000);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let quedan = hasta;
  for (const t of trazos) {
    if (quedan <= 0) break;
    const n = Math.min(t.puntos.length / 2, quedan);
    quedan -= n;
    ctx.strokeStyle = t.color;
    ctx.lineWidth = t.grosor;
    ctx.beginPath();
    ctx.moveTo(t.puntos[0], t.puntos[1]);
    for (let i = 1; i < n; i++) ctx.lineTo(t.puntos[i * 2], t.puntos[i * 2 + 1]);
    // Un toque sin arrastrar también deja un punto.
    if (n === 1) ctx.lineTo(t.puntos[0] + 0.01, t.puntos[1]);
    ctx.stroke();
  }
}

/** Muestra un garabato; con `animar` se va dibujando solo, como si lo estuvieran haciendo en vivo. */
@Component({
  selector: 'app-garabato',
  template: '<canvas #lienzo width="1000" height="1000" [attr.aria-label]="etiqueta()"></canvas>',
  styles: `
    :host {
      display: block;
      aspect-ratio: 1;
      border-radius: 18px;
      overflow: hidden;
      background: #f6f1e7;
      box-shadow: 0 0 0 4px var(--borde, #35323b), 0 18px 40px rgb(0 0 0 / 0.4);
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class Garabato implements OnDestroy {
  trazos = input<readonly Trazo[]>([]);
  animar = input(false);
  etiqueta = input('');
  private lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private cuadro: number | null = null;

  constructor() {
    effect(() => {
      const ctx = this.lienzo().nativeElement.getContext('2d');
      const trazos = this.trazos();
      if (!ctx) return;
      this.detener();
      const total = trazos.reduce((s, t) => s + t.puntos.length / 2, 0);
      if (!this.animar() || !total || matchMedia('(prefers-reduced-motion: reduce)').matches) return pintarTrazos(ctx, trazos);
      const inicio = performance.now();
      const paso = (ahora: number) => {
        const k = Math.min(1, (ahora - inicio) / 2200);
        pintarTrazos(ctx, trazos, Math.ceil(total * k));
        this.cuadro = k < 1 ? requestAnimationFrame(paso) : null;
      };
      this.cuadro = requestAnimationFrame(paso);
    });
  }

  private detener(): void {
    if (this.cuadro !== null) cancelAnimationFrame(this.cuadro);
    this.cuadro = null;
  }

  ngOnDestroy(): void {
    this.detener();
  }
}
