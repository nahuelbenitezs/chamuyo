// Lógica pura de los minijuegos. La pantalla anfitriona avanza el estado a ~60 cuadros por segundo
// con las entradas que mandan los celulares; los celulares solo muestran el control.

export type IdMinijuego = 'mate' | 'ahora' | 'empanadas' | 'patio' | 'agua' | 'papa' | 'serpentina' | 'diez';
export type Control = 'boton' | 'joystick';

export const MINIJUEGOS: IdMinijuego[] = ['mate', 'ahora', 'empanadas', 'patio', 'agua', 'papa', 'serpentina', 'diez'];
export const CONTROL: Record<IdMinijuego, Control> = {
  mate: 'boton',
  ahora: 'boton',
  empanadas: 'joystick',
  patio: 'joystick',
  agua: 'joystick',
  papa: 'joystick',
  serpentina: 'joystick',
  diez: 'boton',
};

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

export interface Punto {
  x: number;
  y: number;
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
  pos: Record<string, Punto>;
  celdas: (string | null)[];
}

export interface Cuerpo extends Punto {
  vx: number;
  vy: number;
}

/** Al agua: empujones arriba de un inflable redondo. Las posiciones son relativas al centro. */
export interface EstadoAgua extends Base {
  id: 'agua';
  cuerpos: Record<string, Cuerpo>;
  eliminado: Record<string, number | null>;
  radio: number;
}

export interface EstadoPapa extends Base {
  id: 'papa';
  pos: Record<string, Punto>;
  eliminado: Record<string, number | null>;
  /** Quién tiene la papa; null mientras se espera la próxima después de una explosión. */
  portador: string | null;
  explota: number;
  /** Último pase, para que no se la devuelvan en el mismo instante. */
  pase: { de: string; t: number } | null;
  boom: (Punto & { t: number }) | null;
  proxima: number;
  finEn: number | null;
}

export interface Celda {
  c: number;
  f: number;
}

export interface EstadoSerpentina extends Base {
  id: 'serpentina';
  cabeza: Record<string, Celda>;
  dir: Record<string, Celda>;
  celdas: (string | null)[];
  eliminado: Record<string, number | null>;
  acumulado: number;
  finEn: number | null;
}

export interface EstadoDiez extends Base {
  id: 'diez';
  /** Segundo en que tocó cada uno. */
  toque: Record<string, number | null>;
  revelarDesde: number | null;
}

export type EstadoMinijuego =
  | EstadoMate
  | EstadoAhora
  | EstadoEmpanadas
  | EstadoPatio
  | EstadoAgua
  | EstadoPapa
  | EstadoSerpentina
  | EstadoDiez;

export const MATE = { porToque: 1.5, duracion: 25 };
export const AHORA = { subrondas: 3, esperaMin: 1.5, esperaVar: 2.5, ventana: 3, pausa: 1.6 };
export const EMPANADAS = { duracion: 40, piso: 612, velocidad: 760, radioJugador: 34, radioObjeto: 36 };
export const PATIO = { duracion: 30, columnas: 32, filas: 18, velocidad: 380 };
export const AGUA = {
  duracion: 45,
  radio: 300,
  radioFinal: 140,
  achicaDesde: 6,
  achicaHasta: 36,
  radioJugador: 36,
  aceleracion: 1500,
  frenado: 2.4,
  maxima: 460,
  rebote: 1.2,
};
export const PAPA = { velocidad: 360, extraPortador: 1.12, radioJugador: 38, mechaMin: 5, mechaVar: 3, inmune: 0.8, pausa: 1.6, cierre: 1.4 };
export const SERPENTINA = { columnas: 64, filas: 36, paso: 0.085, duracion: 60, umbral: 0.35, cierre: 1 };
export const DIEZ = { objetivo: 10, visible: 3, limite: 15, revelar: 4.5 };
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
    case 'patio':
      return { ...base, id, pos: enRonda(ids, 420, 220), celdas: Array(PATIO.columnas * PATIO.filas).fill(null) };
    case 'agua': {
      const cuerpos = Object.fromEntries(
        ids.map((i, k) => {
          const ang = (k / ids.length) * Math.PI * 2;
          const r = AGUA.radio * 0.6;
          return [i, { x: Math.cos(ang) * r, y: Math.sin(ang) * r, vx: 0, vy: 0 }];
        }),
      );
      return { ...base, id, cuerpos, eliminado: porJugador(ids, null), radio: AGUA.radio };
    }
    case 'papa': {
      const e: EstadoPapa = {
        ...base,
        id,
        pos: enRonda(ids, 440, 230),
        eliminado: porJugador(ids, null),
        portador: null,
        explota: 0,
        pase: null,
        boom: null,
        proxima: 0,
        finEn: null,
      };
      darPapa(e, azar);
      return e;
    }
    case 'serpentina': {
      const { columnas, filas } = SERPENTINA;
      const e: EstadoSerpentina = {
        ...base,
        id,
        cabeza: {},
        dir: {},
        celdas: Array(columnas * filas).fill(null),
        eliminado: porJugador(ids, null),
        acumulado: 0,
        finEn: null,
      };
      // Arrancan mitad a la izquierda y mitad a la derecha, mirando hacia el centro. Los de la
      // derecha van unas filas más abajo para que nadie salga de frente contra otro.
      const porLado = Math.ceil(ids.length / 2);
      ids.forEach((i, k) => {
        const derecha = k % 2 === 1;
        const fila = Math.round((filas * (Math.floor(k / 2) + 1)) / (porLado + 1)) + (derecha ? 2 : -2);
        const cabeza = { c: derecha ? columnas - 6 : 5, f: fila };
        e.cabeza[i] = cabeza;
        e.dir[i] = { c: derecha ? -1 : 1, f: 0 };
        e.celdas[cabeza.f * columnas + cabeza.c] = i;
      });
      return e;
    }
    case 'diez':
      return { ...base, id, toque: porJugador(ids, null), revelarDesde: null };
  }
}

function porJugador<T>(ids: string[], valor: T): Record<string, T> {
  return Object.fromEntries(ids.map((i) => [i, valor]));
}

/** Posiciones repartidas en una elipse alrededor del centro de la arena. */
function enRonda(ids: string[], rx: number, ry: number): Record<string, Punto> {
  return Object.fromEntries(
    ids.map((i, k) => {
      const ang = (k / ids.length) * Math.PI * 2;
      return [i, { x: ANCHO / 2 + Math.cos(ang) * rx, y: ALTO / 2 + Math.sin(ang) * ry }];
    }),
  );
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
        mover(p, limitarVector(de(id)), PATIO.velocidad * dt, 20);
        const c = Math.min(PATIO.columnas - 1, Math.floor(p.x / CELDA));
        const f = Math.min(PATIO.filas - 1, Math.floor(p.y / CELDA));
        e.celdas[f * PATIO.columnas + c] = id;
      }
      e.fin = e.t >= PATIO.duracion;
      return e;
    }
    case 'agua':
      return pasoAgua(e, dt, de);
    case 'papa':
      return pasoPapa(e, dt, de, azar);
    case 'serpentina':
      return pasoSerpentina(e, dt, de);
    case 'diez':
      return pasoDiez(e, de);
  }
}

/** Mueve dentro de la arena; `abajo` deja lugar para el nombre debajo del personaje. */
function mover(p: Punto, v: { x: number; y: number }, distancia: number, margen: number, abajo = margen): void {
  p.x = Math.min(ANCHO - margen, Math.max(margen, p.x + v.x * distancia));
  p.y = Math.min(ALTO - abajo, Math.max(margen, p.y + v.y * distancia));
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

function pasoAgua(e: EstadoAgua, dt: number, de: (id: string) => Entrada): EstadoAgua {
  const { achicaDesde, achicaHasta } = AGUA;
  const avance = Math.min(1, Math.max(0, (e.t - achicaDesde) / (achicaHasta - achicaDesde)));
  e.radio = AGUA.radio + (AGUA.radioFinal - AGUA.radio) * avance;
  const vivos = e.ids.filter((id) => e.eliminado[id] === null);
  const frenado = Math.exp(-AGUA.frenado * dt);
  for (const id of e.ids) {
    const c = e.cuerpos[id];
    if (e.eliminado[id] === null) {
      const v = limitarVector(de(id));
      c.vx += v.x * AGUA.aceleracion * dt;
      c.vy += v.y * AGUA.aceleracion * dt;
    }
    c.vx *= frenado;
    c.vy *= frenado;
    const rapidez = Math.hypot(c.vx, c.vy);
    if (rapidez > AGUA.maxima) {
      c.vx *= AGUA.maxima / rapidez;
      c.vy *= AGUA.maxima / rapidez;
    }
    c.x += c.vx * dt;
    c.y += c.vy * dt;
  }
  // Choques entre los que siguen arriba: se separan y rebotan como autitos chocadores.
  const minima = AGUA.radioJugador * 2;
  for (let i = 0; i < vivos.length; i++) {
    for (let j = i + 1; j < vivos.length; j++) {
      const a = e.cuerpos[vivos[i]];
      const b = e.cuerpos[vivos[j]];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= minima || d === 0) continue;
      const nx = dx / d;
      const ny = dy / d;
      const empuje = (minima - d) / 2;
      a.x -= nx * empuje;
      a.y -= ny * empuje;
      b.x += nx * empuje;
      b.y += ny * empuje;
      const relativa = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (relativa >= 0) continue;
      const impulso = (-(1 + AGUA.rebote) * relativa) / 2;
      a.vx -= impulso * nx;
      a.vy -= impulso * ny;
      b.vx += impulso * nx;
      b.vy += impulso * ny;
    }
  }
  for (const id of vivos) {
    const c = e.cuerpos[id];
    if (Math.hypot(c.x, c.y) > e.radio) e.eliminado[id] = e.t;
  }
  const quedan = e.ids.filter((id) => e.eliminado[id] === null).length;
  e.fin = e.t >= AGUA.duracion || quedan === 0 || (e.ids.length > 1 && quedan <= 1);
  return e;
}

/** Le da la papa a alguien al azar entre los que siguen, con una mecha más corta cuantos menos quedan. */
function darPapa(e: EstadoPapa, azar: Azar): void {
  const vivos = e.ids.filter((id) => e.eliminado[id] === null);
  e.portador = vivos[Math.floor(azar() * vivos.length)] ?? null;
  e.explota = e.t + PAPA.mechaMin + azar() * PAPA.mechaVar;
  e.pase = null;
}

function pasoPapa(e: EstadoPapa, dt: number, de: (id: string) => Entrada, azar: Azar): EstadoPapa {
  if (e.finEn !== null) {
    e.fin = e.t >= e.finEn;
    return e;
  }
  const vivos = e.ids.filter((id) => e.eliminado[id] === null);
  for (const id of vivos) {
    const rapidez = PAPA.velocidad * (id === e.portador ? PAPA.extraPortador : 1);
    mover(e.pos[id], limitarVector(de(id)), rapidez * dt, PAPA.radioJugador + 30, PAPA.radioJugador + 50);
  }
  if (e.portador === null) {
    if (e.t >= e.proxima) darPapa(e, azar);
    return e;
  }
  // Pasar la papa: alcanza con tocar a otro, salvo devolvérsela enseguida a quien te la pasó.
  const yo = e.pos[e.portador];
  for (const otro of vivos) {
    if (otro === e.portador) continue;
    if (e.pase && e.pase.de === otro && e.t - e.pase.t < PAPA.inmune) continue;
    const p = e.pos[otro];
    if (Math.hypot(p.x - yo.x, p.y - yo.y) < PAPA.radioJugador * 2) {
      e.pase = { de: e.portador, t: e.t };
      e.portador = otro;
      break;
    }
  }
  if (e.t >= e.explota) {
    const p = e.pos[e.portador];
    e.eliminado[e.portador] = e.t;
    e.boom = { x: p.x, y: p.y, t: e.t };
    e.portador = null;
    e.proxima = e.t + PAPA.pausa;
    if (vivos.length - 1 <= 1) e.finEn = e.t + PAPA.cierre;
  }
  return e;
}

function pasoSerpentina(e: EstadoSerpentina, dt: number, de: (id: string) => Entrada): EstadoSerpentina {
  if (e.finEn !== null) {
    e.fin = e.t >= e.finEn;
    return e;
  }
  const { columnas, filas } = SERPENTINA;
  e.acumulado += dt;
  while (e.acumulado >= SERPENTINA.paso) {
    e.acumulado -= SERPENTINA.paso;
    const vivos = e.ids.filter((id) => e.eliminado[id] === null);
    // El joystick elige la dirección dominante; no se puede pegar la vuelta en el lugar.
    for (const id of vivos) {
      const { x, y } = de(id);
      if (Math.max(Math.abs(x), Math.abs(y)) < SERPENTINA.umbral) continue;
      const nueva = Math.abs(x) > Math.abs(y) ? { c: Math.sign(x), f: 0 } : { c: 0, f: Math.sign(y) };
      const actual = e.dir[id];
      if (nueva.c !== -actual.c || nueva.f !== -actual.f) e.dir[id] = nueva;
    }
    const destino: Record<string, Celda> = {};
    for (const id of vivos) destino[id] = { c: e.cabeza[id].c + e.dir[id].c, f: e.cabeza[id].f + e.dir[id].f };
    const chocan = new Set<string>();
    for (const id of vivos) {
      const d = destino[id];
      const afuera = d.c < 0 || d.f < 0 || d.c >= columnas || d.f >= filas;
      const ocupada = !afuera && e.celdas[d.f * columnas + d.c] !== null;
      const deFrente = vivos.some((otro) => otro !== id && destino[otro].c === d.c && destino[otro].f === d.f);
      if (afuera || ocupada || deFrente) chocan.add(id);
    }
    for (const id of vivos) {
      if (chocan.has(id)) {
        e.eliminado[id] = e.t;
        continue;
      }
      e.cabeza[id] = destino[id];
      e.celdas[destino[id].f * columnas + destino[id].c] = id;
    }
    const quedan = vivos.length - chocan.size;
    if (quedan === 0 || (e.ids.length > 1 && quedan <= 1)) {
      e.finEn = e.t + SERPENTINA.cierre;
      break;
    }
  }
  if (e.t >= SERPENTINA.duracion) e.fin = true;
  return e;
}

function pasoDiez(e: EstadoDiez, de: (id: string) => Entrada): EstadoDiez {
  if (e.revelarDesde !== null) {
    e.fin = e.t >= e.revelarDesde + DIEZ.revelar;
    return e;
  }
  // Vale el primer toque de cada uno.
  for (const id of e.ids) if (e.toque[id] === null && de(id).toques > 0) e.toque[id] = e.t;
  if (e.t >= DIEZ.limite || e.ids.every((id) => e.toque[id] !== null)) e.revelarDesde = e.t;
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

/** Cuántos siguen en juego, en los juegos donde se queda afuera; null en los demás. */
export function vivos(e: EstadoMinijuego): number | null {
  if (e.id === 'empanadas' || e.id === 'agua' || e.id === 'papa' || e.id === 'serpentina') {
    return e.ids.filter((id) => e.eliminado[id] === null).length;
  }
  return null;
}

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
      case 'agua':
      case 'papa':
      case 'serpentina':
        return [e.eliminado[id] ?? Infinity];
      case 'patio':
        return [c[id]];
      case 'diez': {
        const t = e.toque[id];
        return [t === null ? -Infinity : -Math.abs(t - DIEZ.objetivo)];
      }
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

/** Segundos que quedan para mostrar en la tele; null donde no hay reloj a la vista. */
export function restante(e: EstadoMinijuego): number | null {
  if (e.id === 'mate') return Math.max(0, MATE.duracion - e.t);
  if (e.id === 'empanadas') return Math.max(0, EMPANADAS.duracion - e.t);
  if (e.id === 'patio') return Math.max(0, PATIO.duracion - e.t);
  if (e.id === 'agua') return Math.max(0, AGUA.duracion - e.t);
  return null;
}
