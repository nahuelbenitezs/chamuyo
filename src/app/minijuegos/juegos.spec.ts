import { AHORA, crear, EMPANADAS, Entrada, EstadoAhora, EstadoEmpanadas, EstadoMate, EstadoPatio, orden, paso, puestos } from './juegos';

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
});
