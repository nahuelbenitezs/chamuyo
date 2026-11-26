// Navegación con las flechas del control remoto de la tele (o del teclado): cada flecha lleva el
// foco al botón más cercano en esa dirección, y OK (Enter) lo aprieta. Sirve en los navegadores de
// Smart TV que no muestran una flechita para mover como un mouse.

export type Direccion = 'arriba' | 'abajo' | 'izquierda' | 'derecha';

export interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

const TECLAS: Record<string, Direccion> = { ArrowUp: 'arriba', ArrowDown: 'abajo', ArrowLeft: 'izquierda', ArrowRight: 'derecha' };
const ENFOCABLES = 'button:not([disabled]), a[href], select, input:not([type="hidden"]), textarea, [tabindex]:not([tabindex="-1"])';

/** Distancia entre dos tramos de una recta; 0 si se superponen. */
function separacion(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.max(a0, b0) - Math.min(a1, b1));
}

/**
 * Elige, entre `candidatos`, el más cercano a `origen` en la dirección pedida.
 * Solo cuentan los que están realmente para ese lado (no muy desviados), y se prefieren los alineados.
 * Devuelve el índice, o -1 si no hay nada en esa dirección.
 */
export function elegirVecino(origen: Caja, candidatos: readonly Caja[], dir: Direccion): number {
  const ox = origen.x + origen.ancho / 2;
  const oy = origen.y + origen.alto / 2;
  const horizontal = dir === 'izquierda' || dir === 'derecha';
  let mejor = -1;
  let mejorPuntaje = Infinity;
  candidatos.forEach((c, i) => {
    const dx = c.x + c.ancho / 2 - ox;
    const dy = c.y + c.alto / 2 - oy;
    const adelante = dir === 'derecha' ? dx : dir === 'izquierda' ? -dx : dir === 'abajo' ? dy : -dy;
    if (adelante <= 1) return;
    // Cuánto se desvía hacia el costado: 0 si están en la misma fila (o columna).
    const costado = horizontal
      ? separacion(origen.y, origen.y + origen.alto, c.y, c.y + c.alto)
      : separacion(origen.x, origen.x + origen.ancho, c.x, c.x + c.ancho);
    if (costado > adelante * 2) return;
    const puntaje = adelante + costado * 3 + Math.abs(horizontal ? dy : dx) * 0.1;
    if (puntaje < mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejor = i;
    }
  });
  return mejor;
}

function caja(el: Element): Caja {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, ancho: r.width, alto: r.height };
}

function visible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
}

function escribiendo(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement || (el as HTMLElement).isContentEditable) return true;
  return el instanceof HTMLInputElement && !['button', 'checkbox', 'radio', 'submit'].includes(el.type);
}

export function activarNavegacionTv(doc: Document): void {
  doc.addEventListener('keydown', (ev) => {
    const dir = TECLAS[ev.key];
    if (!dir || ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    const activo = doc.activeElement as HTMLElement | null;
    // Mientras se escribe, las flechas mueven el cursor del texto; en una lista, arriba y abajo eligen.
    if (escribiendo(activo)) return;
    if (activo instanceof HTMLSelectElement && (dir === 'arriba' || dir === 'abajo')) return;
    const enfocables = [...doc.querySelectorAll<HTMLElement>(ENFOCABLES)].filter(visible);
    if (!enfocables.length) return;
    ev.preventDefault();
    // La primera flecha marca el botón principal de la pantalla.
    if (!activo || activo === doc.body || !enfocables.includes(activo)) {
      const inicial = enfocables.find((e) => e.hasAttribute('data-foco-inicial')) ?? enfocables[0];
      inicial.focus();
      inicial.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return;
    }
    const otros = enfocables.filter((e) => e !== activo);
    const i = elegirVecino(caja(activo), otros.map(caja), dir);
    if (i < 0) return;
    otros[i].focus();
    otros[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}
