// Lógica pura de una partida. La pantalla anfitriona es la única que la ejecuta;
// los celulares solo reciben la vista que les corresponde.
import { IdMinijuego, MINIJUEGOS } from '../minijuegos/juegos';

export type Modo = 'chamuyo' | 'ocurrencias' | 'mixto' | 'minijuegos' | 'impostor';
export type TipoRonda = 'chamuyo' | 'ocurrencias' | 'minijuego' | 'impostor';
export type Fase = 'lobby' | 'escribir' | 'votar' | 'minijuego' | 'revelar' | 'tabla' | 'final';

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

/** Una palabra secreta para el Impostor, con la categoría que sí conoce el impostor. */
export interface Secreta {
  categoria: string;
  palabra: string;
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
  /** Solo en rondas de minijuego: cuál se juega, en qué orden terminaron y el puesto de cada uno (empates comparten puesto). */
  minijuego: IdMinijuego | null;
  orden: string[];
  lugar: Record<string, number>;
  /** Solo en Impostor: quién es, la palabra secreta, en qué vuelta de pistas va y las pistas de cada uno. */
  impostor: string | null;
  palabra: string | null;
  vuelta: number;
  pistas: Record<string, string[]>;
  /** Si al impostor lo votó la mayoría (null mientras no se votó). */
  descubierto: boolean | null;
}

export interface Contenido {
  datos: Dato[];
  consignas: string[];
  secretas?: Secreta[];
}

export interface Partida {
  fase: Fase;
  modo: Modo;
  jugadores: Jugador[];
  totalRondas: number;
  ronda: Ronda | null;
  plan: Array<{ tipo: TipoRonda; dato?: Dato; consigna?: string; minijuego?: IdMinijuego; secreta?: Secreta }>;
  /** La respuesta más votada de la partida: la mentira que más engañó o la ocurrencia que más gustó. */
  destacado: Destacado | null;
}

export interface Destacado {
  tipo: TipoRonda;
  consigna: string;
  texto: string;
  autores: string[];
  votos: number;
}

export const MAX_JUGADORES = 8;
export const MIN_JUGADORES = 2;
export const MAX_LARGO = 60;
export const PUNTOS = { verdad: 1000, engano: 500, voto: 500, unanime: 1000, descubrir: 1000, despistar: 500, escapar: 1000 } as const;
/** El Impostor necesita al menos tres: con dos, el que no es impostor ya sabe quién es. */
export const MIN_IMPOSTOR = 3;
export const VUELTAS_IMPOSTOR = 2;
/** Puntos de un minijuego según el puesto (1°, 2°, 3°…). */
export const PUNTOS_PUESTO = [1000, 600, 400, 250, 150, 100, 50, 0] as const;

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
  return { fase: 'lobby', modo: 'mixto', jugadores: [], totalRondas: 0, ronda: null, plan: [], destacado: null };
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

/** Clave estable de un contenido, para recordar qué ya salió en partidas anteriores. */
export function claveDe(paso: { dato?: Dato; consigna?: string; secreta?: Secreta }): string {
  if (paso.secreta) return 'p:' + normalizar(paso.secreta.palabra);
  return paso.dato ? 'd:' + normalizar(paso.dato.texto) : 'c:' + normalizar(paso.consigna ?? '');
}

/** Cuántos jugadores hacen falta para empezar en cada modo. */
export function minimoPara(modo: Modo): number {
  return modo === 'impostor' ? MIN_IMPOSTOR : MIN_JUGADORES;
}

/** Mezcla la lista dejando al final (que es lo primero que se saca) lo que todavía no salió. */
function priorizarNuevos<T>(lista: readonly T[], clave: (x: T) => string, usados: ReadonlySet<string>, azar: Azar): T[] {
  return [...mezclar(lista.filter((x) => usados.has(clave(x))), azar), ...mezclar(lista.filter((x) => !usados.has(clave(x))), azar)];
}

export function iniciar(
  p: Partida,
  modo: Modo,
  rondas: number,
  contenido: Contenido,
  azar: Azar,
  usados: ReadonlySet<string> = new Set(),
): Partida {
  if (p.jugadores.length < minimoPara(modo)) return p;
  const datos = priorizarNuevos(contenido.datos, (dato) => claveDe({ dato }), usados, azar);
  const consignas = priorizarNuevos(contenido.consignas, (consigna) => claveDe({ consigna }), usados, azar);
  const plan: Partida['plan'] = [];
  const minijuegos = mezclar(MINIJUEGOS, azar);
  const secretas = priorizarNuevos(contenido.secretas ?? [], (secreta) => claveDe({ secreta }), usados, azar);
  // Mixto es un poco de todo; el Impostor entra solo si son tres o más.
  const conImpostor = p.jugadores.length >= MIN_IMPOSTOR && secretas.length > 0;
  const ciclo: TipoRonda[] = conImpostor ? ['chamuyo', 'ocurrencias', 'impostor', 'minijuego'] : ['chamuyo', 'ocurrencias', 'minijuego'];
  let siguienteMinijuego = 0;
  for (let i = 0; i < rondas; i++) {
    const tipo: TipoRonda = modo === 'mixto' ? ciclo[i % ciclo.length] : modo === 'minijuegos' ? 'minijuego' : modo;
    if (tipo === 'minijuego') plan.push({ tipo, minijuego: minijuegos[siguienteMinijuego++ % minijuegos.length] });
    else if (tipo === 'impostor' && secretas.length) plan.push({ tipo, secreta: secretas.pop() });
    else if (tipo === 'chamuyo' && datos.length) plan.push({ tipo, dato: datos.pop() });
    else if (consignas.length) plan.push({ tipo: 'ocurrencias', consigna: consignas.pop() });
  }
  const base: Partida = {
    ...p,
    modo,
    plan,
    totalRondas: plan.length,
    jugadores: p.jugadores.map((j) => ({ ...j, puntos: 0 })),
    ronda: null,
    destacado: null,
  };
  return empezarRonda(base, 0, azar);
}

function empezarRonda(p: Partida, indice: number, azar: Azar): Partida {
  const paso = p.plan[indice];
  if (!paso) return { ...p, fase: 'final', ronda: null };
  const nombres = p.jugadores.map((j) => j.nombre);
  const consigna =
    paso.tipo === 'minijuego'
      ? ''
      : paso.tipo === 'impostor'
        ? paso.secreta!.categoria
        : paso.tipo === 'chamuyo'
          ? paso.dato!.texto
          : paso.consigna!.replace(/\{jugador\}/g, () => nombres[Math.floor(azar() * nombres.length)]);
  const candidatos = p.jugadores.filter((j) => j.conectado);
  const impostor = paso.tipo === 'impostor' ? (candidatos[Math.floor(azar() * candidatos.length)]?.id ?? null) : null;
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
    minijuego: paso.minijuego ?? null,
    orden: [],
    lugar: {},
    impostor,
    palabra: paso.secreta?.palabra ?? null,
    vuelta: 1,
    pistas: {},
    descubierto: null,
  };
  return { ...p, fase: paso.tipo === 'minijuego' ? 'minijuego' : 'escribir', ronda };
}

/** Cierra un minijuego: reparte puntos según el puesto y pasa a mostrar el resultado. */
/** `puestos` va de mejor a peor; cada grupo son jugadores empatados, que se llevan los puntos del mismo puesto. */
export function resultadoMinijuego(p: Partida, puestos: string[][]): Partida {
  const r = p.ronda;
  if (p.fase !== 'minijuego' || !r) return p;
  const mult = r.dobles ? 2 : 1;
  const ganados: Record<string, number> = {};
  const lugar: Record<string, number> = {};
  let antes = 0;
  for (const grupo of puestos) {
    for (const id of grupo) {
      lugar[id] = antes + 1;
      ganados[id] = (PUNTOS_PUESTO[antes] ?? 0) * mult;
    }
    antes += grupo.length;
  }
  return {
    ...p,
    fase: 'revelar',
    ronda: { ...r, orden: puestos.flat(), lugar, puntosRonda: ganados },
    jugadores: p.jugadores.map((j) => ({ ...j, puntos: j.puntos + (ganados[j.id] ?? 0) })),
  };
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
  if (r.tipo === 'impostor') return cerrarPistas(p, r);
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

/** Si una pista dice la palabra secreta, se tapa: si no, el impostor la vería en la tele. */
export function censurar(pista: string, palabra: string | null): string {
  return palabra && normalizar(pista).includes(normalizar(palabra)) ? '🙊' : pista;
}

/** Impostor: guarda las pistas de la vuelta; después de la última se vota a un jugador. */
function cerrarPistas(p: Partida, r: Ronda): Partida {
  const pistas: Record<string, string[]> = {};
  for (const j of p.jugadores) {
    const texto = r.respuestas[j.id];
    pistas[j.id] = [...(r.pistas[j.id] ?? []), texto ? censurar(texto, r.palabra) : '—'];
  }
  if (r.vuelta < VUELTAS_IMPOSTOR) return { ...p, ronda: { ...r, pistas, respuestas: {}, vuelta: r.vuelta + 1 } };
  const opciones: Opcion[] = p.jugadores.map((j, i) => ({
    id: `o${i + 1}`,
    texto: j.nombre,
    autores: [j.id],
    verdad: j.id === r.impostor,
    senuelo: false,
    votantes: [],
  }));
  const siguiente: Partida = { ...p, fase: 'votar', ronda: { ...r, pistas, respuestas: {}, opciones } };
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

  let descubierto: boolean | null = null;
  if (r.tipo === 'impostor') {
    // Lo descubren si es el único más votado. Cada uno que lo votó suma; cada voto a otro lo suma él.
    const maximo = Math.max(0, ...opciones.map((o) => o.votantes.length));
    const masVotadas = opciones.filter((o) => maximo > 0 && o.votantes.length === maximo);
    descubierto = masVotadas.length === 1 && masVotadas[0].verdad;
    const delImpostor = opciones.find((o) => o.verdad);
    for (const [votante, op] of Object.entries(r.votos)) {
      if (votante === r.impostor) continue;
      if (op === delImpostor?.id) sumar(votante, PUNTOS.descubrir);
      else if (r.impostor) sumar(r.impostor, PUNTOS.despistar);
    }
    if (r.impostor && !descubierto) sumar(r.impostor, PUNTOS.escapar);
  } else if (r.tipo === 'chamuyo') {
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

  let destacado = p.destacado;
  for (const o of r.tipo === 'impostor' ? [] : opciones) {
    if (o.verdad || o.senuelo || !o.autores.length || !o.votantes.length) continue;
    // En empate gana la más reciente, salvo que le quite el lugar a una mentira (es lo más lindo de compartir).
    const empataYEsMejor = destacado && o.votantes.length === destacado.votos && (r.tipo === 'chamuyo' || destacado.tipo !== 'chamuyo');
    if (!destacado || o.votantes.length > destacado.votos || empataYEsMejor) {
      destacado = { tipo: r.tipo, consigna: r.consigna, texto: o.texto, autores: o.autores, votos: o.votantes.length };
    }
  }

  return {
    ...p,
    fase: 'revelar',
    destacado,
    ronda: { ...r, opciones, puntosRonda: ganados, descubierto },
    jugadores: p.jugadores.map((j) => ({ ...j, puntos: j.puntos + (ganados[j.id] ?? 0) })),
  };
}

/** Puntos que ganó cada autor gracias a una opción puntual (no el total de su ronda). */
export function puntosPorOpcion(r: Ronda, o: Opcion): number {
  if (o.verdad || !o.autores.length || r.tipo === 'impostor') return 0;
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
  return { ...p, fase: 'lobby', ronda: null, plan: [], totalRondas: 0, destacado: null, jugadores: p.jugadores.filter((j) => j.conectado) };
}

export function ranking(p: Partida): Jugador[] {
  return [...p.jugadores].sort((a, b) => b.puntos - a.puntos);
}
