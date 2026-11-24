// Lógica pura de una partida. La pantalla anfitriona es la única que la ejecuta;
// los celulares solo reciben la vista que les corresponde.

export type Modo = 'chamuyo' | 'ocurrencias' | 'mixto';
export type TipoRonda = 'chamuyo' | 'ocurrencias';
export type Fase = 'lobby' | 'escribir' | 'votar' | 'revelar' | 'tabla' | 'final';

export interface Jugador {
  id: string;
  nombre: string;
  avatar: string;
  puntos: number;
  conectado: boolean;
}

/** Un dato real con un hueco (___) y respuestas falsas de reserva. */
export interface Dato {
  texto: string;
  verdad: string;
  senuelos: string[];
}

export interface Opcion {
  id: string;
  texto: string;
  autores: string[];
  verdad: boolean;
  senuelo: boolean;
  votantes: string[];
}

export interface Ronda {
  numero: number;
  tipo: TipoRonda;
  consigna: string;
  verdad: string | null;
  senuelos: string[];
  respuestas: Record<string, string>;
  /** Jugadores que escribieron la verdad sin querer (solo en Chamuyo). */
  acertaron: string[];
  opciones: Opcion[];
  votos: Record<string, string>;
  puntosRonda: Record<string, number>;
  dobles: boolean;
}

export interface Contenido {
  datos: Dato[];
  consignas: string[];
}

export interface Partida {
  fase: Fase;
  modo: Modo;
  jugadores: Jugador[];
  totalRondas: number;
  ronda: Ronda | null;
  plan: Array<{ tipo: TipoRonda; dato?: Dato; consigna?: string }>;
}

export const MAX_JUGADORES = 8;
export const MIN_JUGADORES = 2;
export const MAX_LARGO = 60;
export const PUNTOS = { verdad: 1000, engano: 500, voto: 500, unanime: 1000 } as const;

export type Azar = () => number;

export function mezclar<T>(lista: readonly T[], azar: Azar): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Compara respuestas sin importar mayúsculas, tildes, espacios ni signos. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function limpiarTexto(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim().slice(0, MAX_LARGO);
}

export function nuevaPartida(): Partida {
  return { fase: 'lobby', modo: 'mixto', jugadores: [], totalRondas: 0, ronda: null, plan: [] };
}

export function agregarJugador(p: Partida, j: Omit<Jugador, 'puntos' | 'conectado'>): Partida {
  const existente = p.jugadores.find((x) => x.id === j.id);
  if (existente) {
    return {
      ...p,
      jugadores: p.jugadores.map((x) => (x.id === j.id ? { ...x, conectado: true } : x)),
    };
  }
  if (p.fase !== 'lobby' || p.jugadores.length >= MAX_JUGADORES) return p;
  const nombre = limpiarTexto(j.nombre).slice(0, 14) || 'Anónimo';
  return { ...p, jugadores: [...p.jugadores, { ...j, nombre, puntos: 0, conectado: true }] };
}

export function marcarConexion(p: Partida, id: string, conectado: boolean): Partida {
  return { ...p, jugadores: p.jugadores.map((x) => (x.id === id ? { ...x, conectado } : x)) };
}

export function quitarJugador(p: Partida, id: string): Partida {
  if (p.fase !== 'lobby') return marcarConexion(p, id, false);
  return { ...p, jugadores: p.jugadores.filter((x) => x.id !== id) };
}

export function iniciar(
  p: Partida,
  modo: Modo,
  rondas: number,
  contenido: Contenido,
  azar: Azar,
): Partida {
  if (p.jugadores.length < MIN_JUGADORES) return p;
  const datos = mezclar(contenido.datos, azar);
  const consignas = mezclar(contenido.consignas, azar);
  const plan: Partida['plan'] = [];
  for (let i = 0; i < rondas; i++) {
    const tipo: TipoRonda = modo === 'mixto' ? (i % 2 === 0 ? 'chamuyo' : 'ocurrencias') : modo;
    if (tipo === 'chamuyo' && datos.length) plan.push({ tipo, dato: datos.pop() });
    else if (consignas.length) plan.push({ tipo: 'ocurrencias', consigna: consignas.pop() });
  }
  const base: Partida = {
    ...p,
    modo,
    plan,
    totalRondas: plan.length,
    jugadores: p.jugadores.map((j) => ({ ...j, puntos: 0 })),
    ronda: null,
  };
  return empezarRonda(base, 0, azar);
}

function empezarRonda(p: Partida, indice: number, azar: Azar): Partida {
  const paso = p.plan[indice];
  if (!paso) return { ...p, fase: 'final', ronda: null };
  const nombres = p.jugadores.map((j) => j.nombre);
  const consigna =
    paso.tipo === 'chamuyo'
      ? paso.dato!.texto
      : paso.consigna!.replace(/\{jugador\}/g, () => nombres[Math.floor(azar() * nombres.length)]);
  const ronda: Ronda = {
    numero: indice + 1,
    tipo: paso.tipo,
    consigna,
    verdad: paso.dato?.verdad ?? null,
    senuelos: paso.dato?.senuelos ?? [],
    respuestas: {},
    acertaron: [],
    opciones: [],
    votos: {},
    puntosRonda: {},
    dobles: indice === p.plan.length - 1 && p.plan.length > 1,
  };
  return { ...p, fase: 'escribir', ronda };
}

export function responder(p: Partida, id: string, texto: string): Partida {
  const r = p.ronda;
  const limpio = limpiarTexto(texto);
  if (p.fase !== 'escribir' || !r || !limpio || !p.jugadores.some((j) => j.id === id)) return p;
  return { ...p, ronda: { ...r, respuestas: { ...r.respuestas, [id]: limpio } } };
}

export function faltanResponder(p: Partida): string[] {
  const r = p.ronda;
  if (!r) return [];
  return p.jugadores.filter((j) => j.conectado && !(j.id in r.respuestas)).map((j) => j.id);
}

/** Cierra la escritura y arma las opciones que se van a votar. */
export function cerrarEscritura(p: Partida, azar: Azar): Partida {
  const r = p.ronda;
  if (p.fase !== 'escribir' || !r) return p;
  const acertaron: string[] = [];
  const grupos = new Map<string, Opcion>();
  const verdadNorm = r.verdad ? normalizar(r.verdad) : null;

  for (const [id, texto] of Object.entries(r.respuestas)) {
    const clave = normalizar(texto);
    if (!clave) continue;
    if (verdadNorm && clave === verdadNorm) {
      acertaron.push(id);
      continue;
    }
    const grupo = grupos.get(clave);
    if (grupo) grupo.autores.push(id);
    else grupos.set(clave, { id: '', texto, autores: [id], verdad: false, senuelo: false, votantes: [] });
  }

  const opciones = [...grupos.values()];
  if (r.tipo === 'chamuyo' && r.verdad) {
    for (const senuelo of mezclar(r.senuelos, azar)) {
      if (opciones.length >= 2) break;
      const clave = normalizar(senuelo);
      if (grupos.has(clave) || clave === verdadNorm) continue;
      opciones.push({ id: '', texto: senuelo, autores: [], verdad: false, senuelo: true, votantes: [] });
    }
    opciones.push({ id: '', texto: r.verdad, autores: [], verdad: true, senuelo: false, votantes: [] });
  }

  const numeradas = mezclar(opciones, azar).map((o, i) => ({ ...o, id: `o${i + 1}` }));
  const siguiente: Partida = { ...p, fase: 'votar', ronda: { ...r, acertaron, opciones: numeradas } };
  return puedenVotar(siguiente).length ? siguiente : puntuar(siguiente);
}

/** Opciones que un jugador puede elegir: nunca la propia. */
export function opcionesPara(p: Partida, id: string): Opcion[] {
  const r = p.ronda;
  if (!r || r.acertaron.includes(id)) return [];
  return r.opciones.filter((o) => !o.autores.includes(id));
}

export function puedenVotar(p: Partida): string[] {
  return p.jugadores.filter((j) => j.conectado && opcionesPara(p, j.id).length > 0).map((j) => j.id);
}

export function faltanVotar(p: Partida): string[] {
  const r = p.ronda;
  if (!r) return [];
  return puedenVotar(p).filter((id) => !(id in r.votos));
}

export function votar(p: Partida, id: string, opcionId: string): Partida {
  const r = p.ronda;
  if (p.fase !== 'votar' || !r) return p;
  if (!opcionesPara(p, id).some((o) => o.id === opcionId)) return p;
  return { ...p, ronda: { ...r, votos: { ...r.votos, [id]: opcionId } } };
}

/** Reparte los puntos de la ronda y pasa a la revelación. */
export function puntuar(p: Partida): Partida {
  const r = p.ronda;
  if (!r || (p.fase !== 'votar' && p.fase !== 'escribir')) return p;
  const mult = r.dobles ? 2 : 1;
  const ganados: Record<string, number> = {};
  const sumar = (id: string, n: number) => (ganados[id] = (ganados[id] ?? 0) + n * mult);

  const opciones = r.opciones.map((o) => ({
    ...o,
    votantes: Object.entries(r.votos)
      .filter(([, op]) => op === o.id)
      .map(([id]) => id),
  }));

  if (r.tipo === 'chamuyo') {
    for (const id of r.acertaron) sumar(id, PUNTOS.verdad);
    for (const o of opciones) {
      if (o.verdad) o.votantes.forEach((id) => sumar(id, PUNTOS.verdad));
      else o.autores.forEach((id) => sumar(id, PUNTOS.engano * o.votantes.length));
    }
  } else {
    const votantes = Object.keys(r.votos).length;
    for (const o of opciones) {
      o.autores.forEach((id) => sumar(id, PUNTOS.voto * o.votantes.length));
      if (votantes >= 2 && o.votantes.length === votantes) o.autores.forEach((id) => sumar(id, PUNTOS.unanime));
    }
  }

  return {
    ...p,
    fase: 'revelar',
    ronda: { ...r, opciones, puntosRonda: ganados },
    jugadores: p.jugadores.map((j) => ({ ...j, puntos: j.puntos + (ganados[j.id] ?? 0) })),
  };
}

/** Puntos que ganó cada autor gracias a una opción puntual (no el total de su ronda). */
export function puntosPorOpcion(r: Ronda, o: Opcion): number {
  if (o.verdad || !o.autores.length) return 0;
  const mult = r.dobles ? 2 : 1;
  if (r.tipo === 'chamuyo') return PUNTOS.engano * o.votantes.length * mult;
  const votantes = Object.keys(r.votos).length;
  const unanime = votantes >= 2 && o.votantes.length === votantes ? PUNTOS.unanime : 0;
  return (PUNTOS.voto * o.votantes.length + unanime) * mult;
}

export function avanzar(p: Partida, azar: Azar): Partida {
  if (p.fase === 'revelar') return { ...p, fase: 'tabla' };
  if (p.fase === 'tabla' && p.ronda) return empezarRonda(p, p.ronda.numero, azar);
  return p;
}

export function volverAlLobby(p: Partida): Partida {
  return { ...p, fase: 'lobby', ronda: null, plan: [], totalRondas: 0, jugadores: p.jugadores.filter((j) => j.conectado) };
}

export function ranking(p: Partida): Jugador[] {
  return [...p.jugadores].sort((a, b) => b.puntos - a.puntos);
}
