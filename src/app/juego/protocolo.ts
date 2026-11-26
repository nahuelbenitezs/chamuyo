import { Control, CONTROL, IdMinijuego } from '../minijuegos/juegos';
import { faltanResponder, Modo, opcionesPara, Partida, ranking, TipoRonda } from './motor';

/** Mensajes que manda un celular a la pantalla anfitriona. */
export type MsgJugador =
  | { t: 'hola'; id: string; nombre: string; avatar: string }
  | { t: 'responder'; texto: string }
  | { t: 'votar'; opcion: string }
  | { t: 'empezar'; modo: Modo }
  | { t: 'otra' }
  /** Joystick de los minijuegos: x e y entre -1 y 1. */
  | { t: 'mando'; x: number; y: number }
  /** Un toque del botón de los minijuegos. */
  | { t: 'toque' };

export type EtapaMinijuego = 'intro' | 'jugando' | 'resultado';

/** Lo que tiene que mostrar cada celular. `restante` va en milisegundos. */
export type Vista =
  | { v: 'lleno' }
  | { v: 'empezada' }
  | { v: 'lobby'; jefe: boolean; cantidad: number; nombre: string; avatar: string; nombreJefe: string; modo: Modo }
  | { v: 'escribir'; tipo: TipoRonda; consigna: string; enviado: string | null; restante: number; ronda: number; total: number }
  | { v: 'acerto'; consigna: string }
  | { v: 'votar'; tipo: TipoRonda; consigna: string; opciones: Array<{ id: string; texto: string }>; elegido: string | null; restante: number }
  | { v: 'mirar'; motivo: 'votando' | 'revelando' | 'tabla' | 'sin-opciones' }
  | { v: 'final'; puesto: number; puntos: number; jefe: boolean; ganador: string; empate: boolean; resumen: Resumen }
  | { v: 'control'; juego: IdMinijuego; control: Control; etapa: EtapaMinijuego; puesto: number | null; ganados: number };

/** Lo necesario para dibujar la tarjeta para compartir al final de la partida. */
export interface Resumen {
  podio: Array<{ nombre: string; avatar: string; puntos: number }>;
  destacado: { tipo: TipoRonda; consigna: string; texto: string; autor: string; avatar: string; votos: number } | null;
}

export function resumen(p: Partida): Resumen {
  const orden = ranking(p);
  const d = p.destacado;
  const autor = d ? p.jugadores.find((j) => j.id === d.autores[0]) : undefined;
  return {
    podio: orden.slice(0, 3).map(({ nombre, avatar, puntos }) => ({ nombre, avatar, puntos })),
    destacado: d && autor ? { tipo: d.tipo, consigna: d.consigna, texto: d.texto, autor: autor.nombre, avatar: autor.avatar, votos: d.votos } : null,
  };
}

export const PREFIJO_SALA = 'chamuyo-v1-';
const LETRAS = 'BCDFGHJKLMNPQRSTVWXZ';

export function codigoSala(azar: () => number = Math.random): string {
  return Array.from({ length: 4 }, () => LETRAS[Math.floor(azar() * LETRAS.length)]).join('');
}

export function codigoValido(codigo: string): boolean {
  return new RegExp(`^[${LETRAS}]{4}$`).test(codigo);
}

export function idJefe(p: Partida): string | null {
  return p.jugadores.find((j) => j.conectado)?.id ?? null;
}

export function vistaPara(p: Partida, id: string, restante: number, etapa: EtapaMinijuego = 'intro'): Vista {
  const yo = p.jugadores.find((j) => j.id === id);
  if (!yo) return p.fase === 'lobby' ? { v: 'lleno' } : { v: 'empezada' };
  const jefe = idJefe(p) === id;
  const r = p.ronda;

  switch (p.fase) {
    case 'lobby': {
      const nombreJefe = p.jugadores.find((j) => j.id === idJefe(p))?.nombre ?? '';
      return { v: 'lobby', jefe, cantidad: p.jugadores.length, nombre: yo.nombre, avatar: yo.avatar, nombreJefe, modo: p.modo };
    }
    case 'escribir':
      return {
        v: 'escribir',
        tipo: r!.tipo,
        consigna: r!.consigna,
        enviado: r!.respuestas[id] ?? null,
        restante,
        ronda: r!.numero,
        total: p.totalRondas,
      };
    case 'votar': {
      if (r!.acertaron.includes(id)) return { v: 'acerto', consigna: r!.consigna };
      const opciones = opcionesPara(p, id).map(({ id: oid, texto }) => ({ id: oid, texto }));
      if (!opciones.length) return { v: 'mirar', motivo: 'sin-opciones' };
      return { v: 'votar', tipo: r!.tipo, consigna: r!.consigna, opciones, elegido: r!.votos[id] ?? null, restante };
    }
    case 'minijuego':
      return { v: 'control', juego: r!.minijuego!, control: CONTROL[r!.minijuego!], etapa, puesto: null, ganados: 0 };
    case 'revelar':
      if (r!.tipo === 'minijuego') {
        const puesto = r!.lugar[id];
        return {
          v: 'control',
          juego: r!.minijuego!,
          control: CONTROL[r!.minijuego!],
          etapa: 'resultado',
          puesto: puesto ?? null,
          ganados: r!.puntosRonda[id] ?? 0,
        };
      }
      return { v: 'mirar', motivo: 'revelando' };
    case 'tabla':
      return { v: 'mirar', motivo: 'tabla' };
    case 'final': {
      const orden = ranking(p);
      return {
        v: 'final',
        // Con los mismos puntos se comparte el puesto.
        puesto: 1 + orden.filter((j) => j.puntos > yo.puntos).length,
        puntos: yo.puntos,
        jefe,
        ganador: orden[0]?.nombre ?? '',
        empate: orden.length > 1 && orden[0].puntos === orden[1].puntos,
        resumen: resumen(p),
      };
    }
  }
}

export { faltanResponder };
