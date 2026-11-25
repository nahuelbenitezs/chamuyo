import { normalizar } from '../juego/motor';
import { contenidoEn } from './en';
import { contenidoEs } from './es';

describe('contenido', () => {
  for (const [idioma, c] of [
    ['es', contenidoEs],
    ['en', contenidoEn],
  ] as const) {
    it(`${idioma}: cada dato tiene un hueco, una verdad y señuelos distintos de la verdad`, () => {
      for (const d of c.datos) {
        expect(d.texto.match(/_{3,}/g), d.texto).toHaveLength(1);
        expect(d.senuelos.length, d.texto).toBeGreaterThanOrEqual(2);
        const verdad = normalizar(d.verdad);
        for (const s of d.senuelos) expect(normalizar(s), d.texto).not.toBe(verdad);
        expect(new Set(d.senuelos.map(normalizar)).size, d.texto).toBe(d.senuelos.length);
      }
    });

    it(`${idioma}: no hay datos ni consignas repetidos`, () => {
      expect(new Set(c.datos.map((d) => normalizar(d.texto))).size).toBe(c.datos.length);
      expect(new Set(c.consignas.map(normalizar)).size).toBe(c.consignas.length);
    });
  }

  it('los dos idiomas tienen la misma cantidad de contenido', () => {
    expect(contenidoEn.datos.length).toBe(contenidoEs.datos.length);
    expect(contenidoEn.consignas.length).toBe(contenidoEs.consignas.length);
  });
});
