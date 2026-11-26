// Dibuja cada minijuego en un canvas de 1280×720 (la arena lógica); el CSS lo escala a la pantalla.
import {
  AGUA,
  AHORA,
  ALTO,
  ANCHO,
  celdasDe,
  DIEZ,
  EMPANADAS,
  EstadoAgua,
  EstadoAhora,
  EstadoDiez,
  EstadoEmpanadas,
  EstadoMate,
  EstadoMinijuego,
  EstadoPapa,
  EstadoPatio,
  EstadoSerpentina,
  PAPA,
  PATIO,
  restante,
  SERPENTINA,
  vivos,
} from './juegos';

export interface Recursos {
  avatar(id: string): HTMLImageElement | undefined;
  nombre(id: string): string;
  color(id: string): string;
  /** Empanadas sin cara que caen; cada una usa una de estas vistas. */
  empanadas: HTMLImageElement[];
  fondos: { empanadas: HTMLImageElement; patio: HTMLImageElement };
  /** Hay una escena 3D detrás del lienzo: solo se dibuja lo de arriba (reloj y carteles). */
  capa3d: boolean;
  textos: {
    esperaYa: string;
    ya: string;
    nadie: string;
    ganoSub: string;
    afuera: string;
    boom: string;
    contaEnTuCabeza: string;
    tocaALos: string;
    sinTocar: string;
    quedan: (n: number) => string;
  };
}

const COLOR = { fondo: '#131215', tarjeta: '#1d1c21', borde: '#35323b', texto: '#f3f2ee', tenue: '#aaa6b1', acento: '#ffd23f', verdad: '#3ddc84', mentira: '#ff6b5b' };
const FUENTE = "'Archivo Variable', system-ui, sans-serif";

function fuente(ctx: CanvasRenderingContext2D, peso: number, tam: number): void {
  ctx.font = `${peso} ${tam}px ${FUENTE}`;
}

function lista(im: HTMLImageElement | undefined): im is HTMLImageElement {
  return !!im && im.complete && im.naturalWidth > 0;
}

/** Texto con contorno oscuro, para que se lea arriba de cualquier fondo. */
function rotulo(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, color: string, grosor = 6): void {
  ctx.lineJoin = 'round';
  ctx.lineWidth = grosor;
  ctx.strokeStyle = 'rgba(19, 18, 21, 0.9)';
  ctx.strokeText(texto, x, y);
  ctx.fillStyle = color;
  ctx.fillText(texto, x, y);
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

function reloj(ctx: CanvasRenderingContext2D, e: EstadoMinijuego): void {
  const s = restante(e);
  if (s === null) return;
  fuente(ctx, 900, 56);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  rotulo(ctx, String(Math.ceil(s)), ANCHO - 28, 18, s <= 5 ? COLOR.mentira : COLOR.texto);
}

/** "Quedan N" arriba a la izquierda, en los juegos donde se queda afuera. */
function quedan(ctx: CanvasRenderingContext2D, e: EstadoMinijuego, r: Recursos): void {
  const n = vivos(e);
  if (n === null || e.id === 'empanadas') return;
  fuente(ctx, 800, 30);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  rotulo(ctx, r.textos.quedan(n), 28, 24, COLOR.texto);
}

export function dibujar(ctx: CanvasRenderingContext2D, e: EstadoMinijuego, r: Recursos): void {
  ctx.clearRect(0, 0, ANCHO, ALTO);
  if (!(e.id === 'agua' && r.capa3d)) {
    ctx.fillStyle = COLOR.fondo;
    ctx.fillRect(0, 0, ANCHO, ALTO);
  }
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
    case 'agua':
      dibujarAgua(ctx, e, r);
      break;
    case 'papa':
      dibujarPapa(ctx, e, r);
      break;
    case 'serpentina':
      dibujarSerpentina(ctx, e, r);
      break;
    case 'diez':
      dibujarDiez(ctx, e, r);
      break;
  }
  quedan(ctx, e, r);
  reloj(ctx, e);
}

function dibujarMate(ctx: CanvasRenderingContext2D, e: EstadoMate, r: Recursos): void {
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

function dibujarAhora(ctx: CanvasRenderingContext2D, e: EstadoAhora, r: Recursos): void {
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

function dibujarEmpanadas(ctx: CanvasRenderingContext2D, e: EstadoEmpanadas, r: Recursos): void {
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

function dibujarPatio(ctx: CanvasRenderingContext2D, e: EstadoPatio, r: Recursos): void {
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

/** Versión plana de Al agua, para cuando la tele no puede mostrar 3D. */
function dibujarAgua(ctx: CanvasRenderingContext2D, e: EstadoAgua, r: Recursos): void {
  if (r.capa3d) return;
  const cx = ANCHO / 2;
  const cy = ALTO / 2;
  const agua = ctx.createRadialGradient(cx, cy, 100, cx, cy, ANCHO * 0.7);
  agua.addColorStop(0, '#2f9bd6');
  agua.addColorStop(1, '#13507e');
  ctx.fillStyle = agua;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  // Inflable: aro a gajos celestes y blancos, con el centro claro.
  const gajos = 16;
  ctx.lineWidth = 34;
  for (let i = 0; i < gajos; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, e.radio, (i / gajos) * Math.PI * 2, ((i + 1) / gajos) * Math.PI * 2);
    ctx.strokeStyle = i % 2 ? '#f3f2ee' : '#74c0fc';
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, e.radio - 17, 0, Math.PI * 2);
  ctx.fillStyle = '#dff1fd';
  ctx.fill();
  for (const id of e.ids) {
    const c = e.cuerpos[id];
    const caida = e.eliminado[id];
    if (caida !== null && e.t - caida > 1) continue;
    const hundido = caida === null ? 1 : 1 - (e.t - caida);
    ctx.save();
    ctx.globalAlpha = hundido;
    ctx.beginPath();
    ctx.arc(cx + c.x, cy + c.y, AGUA.radioJugador, 0, Math.PI * 2);
    ctx.fillStyle = r.color(id);
    ctx.fill();
    ctx.restore();
    avatar(ctx, r, id, cx + c.x, cy + c.y - 18, 92 * hundido, caida !== null);
  }
}

function dibujarPapa(ctx: CanvasRenderingContext2D, e: EstadoPapa, r: Recursos): void {
  // Potrero: franjas de pasto y las líneas de la cancha.
  for (let x = 0; x < ANCHO; x += 80) {
    ctx.fillStyle = (x / 80) % 2 ? '#1f3f27' : '#1b3722';
    ctx.fillRect(x, 0, 80, ALTO);
  }
  ctx.strokeStyle = 'rgba(243, 242, 238, 0.22)';
  ctx.lineWidth = 5;
  ctx.strokeRect(30, 30, ANCHO - 60, ALTO - 60);
  ctx.beginPath();
  ctx.moveTo(ANCHO / 2, 30);
  ctx.lineTo(ANCHO / 2, ALTO - 30);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ANCHO / 2, ALTO / 2, 90, 0, Math.PI * 2);
  ctx.stroke();
  // Marcas de los que ya explotaron.
  for (const id of e.ids) {
    if (e.eliminado[id] === null) continue;
    const p = e.pos[id];
    ctx.fillStyle = 'rgba(10, 8, 6, 0.55)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 20, 46, 24, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  fuente(ctx, 800, 20);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const id of e.ids) {
    if (e.eliminado[id] !== null) continue;
    const p = e.pos[id];
    if (id === e.portador) {
      // Aro rojo que late más rápido cuanto menos falta.
      const falta = Math.max(0, e.explota - e.t);
      const pulso = 0.5 + 0.5 * Math.sin(e.t * (6 + (8 - Math.min(8, falta)) * 3));
      ctx.beginPath();
      ctx.arc(p.x, p.y, PAPA.radioJugador + 10 + pulso * 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 107, 91, ${0.25 + pulso * 0.3})`;
      ctx.fill();
    }
    avatar(ctx, r, id, p.x, p.y, 84);
    rotulo(ctx, r.nombre(id), p.x, p.y + 44, COLOR.texto, 5);
  }
  if (e.portador) {
    const p = e.pos[e.portador];
    const falta = Math.max(0, e.explota - e.t);
    const temblor = falta < 3 ? (3 - falta) * 4 : 0;
    papa(ctx, p.x + Math.sin(e.t * 47) * temblor, p.y - 64 + Math.cos(e.t * 53) * temblor, e.t);
  }
  if (e.boom && e.t - e.boom.t < 0.9) {
    const k = (e.t - e.boom.t) / 0.9;
    ctx.beginPath();
    ctx.arc(e.boom.x, e.boom.y, 40 + k * 240, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 160, 40, ${0.75 * (1 - k)})`;
    ctx.fill();
    fuente(ctx, 900, 96);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 1 - k * 0.6;
    rotulo(ctx, r.textos.boom, e.boom.x, e.boom.y - 40 - k * 30, COLOR.acento, 10);
    ctx.globalAlpha = 1;
  }
}

/** La papa caliente: una papa con mecha encendida. */
function papa(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#3d2613';
  ctx.beginPath();
  ctx.moveTo(8, -18);
  ctx.quadraticCurveTo(18, -34, 12, -44);
  ctx.stroke();
  const chispa = 7 + Math.sin(t * 30) * 3;
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(12, -46, chispa, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff6b5b';
  ctx.beginPath();
  ctx.arc(12, -46, chispa * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 25, -0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#c98b4b';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#4a2f17';
  ctx.stroke();
  ctx.fillStyle = '#8a5a2b';
  for (const [px, py] of [
    [-14, -6],
    [6, 8],
    [16, -8],
    [-4, 12],
  ]) {
    ctx.beginPath();
    ctx.arc(px, py, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function dibujarSerpentina(ctx: CanvasRenderingContext2D, e: EstadoSerpentina, r: Recursos): void {
  const lado = ANCHO / SERPENTINA.columnas;
  ctx.fillStyle = '#141318';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.strokeStyle = 'rgba(243, 242, 238, 0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < SERPENTINA.columnas; c++) {
    ctx.moveTo(c * lado, 0);
    ctx.lineTo(c * lado, ALTO);
  }
  for (let f = 1; f < SERPENTINA.filas; f++) {
    ctx.moveTo(0, f * lado);
    ctx.lineTo(ANCHO, f * lado);
  }
  ctx.stroke();
  const colores = new Map(e.ids.map((id) => [id, r.color(id)]));
  e.celdas.forEach((duenio, i) => {
    if (!duenio) return;
    const c = i % SERPENTINA.columnas;
    const f = Math.floor(i / SERPENTINA.columnas);
    ctx.globalAlpha = e.eliminado[duenio] === null ? 0.9 : 0.35;
    ctx.fillStyle = colores.get(duenio)!;
    ctx.fillRect(c * lado + 1, f * lado + 1, lado - 2, lado - 2);
  });
  ctx.globalAlpha = 1;
  for (const id of e.ids) {
    const h = e.cabeza[id];
    avatar(ctx, r, id, h.c * lado + lado / 2, h.f * lado + lado / 2, 52, e.eliminado[id] !== null);
  }
}

function dibujarDiez(ctx: CanvasRenderingContext2D, e: EstadoDiez, r: Recursos): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (e.revelarDesde === null) {
    if (e.t < DIEZ.visible) {
      fuente(ctx, 900, 240);
      ctx.fillStyle = COLOR.texto;
      ctx.fillText(e.t.toFixed(1), ANCHO / 2, ALTO / 2 - 70);
    } else {
      const pulso = 0.5 + 0.5 * Math.sin(e.t * 3);
      fuente(ctx, 900, 240);
      ctx.fillStyle = `rgba(255, 210, 63, ${0.25 + pulso * 0.35})`;
      ctx.fillText('?', ANCHO / 2, ALTO / 2 - 70);
      fuente(ctx, 800, 40);
      ctx.fillStyle = COLOR.tenue;
      ctx.fillText(r.textos.contaEnTuCabeza, ANCHO / 2, ALTO / 2 + 80);
    }
    fuente(ctx, 800, 34);
    ctx.fillStyle = COLOR.acento;
    ctx.fillText(r.textos.tocaALos, ANCHO / 2, 70);
    // Quién ya tocó (sin decir cuándo).
    const paso = ANCHO / (e.ids.length + 1);
    e.ids.forEach((id, i) => {
      const listo = e.toque[id] !== null;
      avatar(ctx, r, id, paso * (i + 1), ALTO - 90, 88, !listo);
      if (listo) {
        fuente(ctx, 900, 30);
        rotulo(ctx, '✓', paso * (i + 1) + 34, ALTO - 120, COLOR.verdad, 5);
      }
    });
    return;
  }
  // Revelación: cada uno en una línea de tiempo, con la marca de los 10 segundos.
  const desde = DIEZ.objetivo - 3;
  const hasta = DIEZ.objetivo + 3;
  // La columna de nombres ocupa la izquierda; la línea de tiempo arranca después.
  const x = (t: number) => 320 + ((Math.min(hasta, Math.max(desde, t)) - desde) / (hasta - desde)) * (ANCHO - 320 - 170);
  const alto = Math.min(78, 520 / e.ids.length);
  // Centrado en la pantalla, dejando lugar arriba para la marca de los 10 segundos.
  const y0 = Math.max(150, (ALTO - alto * e.ids.length) / 2 + 30);
  const meta = x(DIEZ.objetivo);
  ctx.strokeStyle = COLOR.acento;
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(meta, y0 - 30);
  ctx.lineTo(meta, y0 + alto * e.ids.length);
  ctx.stroke();
  ctx.setLineDash([]);
  fuente(ctx, 900, 36);
  rotulo(ctx, `${DIEZ.objetivo.toFixed(1)} s`, meta, y0 - 62, COLOR.acento);
  const ordenados = [...e.ids].sort((a, b) => dif(e, a) - dif(e, b));
  const enReveal = e.t - e.revelarDesde;
  ordenados.forEach((id, i) => {
    const visible = Math.min(1, Math.max(0, enReveal * 2 - i * 0.35));
    if (visible <= 0) return;
    const y = y0 + i * alto + alto / 2;
    const t = e.toque[id];
    ctx.globalAlpha = visible;
    ctx.fillStyle = i % 2 ? 'rgba(29, 28, 33, 0.6)' : 'rgba(24, 23, 27, 0.6)';
    ctx.fillRect(120, y - alto / 2, ANCHO - 240, alto);
    fuente(ctx, 800, 24);
    ctx.textAlign = 'left';
    ctx.fillStyle = COLOR.texto;
    ctx.fillText(r.nombre(id), 132, y);
    if (t === null) {
      ctx.textAlign = 'center';
      ctx.fillStyle = COLOR.tenue;
      ctx.fillText(r.textos.sinTocar, ANCHO / 2, y);
    } else {
      const px = x(t);
      avatar(ctx, r, id, px, y, alto * 0.9);
      fuente(ctx, 900, 26);
      const derecha = px > ANCHO - 330;
      ctx.textAlign = derecha ? 'right' : 'left';
      rotulo(ctx, `${t.toFixed(2)} s`, px + (derecha ? -alto * 0.55 : alto * 0.55), y, i === 0 ? COLOR.acento : COLOR.texto, 5);
    }
    ctx.globalAlpha = 1;
  });
}

function dif(e: EstadoDiez, id: string): number {
  const t = e.toque[id];
  return t === null ? Infinity : Math.abs(t - DIEZ.objetivo);
}
