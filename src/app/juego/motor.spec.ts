import {
  censurar,
  PUNTOS_PUESTO,
  resultadoMinijuego,
  agregarJugador,
  claveDe,
  avanzar,
  cerrarEscritura,
  Contenido,
  faltanVotar,
  iniciar,
  normalizar,
  nuevaPartida,
  opcionesPara,
  Partida,
  PUNTOS,
  puntosPorOpcion,
  puntuar,
  responder,
  votar,
} from './motor';

const azarFijo = () => {
  let s = 7;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

const contenido: Contenido = {
  datos: [{ texto: 'Los pulpos tienen ___ corazones.', verdad: 'tres', senuelos: ['dos', 'cuatro', 'ocho'] }],
  consignas: ['El peor nombre para un perfume', 'Lo que diría {jugador} en una entrevista'],
};

function conJugadores(n: number): Partida {
  let p = nuevaPartida();
  for (let i = 1; i <= n; i++) p = agregarJugador(p, { id: `j${i}`, nombre: `Jugador ${i}`, avatar: 'carpincho' });
  return p;
}

describe('motor', () => {
  it('normaliza tildes, mayúsculas y signos', () => {
    expect(normalizar('  ¡TRÉS!  ')).toBe('tres');
  });

  it('no deja entrar a nadie después de empezar', () => {
    const p = iniciar(conJugadores(3), 'chamuyo', 1, contenido, azarFijo());
    expect(agregarJugador(p, { id: 'x', nombre: 'Tarde', avatar: 'mate' }).jugadores).toHaveLength(3);
  });

  it('en Chamuyo premia a quien encuentra la verdad y a quien engaña', () => {
    let p = iniciar(conJugadores(3), 'chamuyo', 1, contenido, azarFijo());
    p = responder(p, 'j1', 'siete');
    p = responder(p, 'j2', 'nueve');
    p = responder(p, 'j3', 'once');
    p = cerrarEscritura(p, azarFijo());
    const r = p.ronda!;
    const verdad = r.opciones.find((o) => o.verdad)!;
    const mentiraJ1 = r.opciones.find((o) => o.autores.includes('j1'))!;
    expect(opcionesPara(p, 'j1').some((o) => o.id === mentiraJ1.id)).toBe(false);
    p = votar(p, 'j1', verdad.id);
    p = votar(p, 'j2', mentiraJ1.id);
    p = votar(p, 'j3', mentiraJ1.id);
    expect(faltanVotar(p)).toEqual([]);
    // Con una sola ronda no hay puntos dobles.
    const final = puntuar(p);
    const puntos = Object.fromEntries(final.jugadores.map((j) => [j.id, j.puntos]));
    expect(puntos).toEqual({ j1: PUNTOS.verdad + 2 * PUNTOS.engano, j2: 0, j3: 0 });
    // La tarjeta de la mentira muestra solo lo que ganó esa mentira, no el total de la ronda.
    const mentira = final.ronda!.opciones.find((o) => o.autores.includes('j1'))!;
    expect(puntosPorOpcion(final.ronda!, mentira)).toBe(2 * PUNTOS.engano);
  });

  it('quien escribe la verdad suma y no vota', () => {
    let p = iniciar(conJugadores(3), 'chamuyo', 1, contenido, azarFijo());
    p = responder(p, 'j1', 'Tres');
    p = responder(p, 'j2', 'dos');
    p = responder(p, 'j3', 'dos');
    p = cerrarEscritura(p, azarFijo());
    expect(p.ronda!.acertaron).toEqual(['j1']);
    expect(opcionesPara(p, 'j1')).toEqual([]);
    // Las respuestas iguales se juntan y se completa con un señuelo.
    expect(p.ronda!.opciones.filter((o) => !o.verdad)).toHaveLength(2);
    expect(p.ronda!.opciones.find((o) => o.autores.length === 2)?.texto).toBe('dos');
  });

  it('en Ocurrencias da puntos por voto y bono por unanimidad', () => {
    let p = iniciar(conJugadores(3), 'ocurrencias', 2, contenido, azarFijo());
    p = responder(p, 'j1', 'Olor a lunes');
    p = responder(p, 'j2', 'Eau de bondi');
    p = responder(p, 'j3', 'Mate lavado');
    p = cerrarEscritura(p, azarFijo());
    const de = (id: string) => p.ronda!.opciones.find((o) => o.autores.includes(id))!.id;
    p = votar(p, 'j1', de('j2'));
    p = votar(p, 'j3', de('j2'));
    p = votar(p, 'j2', de('j1'));
    const final = puntuar(p);
    const j2 = final.jugadores.find((j) => j.id === 'j2')!;
    expect(j2.puntos).toBe(2 * PUNTOS.voto);
    expect(final.ronda!.dobles).toBe(false);
  });

  it('la última ronda vale doble y después termina la partida', () => {
    let p = iniciar(conJugadores(2), 'ocurrencias', 2, contenido, azarFijo());
    p = cerrarEscritura(p, azarFijo()); // nadie respondió: se salta la votación
    expect(p.fase).toBe('revelar');
    p = avanzar(avanzar(p, azarFijo()), azarFijo());
    expect(p.ronda!.dobles).toBe(true);
    expect(p.ronda!.consigna).toMatch(/Jugador [12]|perfume/);
    p = cerrarEscritura(p, azarFijo());
    p = avanzar(avanzar(p, azarFijo()), azarFijo());
    expect(p.fase).toBe('final');
  });

  it('guarda la mentira que más engañó como destacada', () => {
    let p = iniciar(conJugadores(3), 'chamuyo', 1, contenido, azarFijo());
    p = responder(p, 'j1', 'siete');
    p = responder(p, 'j2', 'nueve');
    p = responder(p, 'j3', 'once');
    p = cerrarEscritura(p, azarFijo());
    const deJ1 = p.ronda!.opciones.find((o) => o.autores.includes('j1'))!.id;
    p = votar(p, 'j2', deJ1);
    p = votar(p, 'j3', deJ1);
    p = puntuar(p);
    expect(p.destacado).toEqual(
      expect.objectContaining({ tipo: 'chamuyo', texto: 'siete', autores: ['j1'], votos: 2 }),
    );
  });

  it('prefiere el contenido que todavía no salió', () => {
    const muchas: Contenido = { datos: [], consignas: ['uno', 'dos', 'tres', 'cuatro'] };
    const usados = new Set(['uno', 'dos', 'tres'].map((consigna) => claveDe({ consigna })));
    const p = iniciar(conJugadores(2), 'ocurrencias', 1, muchas, azarFijo(), usados);
    expect(p.ronda!.consigna).toBe('cuatro');
  });

  it('el modo minijuegos arma rondas de minijuego y reparte puntos por puesto', () => {
    let p = iniciar(conJugadores(3), 'minijuegos', 2, contenido, azarFijo());
    expect(p.fase).toBe('minijuego');
    expect(p.ronda!.minijuego).not.toBeNull();
    p = resultadoMinijuego(p, [['j2'], ['j3'], ['j1']]);
    expect(p.fase).toBe('revelar');
    const puntos = Object.fromEntries(p.jugadores.map((j) => [j.id, j.puntos]));
    expect(puntos).toEqual({ j2: PUNTOS_PUESTO[0], j3: PUNTOS_PUESTO[1], j1: PUNTOS_PUESTO[2] });
    p = avanzar(avanzar(p, azarFijo()), azarFijo());
    // La última ronda vale doble.
    expect(p.ronda!.dobles).toBe(true);
    p = resultadoMinijuego(p, [['j1'], ['j2'], ['j3']]);
    expect(p.jugadores.find((j) => j.id === 'j1')!.puntos).toBe(PUNTOS_PUESTO[2] + 2 * PUNTOS_PUESTO[0]);
  });

  it('en un minijuego los empatados comparten puesto y puntos', () => {
    let p = iniciar(conJugadores(3), 'minijuegos', 2, contenido, azarFijo());
    p = resultadoMinijuego(p, [['j1', 'j2'], ['j3']]);
    const puntos = Object.fromEntries(p.jugadores.map((j) => [j.id, j.puntos]));
    expect(puntos).toEqual({ j1: PUNTOS_PUESTO[0], j2: PUNTOS_PUESTO[0], j3: PUNTOS_PUESTO[2] });
    expect(p.ronda!.lugar).toEqual({ j1: 1, j2: 1, j3: 3 });
  });

  it('el Impostor: dos vueltas de pistas, se vota y suman los que lo descubren', () => {
    const conPalabras: Contenido = { ...contenido, secretas: [{ categoria: 'Comidas', palabra: 'Empanada' }] };
    let p = iniciar(conJugadores(4), 'impostor', 1, conPalabras, azarFijo());
    const r = p.ronda!;
    expect(r.tipo).toBe('impostor');
    expect(r.consigna).toBe('Comidas');
    const imp = r.impostor!;
    const otros = ['j1', 'j2', 'j3', 'j4'].filter((id) => id !== imp);
    for (const id of ['j1', 'j2', 'j3', 'j4']) p = responder(p, id, id === otros[0] ? 'empanadas al horno' : 'rica');
    p = cerrarEscritura(p, azarFijo());
    // Primera vuelta guardada; la pista que decía la palabra quedó tapada.
    expect(p.fase).toBe('escribir');
    expect(p.ronda!.vuelta).toBe(2);
    expect(p.ronda!.pistas[otros[0]]).toEqual(['🙊']);
    p = cerrarEscritura(p, azarFijo());
    expect(p.fase).toBe('votar');
    const opcionDe = (id: string) => p.ronda!.opciones.find((o) => o.autores.includes(id))!.id;
    // Nadie se puede votar a sí mismo.
    expect(opcionesPara(p, otros[0]).some((o) => o.autores.includes(otros[0]))).toBe(false);
    p = votar(p, otros[0], opcionDe(imp));
    p = votar(p, otros[1], opcionDe(imp));
    p = votar(p, otros[2], opcionDe(otros[0]));
    p = votar(p, imp, opcionDe(otros[1]));
    p = puntuar(p);
    const puntos = Object.fromEntries(p.jugadores.map((j) => [j.id, j.puntos]));
    expect(p.ronda!.descubierto).toBe(true);
    expect(puntos[otros[0]]).toBe(PUNTOS.descubrir);
    expect(puntos[otros[1]]).toBe(PUNTOS.descubrir);
    expect(puntos[otros[2]]).toBe(0);
    expect(puntos[imp]).toBe(PUNTOS.despistar);
  });

  it('si el impostor se escapa, suma por escaparse y por cada voto a otro', () => {
    const conPalabras: Contenido = { ...contenido, secretas: [{ categoria: 'Lugares', palabra: 'Playa' }] };
    let p = iniciar(conJugadores(3), 'impostor', 1, conPalabras, azarFijo());
    const imp = p.ronda!.impostor!;
    const otros = ['j1', 'j2', 'j3'].filter((id) => id !== imp);
    p = cerrarEscritura(cerrarEscritura(p, azarFijo()), azarFijo());
    const opcionDe = (id: string) => p.ronda!.opciones.find((o) => o.autores.includes(id))!.id;
    p = votar(p, otros[0], opcionDe(otros[1]));
    p = votar(p, otros[1], opcionDe(otros[0]));
    p = puntuar(p);
    expect(p.ronda!.descubierto).toBe(false);
    expect(p.jugadores.find((j) => j.id === imp)!.puntos).toBe(PUNTOS.escapar + 2 * PUNTOS.despistar);
  });

  it('el Impostor no arranca con dos y Mixto lo suma solo desde tres', () => {
    const conPalabras: Contenido = { ...contenido, secretas: [{ categoria: 'Animales', palabra: 'Carpincho' }] };
    expect(iniciar(conJugadores(2), 'impostor', 2, conPalabras, azarFijo()).fase).toBe('lobby');
    expect(iniciar(conJugadores(2), 'mixto', 4, conPalabras, azarFijo()).plan.map((x) => x.tipo)).toEqual(['chamuyo', 'ocurrencias', 'minijuego', 'ocurrencias']);
    expect(iniciar(conJugadores(3), 'mixto', 4, conPalabras, azarFijo()).plan.map((x) => x.tipo)).toEqual(['chamuyo', 'ocurrencias', 'impostor', 'minijuego']);
  });

  it('tapa las pistas que dicen la palabra secreta', () => {
    expect(censurar('Empanadas!', 'empanada')).toBe('🙊');
    expect(censurar('horno', 'empanada')).toBe('horno');
  });
});
