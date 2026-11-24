// Efectos sintetizados con Web Audio: no hay archivos de sonido que descargar.
import { signal } from '@angular/core';

export const sonidoActivo = signal(leerPreferencia());

function leerPreferencia(): boolean {
  try {
    return localStorage.getItem('chamuyo-sonido') !== 'no';
  } catch {
    return true;
  }
}

export function alternarSonido(): void {
  sonidoActivo.update((v) => !v);
  try {
    localStorage.setItem('chamuyo-sonido', sonidoActivo() ? 'si' : 'no');
  } catch {
    /* sin almacenamiento */
  }
}

let ctx: AudioContext | null = null;

function contexto(): AudioContext | null {
  if (!sonidoActivo()) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function nota(frec: number, inicio: number, dur: number, tipo: OscillatorType = 'triangle', vol = 0.18): void {
  const c = contexto();
  if (!c) return;
  const t0 = c.currentTime + inicio;
  const osc = c.createOscillator();
  const gan = c.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frec, t0);
  gan.gain.setValueAtTime(0.0001, t0);
  gan.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gan.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gan).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  entra: () => [523, 784].forEach((f, i) => nota(f, i * 0.07, 0.18)),
  listo: () => nota(880, 0, 0.12, 'sine', 0.12),
  tic: () => nota(1200, 0, 0.05, 'square', 0.05),
  fase: () => [392, 523, 659].forEach((f, i) => nota(f, i * 0.08, 0.25)),
  revela: () => [330, 262].forEach((f, i) => nota(f, i * 0.12, 0.3, 'sawtooth', 0.08)),
  verdad: () => [523, 659, 784, 1046].forEach((f, i) => nota(f, i * 0.09, 0.35)),
  puntos: () => nota(1318, 0, 0.15, 'sine', 0.1),
  fanfarria: () =>
    [523, 523, 523, 659, 784, 659, 784, 1046].forEach((f, i) => nota(f, i * 0.13, 0.28, 'square', 0.07)),
};
