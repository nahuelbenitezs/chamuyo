// Lógica pura de los minijuegos. La pantalla anfitriona avanza el estado a ~60 cuadros por segundo
// con las entradas que mandan los celulares; los celulares solo muestran el control.

export type IdMinijuego = 'mate' | 'ahora' | 'empanadas' | 'patio';
export type Control = 'boton' | 'joystick';

export const MINIJUEGOS: IdMinijuego[] = ['mate', 'ahora', 'empanadas', 'patio'];
export const CONTROL: Record<IdMinijuego, Control> = { mate: 'boton', ahora: 'boton', empanadas: 'joystick', patio: 'joystick' };

/** Tamaño lógico de la arena; el dibujo lo escala a la pantalla. */
export const ANCHO = 1280;
export const ALTO = 720;

export interface Entrada {
  x: number;
  y: number;
  /** Toques desde el último cuadro (los botones mandan uno por toque). */
  toques: number;
}

export type Azar = () => number;

interface Base {
  ids: string[];
  t: number;
  fin: boolean;
}

export interface EstadoMate extends Base {
  id: 'mate';
  progreso: Record<string, number>;
  llegada: Record<string, number | null>;
}

export interface EstadoAhora extends Base {
  id: 'ahora';
  subronda: number;
  etapa: 'espera' | 'ya' | 'pausa';
  inicioEtapa: number;
  esperaYa: number;
  fuera: string[];
  ganadorSub: string | null;
  puntos: Record<string, number>;
  reacciones: Record<string, number[]>;
}

export interface Objeto {
  x: number;
  y: number;
  v: number;
  giro: number;
}

export interface EstadoEmpanadas extends Base {
  id: 'empanadas';
  x: Record<string, number>;
  eliminado: Record<string, number | null>;
  objetos: Objeto[];
  proximo: number;
}

export interface EstadoPatio extends Base {
  id: 'patio';
  pos: Record<string, { x: number; y: number }>;
  celdas: (string | null)[];
}

export type EstadoMinijuego = EstadoMate | EstadoAhora | EstadoEmpanadas | EstadoPatio;

export const MATE = { porToque: 1.5, duracion: 25 };
export const AHORA = { subrondas: 3, esperaMin: 1.5, esperaVar: 2.5, ventana: 3, pausa: 1.6 };
export const EMPANADAS = { duracion: 40, piso: 612, velocidad: 760, radioJugador: 34, radioObjeto: 36 };
export const PATIO = { duracion: 30, columnas: 32, filas: 18, velocidad: 380 };
const CELDA = ANCHO / PATIO.columnas;

export function crear(id: IdMinijuego, ids: string[], azar: Azar): EstadoMinijuego {
  const base = { ids: [...ids], t: 0, fin: false };
  switch (id) {
    case 'mate':
      return { ...base, id, progreso: porJugador(ids, 0), llegada: porJugador(ids, null) };
    case 'ahora':
      return {
        ...base,
        id,
        subronda: 0,
        etapa: 'espera',
        inicioEtapa: 0,
        esperaYa: AHORA.esperaMin + azar() * AHORA.esperaVar,
        fuera: [],
        ganadorSub: null,
        puntos: porJugador(ids, 0),
        reacciones: Object.fromEntries(ids.map((i) => [i, [] as number[]])),
      };
    case 'empanadas':
      return {
        ...base,
        id,
        x: Object.fromEntries(ids.map((i, k) => [i, ((k + 1) * ANCHO) / (ids.length + 1)])),
        eliminado: porJugador(ids, null),
        objetos: [],
        proximo: 0.8,
      };
    case 'patio': {
      const pos = Object.fromEntries(
        ids.map((i, k) => {
          const ang = (k / ids.length) * Math.PI * 2;
          return [i, { x: ANCHO / 2 + Math.cos(ang) * 420, y: ALTO / 2 + Math.sin(ang) * 220 }];
        }),
      );
      return { ...base, id, pos, celdas: Array(PATIO.columnas * PATIO.filas).fill(null) };
    }
  }
}

function porJugador<T>(ids: string[], valor: T): Record<string, T> {
  return Object.fromEntries(ids.map((i) => [i, valor]));
}

const quieto: Entrada = { x: 0, y: 0, toques: 0 };

/** Avanza el estado `dt` segundos. Modifica el estado recibido y lo devuelve. */
export function paso(e: EstadoMinijuego, dt: number, entradas: Record<string, Entrada>, azar: Azar): EstadoMinijuego {
  if (e.fin) return e;
  e.t += dt;
  const de = (id: string) => entradas[id] ?? quieto;
  switch (e.id) {
    case 'mate': {
      for (const id of e.ids) {
        if (e.llegada[id] !== null) continue;
        e.progreso[id] = Math.min(100, e.progreso[id] + de(id).toques * MATE.porToque);
        if (e.progreso[id] >= 100) e.llegada[id] = e.t;
      }
      e.fin = e.t >= MATE.duracion || e.ids.every((id) => e.llegada[id] !== null);
      return e;
    }
    case 'ahora':
      return pasoAhora(e, de, azar);
    case 'empanadas':
      return pasoEmpanadas(e, dt, de, azar);
    case 'patio': {
      for (const id of e.ids) {
        const p = e.pos[id];
        const { x, y } = limitarVector(de(id));
        p.x = Math.min(ANCHO - 20, Math.max(20, p.x + x * PATIO.velocidad * dt));
        p.y = Math.min(ALTO - 20, Math.max(20, p.y + y * PATIO.velocidad * dt));
        const c = Math.min(PATIO.columnas - 1, Math.floor(p.x / CELDA));
        const f = Math.min(PATIO.filas - 1, Math.floor(p.y / CELDA));
        e.celdas[f * PATIO.columnas + c] = id;
      }
      e.fin = e.t >= PATIO.duracion;
      return e;
    }
  }
}

function pasoAhora(e: EstadoAhora, de: (id: string) => Entrada, azar: Azar): EstadoAhora {
  const enEtapa = e.t - e.inicioEtapa;
  const cambiar = (etapa: EstadoAhora['etapa']) => {
    e.etapa = etapa;
    e.inicioEtapa = e.t;
  };
  if (e.etapa === 'espera') {
    // Tocar antes de tiempo deja afuera de esta subronda.
    for (const id of e.ids) if (de(id).toques > 0 && !e.fuera.includes(id)) e.fuera.push(id);
    if (enEtapa >= e.esperaYa) cambiar('ya');
    return e;
  }
  if (e.etapa === 'ya') {
    const ganador = e.ids.find((id) => !e.fuera.includes(id) && de(id).toques > 0);
    if (ganador) {
      e.ganadorSub = ganador;
      e.puntos[ganador] += 1;
      e.reacciones[ganador].push(enEtapa);
      cambiar('pausa');
    } else if (enEtapa >= AHORA.ventana || e.fuera.length >= e.ids.length) {
      e.ganadorSub = null;
      cambiar('pausa');
    }
    return e;
  }
  if (enEtapa >= AHORA.pausa) {
    e.subronda += 1;
    if (e.subronda >= AHORA.subrondas) {
      e.fin = true;
      return e;
    }
    e.fuera = [];
    e.ganadorSub = null;
    e.esperaYa = AHORA.esperaMin + azar() * AHORA.esperaVar;
    cambiar('espera');
  }
  return e;
}

function pasoEmpanadas(e: EstadoEmpanadas, dt: number, de: (id: string) => Entrada, azar: Azar): EstadoEmpanadas {
  const vivos = () => e.ids.filter((id) => e.eliminado[id] === null);
  for (const id of vivos()) {
    const nx = e.x[id] + limitarVector(de(id)).x * EMPANADAS.velocidad * dt;
    e.x[id] = Math.min(ANCHO - 40, Math.max(40, nx));
  }
  e.proximo -= dt;
  if (e.proximo <= 0) {
    // Cada vez caen más seguido y más rápido.
    e.objetos.push({ x: 40 + azar() * (ANCHO - 80), y: -40, v: 320 + e.t * 14, giro: azar() * 6 });
    e.proximo = Math.max(0.22, 0.85 - e.t * 0.018);
  }
  for (const o of e.objetos) {
    o.y += o.v * dt;
    o.giro += dt * 3;
  }
  e.objetos = e.objetos.filter((o) => o.y < ALTO + 60);
  const choque = EMPANADAS.radioJugador + EMPANADAS.radioObjeto;
  for (const id of vivos()) {
    if (e.objetos.some((o) => Math.hypot(o.x - e.x[id], o.y - EMPANADAS.piso) < choque)) e.eliminado[id] = e.t;
  }
  const quedan = vivos().length;
  e.fin = e.t >= EMPANADAS.duracion || quedan === 0 || (e.ids.length > 1 && quedan <= 1);
  return e;
}

function limitarVector(v: Entrada): { x: number; y: number } {
  const largo = Math.hypot(v.x, v.y);
  return largo > 1 ? { x: v.x / largo, y: v.y / largo } : { x: v.x, y: v.y };
}

export function celdasDe(e: EstadoPatio): Record<string, number> {
  const cuenta = porJugador(e.ids, 0);
  for (const c of e.celdas) if (c) cuenta[c] += 1;
  return cuenta;
}

/** Ids del mejor al peor puesto. */
/** Puntaje de cada jugador para ordenar: se compara elemento a elemento y más alto es mejor. */
function puntajes(e: EstadoMinijuego): Record<string, number[]> {
  const c = e.id === 'patio' ? celdasDe(e) : {};
  const de = (id: string): number[] => {
    switch (e.id) {
      case 'mate':
        return [-(e.llegada[id] ?? Infinity), e.progreso[id]];
      case 'ahora': {
        const r = e.reacciones[id];
        return [e.puntos[id], r.length ? -r.reduce((s, x) => s + x, 0) / r.length : -Infinity];
      }
      case 'empanadas':
        return [e.eliminado[id] ?? Infinity];
      case 'patio':
        return [c[id]];
    }
  };
  return Object.fromEntries(e.ids.map((id) => [id, de(id)]));
}

function comparar(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}

/** Puestos de mejor a peor; quienes empatan comparten el mismo grupo. */
export function puestos(e: EstadoMinijuego): string[][] {
  const p = puntajes(e);
  const ids = [...e.ids].sort((a, b) => comparar(p[b], p[a]));
  const grupos: string[][] = [];
  ids.forEach((id, i) => {
    if (i > 0 && comparar(p[id], p[ids[i - 1]]) === 0) grupos[grupos.length - 1].push(id);
    else grupos.push([id]);
  });
  return grupos;
}

export function orden(e: EstadoMinijuego): string[] {
  return puestos(e).flat();
}

export function restante(e: EstadoMinijuego): number | null {
  if (e.id === 'mate') return Math.max(0, MATE.duracion - e.t);
  if (e.id === 'empanadas') return Math.max(0, EMPANADAS.duracion - e.t);
  if (e.id === 'patio') return Math.max(0, PATIO.duracion - e.t);
  return null;
}
