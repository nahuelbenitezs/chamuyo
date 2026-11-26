// Dibuja cada minijuego en un canvas de 1280×720 (la arena lógica); el CSS lo escala a la pantalla.
import { AHORA, ALTO, ANCHO, celdasDe, EMPANADAS, EstadoMinijuego, PATIO, restante } from './juegos';

export interface Recursos {
  avatar(id: string): HTMLImageElement | undefined;
  nombre(id: string): string;
  color(id: string): string;
  /** Empanadas sin cara que caen; cada una usa una de estas vistas. */
  empanadas: HTMLImageElement[];
  fondos: { empanadas: HTMLImageElement; patio: HTMLImageElement };
  textos: { esperaYa: string; ya: string; nadie: string; ganoSub: string; afuera: string };
}

const COLOR = { fondo: '#131215', tarjeta: '#1d1c21', borde: '#35323b', texto: '#f3f2ee', tenue: '#aaa6b1', acento: '#ffd23f', verdad: '#3ddc84', mentira: '#ff6b5b' };
const FUENTE = "'Archivo Variable', system-ui, sans-serif";

function fuente(ctx: CanvasRenderingContext2D, peso: number, tam: number): void {
  ctx.font = `${peso} ${tam}px ${FUENTE}`;
}

function avatar(ctx: CanvasRenderingContext2D, r: Recursos, id: string, x: number, y: number, lado: number, apagado = false): void {
  const im = r.avatar(id);
  ctx.save();
  if (apagado) {
    ctx.globalAlpha = 0.35;
    ctx.filter = 'grayscale(1)';
  }
  if (lista(im)) ctx.drawImage(im, x - lado / 2, y - lado / 2, lado, lado);
  else {
    ctx.fillStyle = r.color(id);
    ctx.beginPath();
    ctx.arc(x, y, lado / 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function lista(im: HTMLImageElement | undefined): im is HTMLImageElement {
  return !!im && im.complete && im.naturalWidth > 0;
}

/** Texto con contorno oscuro, para que se lea arriba de cualquier fondo. */
function rotulo(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, color: string): void {
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(19, 18, 21, 0.9)';
  ctx.strokeText(texto, x, y);
  ctx.fillStyle = color;
  ctx.fillText(texto, x, y);
}

function reloj(ctx: CanvasRenderingContext2D, e: EstadoMinijuego): void {
  const s = restante(e);
  if (s === null) return;
  fuente(ctx, 900, 56);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  rotulo(ctx, String(Math.ceil(s)), ANCHO - 28, 18, s <= 5 ? COLOR.mentira : COLOR.texto);
}

export function dibujar(ctx: CanvasRenderingContext2D, e: EstadoMinijuego, r: Recursos): void {
  ctx.clearRect(0, 0, ANCHO, ALTO);
  ctx.fillStyle = COLOR.fondo;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  switch (e.id) {
    case 'mate':
      dibujarMate(ctx, e, r);
      break;
    case 'ahora':
      dibujarAhora(ctx, e, r);
      break;
    case 'empanadas':
      dibujarEmpanadas(ctx, e, r);
      break;
    case 'patio':
      dibujarPatio(ctx, e, r);
      break;
  }
  reloj(ctx, e);
}

function dibujarMate(ctx: CanvasRenderingContext2D, e: Extract<EstadoMinijuego, { id: 'mate' }>, r: Recursos): void {
  const n = e.ids.length;
  const alto = Math.min(110, (ALTO - 120) / n);
  const x0 = 170;
  const x1 = ANCHO - 120;
  // Meta a cuadros.
  for (let f = 0; f < (ALTO - 100) / 20; f++) {
    for (let c = 0; c < 2; c++) {
      ctx.fillStyle = (f + c) % 2 ? COLOR.texto : COLOR.fondo;
      ctx.fillRect(x1 + c * 20, 90 + f * 20, 20, 20);
    }
  }
  e.ids.forEach((id, i) => {
    const y = 110 + i * alto + alto / 2;
    ctx.fillStyle = i % 2 ? COLOR.tarjeta : '#18171b';
    ctx.fillRect(0, y - alto / 2, x1, alto);
    const x = x0 + (e.progreso[id] / 100) * (x1 - x0 - 40);
    // Estela del color del jugador.
    ctx.fillStyle = r.color(id);
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x0, y - 8, x - x0, 16);
    ctx.globalAlpha = 1;
    avatar(ctx, r, id, x, y, alto * 0.95);
    fuente(ctx, 800, 26);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLOR.texto;
    ctx.fillText(r.nombre(id), 16, y);
    if (e.llegada[id] !== null) {
      fuente(ctx, 900, 30);
      ctx.fillStyle = COLOR.acento;
      ctx.fillText('✓', x1 - 60, y);
    }
  });
}

function dibujarAhora(ctx: CanvasRenderingContext2D, e: Extract<EstadoMinijuego, { id: 'ahora' }>, r: Recursos): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (e.etapa === 'ya') {
    ctx.fillStyle = COLOR.verdad;
    ctx.fillRect(0, 0, ANCHO, ALTO);
    fuente(ctx, 900, 260);
    ctx.fillStyle = '#062614';
    ctx.fillText(r.textos.ya, ANCHO / 2, ALTO / 2 - 40);
  } else if (e.etapa === 'espera') {
    const pulso = 0.5 + 0.5 * Math.sin(e.t * 6);
    fuente(ctx, 900, 140);
    ctx.fillStyle = `rgba(255, 210, 63, ${0.35 + pulso * 0.4})`;
    ctx.fillText(r.textos.esperaYa, ANCHO / 2, ALTO / 2 - 40);
  } else {
    fuente(ctx, 900, 64);
    ctx.fillStyle = COLOR.tenue;
    if (e.ganadorSub) {
      ctx.fillText(`${r.textos.ganoSub} ${r.nombre(e.ganadorSub)}`, ANCHO / 2, 140);
      avatar(ctx, r, e.ganadorSub, ANCHO / 2, ALTO / 2 - 20, 260);
    } else {
      ctx.fillText(r.textos.nadie, ANCHO / 2, ALTO / 2 - 40);
    }
  }
  // Fila de jugadores con sus estrellas.
  const paso = ANCHO / (e.ids.length + 1);
  e.ids.forEach((id, i) => {
    const x = paso * (i + 1);
    const fuera = e.fuera.includes(id);
    avatar(ctx, r, id, x, ALTO - 110, 96, fuera);
    fuente(ctx, 800, 22);
    ctx.fillStyle = e.etapa === 'ya' ? '#062614' : COLOR.texto;
    ctx.fillText(fuera ? r.textos.afuera : '★'.repeat(e.puntos[id]) || '·', x, ALTO - 42);
  });
  fuente(ctx, 800, 26);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = e.etapa === 'ya' ? '#062614' : COLOR.tenue;
  ctx.fillText(`${Math.min(e.subronda + 1, AHORA.subrondas)} / ${AHORA.subrondas}`, 28, 24);
}

function dibujarEmpanadas(ctx: CanvasRenderingContext2D, e: Extract<EstadoMinijuego, { id: 'empanadas' }>, r: Recursos): void {
  // Patio de noche con la parrilla; las baldosas del piso empiezan a la altura de los pies.
  if (lista(r.fondos.empanadas)) ctx.drawImage(r.fondos.empanadas, 0, 0, ANCHO, ALTO);
  else {
    const cielo = ctx.createLinearGradient(0, 0, 0, ALTO);
    cielo.addColorStop(0, '#1b1a2a');
    cielo.addColorStop(1, '#131215');
    ctx.fillStyle = cielo;
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.fillStyle = '#2a2530';
    ctx.fillRect(0, EMPANADAS.piso + 45, ANCHO, ALTO);
  }
  for (const o of e.objetos) {
    // Cada empanada mantiene su vista mientras cae: sale de dónde apareció.
    const im = r.empanadas[Math.floor(o.x) % r.empanadas.length];
    if (!lista(im)) continue;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.giro);
    ctx.drawImage(im, -44, -44, 88, 88);
    ctx.restore();
  }
  fuente(ctx, 800, 20);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const id of e.ids) {
    const fuera = e.eliminado[id] !== null;
    avatar(ctx, r, id, e.x[id], EMPANADAS.piso, 92, fuera);
    rotulo(ctx, r.nombre(id), e.x[id], EMPANADAS.piso + 52, fuera ? COLOR.tenue : COLOR.texto);
  }
}

function dibujarPatio(ctx: CanvasRenderingContext2D, e: Extract<EstadoMinijuego, { id: 'patio' }>, r: Recursos): void {
  const lado = ANCHO / PATIO.columnas;
  // Baldosas casi grises (vienen así de fábrica) para que la pintura resalte.
  if (lista(r.fondos.patio)) ctx.drawImage(r.fondos.patio, 0, 0, ANCHO, ALTO);
  for (let f = 0; f < PATIO.filas; f++) {
    for (let c = 0; c < PATIO.columnas; c++) {
      const duenio = e.celdas[f * PATIO.columnas + c];
      if (!duenio && lista(r.fondos.patio)) continue;
      ctx.fillStyle = duenio ? r.color(duenio) : (f + c) % 2 ? '#1a191e' : '#1e1d22';
      ctx.globalAlpha = duenio ? 0.85 : 1;
      ctx.fillRect(c * lado, f * lado, lado - 1, lado - 1);
    }
  }
  ctx.globalAlpha = 1;
  for (const id of e.ids) avatar(ctx, r, id, e.pos[id].x, e.pos[id].y, 70);
  // Marcador arriba a la izquierda.
  const cuenta = celdasDe(e);
  const orden = [...e.ids].sort((a, b) => cuenta[b] - cuenta[a]);
  ctx.fillStyle = 'rgba(19, 18, 21, 0.75)';
  ctx.fillRect(12, 12, 250, 22 + orden.length * 30);
  fuente(ctx, 800, 22);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  orden.forEach((id, i) => {
    ctx.fillStyle = r.color(id);
    ctx.fillRect(24, 26 + i * 30, 16, 16);
    ctx.fillStyle = COLOR.texto;
    ctx.fillText(`${r.nombre(id)} · ${cuenta[id]}`, 50, 22 + i * 30);
  });
}
