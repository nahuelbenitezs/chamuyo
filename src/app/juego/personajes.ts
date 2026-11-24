/** Personajes que puede elegir cada jugador, con su color de fondo. */
export const PERSONAJES = [
  { avatar: '🦊', color: '#ff8a3d' },
  { avatar: '🐸', color: '#3ddc84' },
  { avatar: '🐙', color: '#ff6b9a' },
  { avatar: '🦄', color: '#b98cff' },
  { avatar: '🐧', color: '#4cc3ff' },
  { avatar: '🦁', color: '#ffd23f' },
  { avatar: '🐼', color: '#e9e6df' },
  { avatar: '🦖', color: '#7bd389' },
  { avatar: '🐝', color: '#ffb800' },
  { avatar: '🦉', color: '#c49a6c' },
  { avatar: '🐷', color: '#ffa3b5' },
  { avatar: '👽', color: '#9be15d' },
] as const;

export function colorDe(avatar: string): string {
  return PERSONAJES.find((p) => p.avatar === avatar)?.color ?? '#35323b';
}

/** Parte la consigna en texto y huecos (___) para dibujar el hueco. */
export function partesConsigna(consigna: string): Array<{ hueco: boolean; texto: string }> {
  // El signo que sigue al hueco viaja con él, para que nunca quede solo en otra línea.
  return consigna
    .split(/(_{3,}[.,;:!?)]*)/)
    .filter(Boolean)
    .map((texto) => (/^_{3,}/.test(texto) ? { hueco: true, texto: texto.replace(/_+/, '') } : { hueco: false, texto }));
}
