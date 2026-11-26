// El contenido (datos, consignas y palabras secretas) se baja aparte y solo en el idioma que se usa,
// para que la primera carga del sitio sea liviana.
import type { Contenido } from '../juego/motor';

export function cargarContenido(idioma: 'es' | 'en'): Promise<Contenido> {
  return idioma === 'es' ? import('./es').then((m) => m.contenidoEs) : import('./en').then((m) => m.contenidoEn);
}
