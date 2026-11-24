import { Idioma } from '../i18n';

/** Personajes que puede elegir cada jugador. El id viaja por la red y elige la imagen. */
export const PERSONAJES = [
  { id: 'carpincho', es: 'Carpincho', en: 'Capybara', color: '#ff8a3d' },
  { id: 'mate', es: 'Mate', en: 'Mate', color: '#4cc3ff' },
  { id: 'empanada', es: 'Empanada', en: 'Empanada', color: '#ffd23f' },
  { id: 'alfajor', es: 'Alfajor', en: 'Alfajor', color: '#b98cff' },
  { id: 'tero', es: 'Tero', en: 'Lapwing', color: '#e9e6df' },
  { id: 'yaguarete', es: 'Yaguareté', en: 'Jaguar', color: '#ffb800' },
  { id: 'perezoso', es: 'Perezoso', en: 'Sloth', color: '#7bd389' },
  { id: 'tucan', es: 'Tucán', en: 'Toucan', color: '#ff6b9a' },
  { id: 'llama', es: 'Llama', en: 'Llama', color: '#ff6b5b' },
  { id: 'mulita', es: 'Mulita', en: 'Armadillo', color: '#c49a6c' },
  { id: 'choripan', es: 'Choripán', en: 'Choripán', color: '#2ec4b6' },
  { id: 'hornero', es: 'Hornero', en: 'Hornero', color: '#9be15d' },
] as const;

export type Variante = '' | 'sorpresa' | 'grande';

export function personaje(id: string) {
  return PERSONAJES.find((p) => p.id === id) ?? PERSONAJES[0];
}

export function imagen(id: string, variante: Variante = ''): string {
  return `arte/personajes/${personaje(id).id}${variante ? '-' + variante : ''}.webp`;
}

export function colorDe(id: string): string {
  return personaje(id).color;
}

export function nombrePersonaje(id: string, idioma: Idioma): string {
  return personaje(id)[idioma];
}

/** Parte la consigna en texto y huecos (___) para dibujar el hueco. */
export function partesConsigna(consigna: string): Array<{ hueco: boolean; texto: string }> {
  // El signo que sigue al hueco viaja con él, para que nunca quede solo en otra línea.
  return consigna
    .split(/(_{3,}[.,;:!?)]*)/)
    .filter(Boolean)
    .map((texto) => (/^_{3,}/.test(texto) ? { hueco: true, texto: texto.replace(/_+/, '') } : { hueco: false, texto }));
}
