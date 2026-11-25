// Dibuja la tarjeta vertical (formato historia, 1080×1920) que cada jugador puede compartir al final.
import { t } from '../i18n';
import { imagen } from './personajes';
import { Resumen } from './protocolo';

const W = 1080;
const H = 1920;
const FUENTE = "'Archivo Variable', system-ui, sans-serif";
const COLOR = { fondo: '#131215', tarjeta: '#1d1c21', texto: '#f3f2ee', tenue: '#aaa6b1', acento: '#ffd23f', mentira: '#ff6b5b' };
const URL_JUEGO = 'nahuelbenitezs.github.io/chamuyo';

function cargar(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = mal;
    im.src = src;
  });
}

function fuente(ctx: CanvasRenderingContext2D, peso: number, tam: number, angosta = false): void {
  ctx.font = `${peso} ${tam}px ${FUENTE}`;
  (ctx as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = angosta ? 'condensed' : 'normal';
}

/** Parte el texto en líneas que entren en `ancho`. */
function lineas(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const salida: string[] = [];
  let actual = '';
  for (const palabra of texto.split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > ancho && actual) {
      salida.push(actual);
      actual = palabra;
    } else actual = prueba;
  }
  if (actual) salida.push(actual);
  return salida;
}

function rectRedondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export async function dibujarTarjeta(r: Resumen): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`900 80px ${FUENTE}`),
    document.fonts.load(`700 40px ${FUENTE}`),
  ]).catch(() => undefined);
  const textos = t();
  const ganador = r.podio[0];
  const [patron, mascota, estrella, autor] = await Promise.all([
    cargar('arte/patron.webp'),
    cargar('arte/mascota.webp'),
    ganador ? cargar(imagen(ganador.avatar, 'grande')) : Promise.resolve(null),
    r.destacado ? cargar(imagen(r.destacado.avatar)) : Promise.resolve(null),
  ]);

  const lienzo = document.createElement('canvas');
  lienzo.width = W;
  lienzo.height = H;
  const ctx = lienzo.getContext('2d')!;

  // Fondo: color, patrón y una luz amarilla arriba.
  ctx.fillStyle = COLOR.fondo;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ctx.createPattern(patron, 'repeat')!;
  ctx.fillRect(0, 0, W, H);
  const luz = ctx.createRadialGradient(W / 2, 360, 40, W / 2, 360, 760);
  luz.addColorStop(0, 'rgba(255, 210, 63, 0.32)');
  luz.addColorStop(1, 'rgba(255, 210, 63, 0)');
  ctx.fillStyle = luz;
  ctx.fillRect(0, 0, W, H);

  // Marca.
  ctx.drawImage(mascota, W / 2 - 250, 92, 96, 96);
  ctx.fillStyle = COLOR.acento;
  fuente(ctx, 900, 92, true);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('CHAMUYO', W / 2 - 140, 144);

  // Ganador.
  ctx.textAlign = 'center';
  let y = 260;
  if (estrella && ganador) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowOffsetY = 14;
    ctx.drawImage(estrella, W / 2 - 210, y, 420, 420);
    ctx.restore();
    ctx.fillStyle = COLOR.acento;
    fuente(ctx, 900, 120, true);
    const titulo = `${ganador.nombre.toUpperCase()} ${textos.gano.toUpperCase()}`;
    y += 500;
    for (const l of lineas(ctx, titulo, W - 140)) {
      ctx.fillText(l, W / 2, y);
      y += 114;
    }
    y += 10;
  }

  // La mentira (u ocurrencia) de la noche.
  if (r.destacado && autor) {
    const d = r.destacado;
    fuente(ctx, 800, 64, true);
    const frase = lineas(ctx, `“${d.texto}”`, W - 260);
    fuente(ctx, 600, 34);
    const consigna = lineas(ctx, d.consigna.replace(/_{3,}/g, '____'), W - 260);
    const alto = 120 + consigna.length * 44 + frase.length * 72 + 140;
    rectRedondo(ctx, 90, y, W - 180, alto, 36);
    ctx.fillStyle = COLOR.tarjeta;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = d.tipo === 'chamuyo' ? COLOR.mentira : COLOR.acento;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = d.tipo === 'chamuyo' ? COLOR.mentira : COLOR.acento;
    fuente(ctx, 900, 40, true);
    ctx.fillText((d.tipo === 'chamuyo' ? textos.mentiraNoche : textos.ocurrenciaNoche).toUpperCase(), 140, y + 70);
    ctx.fillStyle = COLOR.tenue;
    fuente(ctx, 600, 34);
    let yy = y + 128;
    for (const l of consigna) {
      ctx.fillText(l, 140, yy);
      yy += 44;
    }
    ctx.fillStyle = COLOR.texto;
    fuente(ctx, 800, 64, true);
    yy += 24;
    for (const l of frase) {
      ctx.fillText(l, 140, yy);
      yy += 72;
    }
    ctx.drawImage(autor, 132, yy - 4, 96, 96);
    fuente(ctx, 700, 38);
    ctx.fillStyle = COLOR.texto;
    const detalle = d.tipo === 'chamuyo' ? textos.engano(d.votos) : textos.votos(d.votos);
    ctx.fillText(`${d.autor} · ${detalle}`, 246, yy + 46);
    y += alto + 50;
  }

  // Segundo y tercer puesto, si entran sin tapar el enlace.
  ctx.textAlign = 'center';
  const resto = y + 210 <= H - 250 ? r.podio.slice(1) : [];
  const ancho = 300;
  const inicio = W / 2 - (resto.length * ancho) / 2;
  for (const [i, j] of resto.entries()) {
    const im = await cargar(imagen(j.avatar)).catch(() => null);
    const cx = inicio + i * ancho + ancho / 2;
    if (im) ctx.drawImage(im, cx - 62, y, 124, 124);
    ctx.fillStyle = COLOR.texto;
    fuente(ctx, 800, 40);
    ctx.fillText(`${i + 2}° ${j.nombre}`, cx, y + 158);
    ctx.fillStyle = COLOR.tenue;
    fuente(ctx, 600, 32);
    ctx.fillText(`${j.puntos} ${textos.pts}`, cx, y + 198);
  }

  // Enlace al juego.
  rectRedondo(ctx, 140, H - 230, W - 280, 140, 70);
  ctx.fillStyle = COLOR.acento;
  ctx.fill();
  ctx.fillStyle = '#1b1600';
  fuente(ctx, 600, 32);
  ctx.fillText(textos.jugaGratis, W / 2, H - 186);
  fuente(ctx, 900, 46, true);
  ctx.fillText(URL_JUEGO, W / 2, H - 134);
  ctx.fillStyle = COLOR.tenue;
  fuente(ctx, 700, 32);
  ctx.fillText('Instagram @chamuyo.juego', W / 2, H - 48);

  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('sin imagen'))), 'image/png'));
}

/** Comparte la tarjeta con el menú del sistema; si no se puede, la descarga. */
export async function compartirTarjeta(r: Resumen): Promise<void> {
  const blob = await dibujarTarjeta(r);
  const archivo = new File([blob], 'chamuyo.png', { type: 'image/png' });
  const texto = `${t().textoCompartir} https://${URL_JUEGO}/`;
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], text: texto });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = 'chamuyo.png';
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 4000);
}
