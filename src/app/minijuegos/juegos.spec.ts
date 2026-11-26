import {
  AGUA,
  AHORA,
  crear,
  EMPANADAS,
  Entrada,
  EstadoAgua,
  EstadoAhora,
  EstadoDiez,
  EstadoEmpanadas,
  EstadoMate,
  EstadoPapa,
  EstadoPatio,
  EstadoSerpentina,
  orden,
  paso,
  puestos,
  vivos,
} from './juegos';

const azarFijo = () => 0.5;
const nada: Entrada = { x: 0, y: 0, toques: 0 };
const toque: Entrada = { x: 0, y: 0, toques: 1 };

function correr(e: ReturnType<typeof crear>, segundos: number, entradas: (t: number) => Record<string, Entrada>) {
  const dt = 1 / 60;
  for (let i = 0; i < segundos * 60 && !e.fin; i++) paso(e, dt, entradas(e.t), azarFijo);
  return e;
}

describe('minijuegos', () => {
  it('A todo mate: gana quien llega primero tocando más rápido', () => {
    const e = crear('mate', ['a', 'b', 'c'], azarFijo) as EstadoMate;
    let n = 0;
    correr(e, 30, () => {
      n++;
      // "a" toca en cada cuadro, "b" cada 2, "c" nunca.
      return { a: toque, b: n % 2 ? toque : nada, c: nada };
    });
    expect(e.fin).toBe(true);
    expect(orden(e)).toEqual(['a', 'b', 'c']);
    expect(e.llegada['c']).toBeNull();
  });

  it('¡Ahora!: tocar antes del "¡YA!" deja afuera y gana el primero en tocar después', () => {
    const e = crear('ahora', ['a', 'b'], azarFijo) as EstadoAhora;
    // "b" toca apenas empieza (antes de tiempo); "a" espera al "¡YA!".
    paso(e, 0.1, { a: nada, b: toque }, azarFijo);
    expect(e.fuera).toEqual(['b']);
    correr(e, 30, () => (e.etapa === 'ya' ? { a: toque, b: toque } : { a: nada, b: nada }));
    expect(e.fin).toBe(true);
    expect(e.puntos['a']).toBe(AHORA.subrondas);
    expect(orden(e)[0]).toBe('a');
  });

  it('¡Ahora!: si nadie suma, empatan todos', () => {
    const e = crear('ahora', ['a', 'b', 'c'], azarFijo) as EstadoAhora;
    correr(e, 60, () => ({ a: nada, b: nada, c: nada }));
    expect(e.fin).toBe(true);
    expect(puestos(e)).toEqual([['a', 'b', 'c']]);
  });

  it('Lluvia de empanadas: el último en pie gana', () => {
    const e = crear('empanadas', ['a', 'b'], azarFijo) as EstadoEmpanadas;
    // Una empanada cae justo sobre "b"; "a" está lejos.
    e.x['a'] = 100;
    e.x['b'] = 900;
    e.objetos.push({ x: 900, y: EMPANADAS.piso - 200, v: 400, giro: 0 });
    e.proximo = 999;
    correr(e, 3, () => ({ a: nada, b: nada }));
    expect(e.eliminado['b']).not.toBeNull();
    expect(e.eliminado['a']).toBeNull();
    expect(e.fin).toBe(true);
    expect(orden(e)).toEqual(['a', 'b']);
  });

  it('Pintá el patio: gana quien pinta más celdas', () => {
    const e = crear('patio', ['a', 'b'], azarFijo) as EstadoPatio;
    // "a" recorre la cancha; "b" se queda quieto.
    correr(e, 31, (t) => ({ a: { x: Math.cos(t * 2), y: Math.sin(t * 3), toques: 0 }, b: nada }));
    expect(e.fin).toBe(true);
    expect(orden(e)).toEqual(['a', 'b']);
  });

  it('Al agua: el que se tira del inflable queda afuera y el otro gana', () => {
    const e = crear('agua', ['a', 'b'], azarFijo) as EstadoAgua;
    // "a" arranca a la derecha y acelera hacia afuera; "b" no se mueve.
    correr(e, 10, () => ({ a: { x: 1, y: 0, toques: 0 }, b: nada }));
    expect(e.eliminado['a']).not.toBeNull();
    expect(e.eliminado['b']).toBeNull();
    expect(e.fin).toBe(true);
    expect(orden(e)).toEqual(['b', 'a']);
  });

  it('Al agua: chocar empuja al otro', () => {
    const e = crear('agua', ['a', 'b'], azarFijo) as EstadoAgua;
    e.cuerpos['a'] = { x: -150, y: 0, vx: 0, vy: 0 };
    e.cuerpos['b'] = { x: 0, y: 0, vx: 0, vy: 0 };
    correr(e, 1, () => ({ a: { x: 1, y: 0, toques: 0 }, b: nada }));
    expect(e.cuerpos['b'].x).toBeGreaterThan(20);
    expect(AGUA.radio).toBeGreaterThan(e.cuerpos['b'].x);
  });

  it('Papa caliente: se pasa al tocar, no vuelve enseguida y explota en la mano de quien la tiene', () => {
    const e = crear('papa', ['a', 'b'], azarFijo) as EstadoPapa;
    expect(e.portador).toBe('b');
    e.pos['a'] = { ...e.pos['b'] };
    paso(e, 0.05, {}, azarFijo);
    expect(e.portador).toBe('a');
    paso(e, 0.05, {}, azarFijo);
    // Siguen pegados, pero "b" no la puede recibir de vuelta todavía.
    expect(e.portador).toBe('a');
    e.pos['a'] = { x: 200, y: 200 };
    e.pos['b'] = { x: 1000, y: 500 };
    correr(e, 20, () => ({ a: nada, b: nada }));
    expect(e.fin).toBe(true);
    expect(e.eliminado['a']).not.toBeNull();
    expect(orden(e)).toEqual(['b', 'a']);
    expect(vivos(e)).toBe(1);
  });

  it('Serpentina: chocar contra el borde deja afuera', () => {
    const e = crear('serpentina', ['a', 'b'], azarFijo) as EstadoSerpentina;
    // "b" dobla hacia arriba hasta el borde; "a" sigue derecho.
    correr(e, 30, () => ({ a: nada, b: { x: 0, y: -1, toques: 0 } }));
    expect(e.fin).toBe(true);
    expect(e.eliminado['b']).not.toBeNull();
    expect(e.eliminado['a']).toBeNull();
    expect(orden(e)).toEqual(['a', 'b']);
  });

  it('Serpentina: no se puede pegar la vuelta en el lugar', () => {
    const e = crear('serpentina', ['a', 'b'], azarFijo) as EstadoSerpentina;
    const antes = { ...e.cabeza['a'] };
    correr(e, 0.2, () => ({ a: { x: -1, y: 0, toques: 0 }, b: nada }));
    expect(e.eliminado['a']).toBeNull();
    expect(e.cabeza['a'].c).toBeGreaterThan(antes.c);
  });

  it('Contá hasta diez: gana el que toca más cerca de los 10 segundos', () => {
    const e = crear('diez', ['a', 'b', 'c'], azarFijo) as EstadoDiez;
    correr(e, 25, (t) => ({ a: t >= 10.1 ? toque : nada, b: t >= 8 ? toque : nada, c: nada }));
    expect(e.fin).toBe(true);
    expect(e.toque['a']).toBeCloseTo(10.1, 1);
    // Vale solo el primer toque.
    expect(e.toque['b']).toBeCloseTo(8, 1);
    expect(orden(e)).toEqual(['a', 'b', 'c']);
  });
});
