// Conteo anónimo de visitas y eventos con GoatCounter (sin cookies). Si el script no cargó, no hace nada.
type GoatCounter = { count?: (o: { path: string; title: string; event: boolean }) => void };

export function contar(evento: string): void {
  try {
    (window as unknown as { goatcounter?: GoatCounter }).goatcounter?.count?.({ path: evento, title: evento, event: true });
  } catch {
    /* el conteo nunca debe romper el juego */
  }
}
