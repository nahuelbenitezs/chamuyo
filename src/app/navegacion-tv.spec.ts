import { Caja, elegirVecino } from './navegacion-tv';

const boton = (x: number, y: number): Caja => ({ x, y, ancho: 100, alto: 50 });

describe('navegación con el control remoto', () => {
  // Una grilla de 2×2 y un botón grande abajo:
  //  [0] [1]
  //  [2] [3]
  //    [4]
  const grilla = [boton(0, 0), boton(200, 0), boton(0, 100), boton(200, 100), boton(100, 220)];

  it('cada flecha va al vecino de esa dirección', () => {
    const desde = grilla[0];
    const otros = grilla.slice(1);
    expect(otros[elegirVecino(desde, otros, 'derecha')]).toBe(grilla[1]);
    expect(otros[elegirVecino(desde, otros, 'abajo')]).toBe(grilla[2]);
  });

  it('prefiere el que está alineado aunque haya otro más cerca en diagonal', () => {
    const desde = grilla[2];
    const otros = [grilla[0], grilla[1], grilla[3], grilla[4]];
    expect(otros[elegirVecino(desde, otros, 'derecha')]).toBe(grilla[3]);
    expect(otros[elegirVecino(desde, otros, 'abajo')]).toBe(grilla[4]);
  });

  it('si no hay nada en esa dirección, no se mueve', () => {
    const desde = grilla[0];
    expect(elegirVecino(desde, grilla.slice(1), 'izquierda')).toBe(-1);
    expect(elegirVecino(desde, grilla.slice(1), 'arriba')).toBe(-1);
  });

  it('no salta a un botón lejano de arriba cuando a la derecha no hay nada', () => {
    const encabezado = { x: 300, y: -400, ancho: 40, alto: 40 };
    const desde = grilla[1];
    const otros = [grilla[0], grilla[2], grilla[3], encabezado];
    expect(elegirVecino(desde, otros, 'derecha')).toBe(-1);
  });

  it('desde un botón ancho, abajo va al primero de la fila de abajo', () => {
    const ancho = { x: 0, y: -100, ancho: 300, alto: 50 };
    expect(grilla[elegirVecino(ancho, grilla, 'abajo')]).toBe(grilla[0]);
  });
});
