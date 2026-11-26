// Al agua en 3D: una pileta con un inflable redondo y los personajes parados encima como figuritas.
// La lógica es la misma que la versión plana (juegos.ts); esto solo la dibuja. Se carga aparte,
// solo cuando toca este juego, para no sumarle three.js a la carga inicial del sitio.
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  RingGeometry,
  Scene,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  TorusGeometry,
  WebGLRenderer,
} from 'three';
import { AGUA, EstadoAgua } from './juegos';

/** De píxeles lógicos (juegos.ts) a unidades de la escena. */
const U = 1 / 100;
const NIVEL_AGUA = -0.25;
const ALTURA_INFLABLE = NIVEL_AGUA + 0.12;
const POOL = { ancho: 15, largo: 10, hondo: 1.5 };

export interface FuenteAvatares {
  url(id: string): string;
  color(id: string): string;
}

interface Figura {
  grupo: Group;
  sprite: Sprite;
  salpicon: Mesh<RingGeometry, MeshBasicMaterial>;
}

function textura(ancho: number, alto: number, pintar: (ctx: CanvasRenderingContext2D) => void): CanvasTexture {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  pintar(lienzo.getContext('2d')!);
  const t = new CanvasTexture(lienzo);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export class EscenaAgua {
  private readonly lienzo = document.createElement('canvas');
  private readonly renderer: WebGLRenderer;
  private readonly escena = new Scene();
  private readonly camara = new PerspectiveCamera(36, 16 / 9, 0.1, 100);
  private readonly inflable = new Group();
  private readonly figuras = new Map<string, Figura>();
  private readonly texturas: Texture[] = [];
  private ancho = 0;
  private alto = 0;

  constructor(
    private readonly contenedor: HTMLElement,
    ids: string[],
    fuente: FuenteAvatares,
  ) {
    this.lienzo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    this.lienzo.setAttribute('aria-hidden', 'true');
    // Si no hay WebGL, esto tira error y la anfitriona sigue con la versión plana.
    this.renderer = new WebGLRenderer({ canvas: this.lienzo, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    contenedor.prepend(this.lienzo);

    this.escena.background = new Color('#14354a');
    this.camara.position.set(0, 7.4, 6.2);
    this.camara.lookAt(0, -0.2, 0.45);
    this.escena.add(new HemisphereLight('#eaf6ff', '#1d4660', 1.7));
    const sol = new DirectionalLight('#fff0d4', 2.4);
    sol.position.set(4, 9, 5);
    this.escena.add(sol);

    this.armarPileta();
    this.armarInflable();
    const cargador = new TextureLoader();
    for (const id of ids) this.figuras.set(id, this.armarFigura(id, fuente, cargador));
  }

  private guardar<T extends Texture>(t: T): T {
    this.texturas.push(t);
    return t;
  }

  private armarPileta(): void {
    // Venecitas celestes con pastina clara, para el fondo y las paredes.
    const venecitas = this.guardar(
      textura(256, 256, (ctx) => {
        ctx.fillStyle = '#e7f6fd';
        ctx.fillRect(0, 0, 256, 256);
        for (let f = 0; f < 8; f++) {
          for (let c = 0; c < 8; c++) {
            const tono = 62 + ((f * 7 + c * 13) % 9);
            ctx.fillStyle = `hsl(199 78% ${tono}%)`;
            ctx.fillRect(c * 32 + 2, f * 32 + 2, 28, 28);
          }
        }
      }),
    );
    venecitas.wrapS = venecitas.wrapT = RepeatWrapping;
    venecitas.repeat.set(POOL.ancho / 2, POOL.largo / 2);
    const azulejo = new MeshStandardMaterial({ map: venecitas, roughness: 0.6 });

    const fondo = new Mesh(new PlaneGeometry(POOL.ancho, POOL.largo), azulejo);
    fondo.rotation.x = -Math.PI / 2;
    fondo.position.y = -POOL.hondo;
    this.escena.add(fondo);
    const paredes: Array<[number, number, number, number]> = [
      [0, -POOL.largo / 2, POOL.ancho, 0],
      [0, POOL.largo / 2, POOL.ancho, Math.PI],
      [-POOL.ancho / 2, 0, POOL.largo, Math.PI / 2],
      [POOL.ancho / 2, 0, POOL.largo, -Math.PI / 2],
    ];
    for (const [x, z, largo, giro] of paredes) {
      const pared = new Mesh(new PlaneGeometry(largo, POOL.hondo), azulejo);
      pared.position.set(x, -POOL.hondo / 2, z);
      pared.rotation.y = giro;
      this.escena.add(pared);
    }

    const agua = new Mesh(
      new PlaneGeometry(POOL.ancho, POOL.largo),
      new MeshStandardMaterial({ color: '#35a8e6', transparent: true, opacity: 0.5, roughness: 0.08, metalness: 0.1 }),
    );
    agua.rotation.x = -Math.PI / 2;
    agua.position.y = NIVEL_AGUA;
    agua.renderOrder = 2;
    this.escena.add(agua);

    // Borde de la pileta y un deck de madera alrededor.
    const borde = new MeshStandardMaterial({ color: '#f1ece2', roughness: 0.8 });
    const deck = new MeshStandardMaterial({ color: '#b98a58', roughness: 0.9 });
    const g = 0.5;
    const lados: Array<[number, number, number, number]> = [
      [0, -POOL.largo / 2 - g / 2, POOL.ancho + 2 * g, g],
      [0, POOL.largo / 2 + g / 2, POOL.ancho + 2 * g, g],
      [-POOL.ancho / 2 - g / 2, 0, g, POOL.largo],
      [POOL.ancho / 2 + g / 2, 0, g, POOL.largo],
    ];
    for (const [x, z, an, la] of lados) {
      const pieza = new Mesh(new BoxGeometry(an, 0.22, la), borde);
      pieza.position.set(x, 0.02, z);
      this.escena.add(pieza);
    }
    for (const [x, z, an, la] of [
      [0, -POOL.largo / 2 - 10, 60, 19],
      [0, POOL.largo / 2 + 10, 60, 19],
      [-POOL.ancho / 2 - 15, 0, 29, POOL.largo + 2],
      [POOL.ancho / 2 + 15, 0, 29, POOL.largo + 2],
    ] as Array<[number, number, number, number]>) {
      const tabla = new Mesh(new BoxGeometry(an, 0.1, la), deck);
      tabla.position.set(x, -0.04, z);
      this.escena.add(tabla);
    }
  }

  private armarInflable(): void {
    const radio = AGUA.radio * U;
    // Gajos celestes y blancos alrededor del aro.
    const gajos = this.guardar(
      textura(512, 16, (ctx) => {
        for (let i = 0; i < 12; i++) {
          ctx.fillStyle = i % 2 ? '#f7f6f0' : '#5fb6f5';
          ctx.fillRect((i * 512) / 12, 0, 512 / 12 + 1, 16);
        }
      }),
    );
    const aro = new Mesh(new TorusGeometry(radio, 0.3, 20, 64), new MeshStandardMaterial({ map: gajos, roughness: 0.35 }));
    aro.rotation.x = -Math.PI / 2;
    this.inflable.add(aro);
    const lona = this.guardar(
      textura(256, 256, (ctx) => {
        const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.75, '#e4f3fd');
        g.addColorStop(1, '#bfe2f9');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 256);
        // Un sol amarillo en el medio.
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.arc(128, 128, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 6;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(128 + Math.cos(a) * 34, 128 + Math.sin(a) * 34);
          ctx.lineTo(128 + Math.cos(a) * (i % 2 ? 46 : 54), 128 + Math.sin(a) * (i % 2 ? 46 : 54));
          ctx.stroke();
        }
      }),
    );
    const piso = new Mesh(new CylinderGeometry(radio, radio, 0.16, 64), [
      new MeshStandardMaterial({ color: '#bfe2f9', roughness: 0.4 }),
      new MeshStandardMaterial({ map: lona, roughness: 0.4 }),
      new MeshStandardMaterial({ color: '#bfe2f9', roughness: 0.4 }),
    ]);
    this.inflable.add(piso);
    this.inflable.position.y = ALTURA_INFLABLE;
    this.escena.add(this.inflable);
  }

  private armarFigura(id: string, fuente: FuenteAvatares, cargador: TextureLoader): Figura {
    const grupo = new Group();
    const base = new Mesh(new CylinderGeometry(0.34, 0.38, 0.14, 32), new MeshStandardMaterial({ color: fuente.color(id), roughness: 0.5 }));
    base.position.y = 0.07;
    grupo.add(base);
    const sombra = new Mesh(new CircleGeometry(0.46, 32), new MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22 }));
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = 0.005;
    grupo.add(sombra);
    const cara = this.guardar(cargador.load(fuente.url(id)));
    cara.colorSpace = SRGBColorSpace;
    const sprite = new Sprite(new SpriteMaterial({ map: cara, transparent: true }));
    sprite.scale.set(1.15, 1.15, 1);
    sprite.position.y = 0.68;
    grupo.add(sprite);
    this.escena.add(grupo);
    const salpicon = new Mesh(
      new RingGeometry(0.32, 0.5, 40),
      new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }),
    );
    salpicon.rotation.x = -Math.PI / 2;
    salpicon.renderOrder = 3;
    this.escena.add(salpicon);
    return { grupo, sprite, salpicon };
  }

  dibujar(e: EstadoAgua): void {
    this.ajustarTamano();
    const escala = e.radio / AGUA.radio;
    const ola = Math.sin(e.t * 1.7) * 0.035;
    this.inflable.scale.set(escala, 1, escala);
    this.inflable.position.y = ALTURA_INFLABLE + ola;
    this.inflable.rotation.y = e.t * 0.05;
    const arriba = ALTURA_INFLABLE + ola + 0.08;
    e.ids.forEach((id, i) => {
      const f = this.figuras.get(id);
      if (!f) return;
      const c = e.cuerpos[id];
      const caida = e.eliminado[id];
      if (caida === null) {
        // Un saltito al moverse, para que se sienta vivo.
        const rapidez = Math.hypot(c.vx, c.vy);
        const salto = rapidez > 40 ? Math.abs(Math.sin(e.t * 11 + i)) * 0.08 : 0;
        f.grupo.position.set(c.x * U, arriba + salto, c.y * U);
        f.grupo.visible = true;
        f.salpicon.material.opacity = 0;
        return;
      }
      const k = e.t - caida;
      f.grupo.position.set(c.x * U, NIVEL_AGUA - k * 1.4, c.y * U);
      f.grupo.visible = k < 1.3;
      f.sprite.material.rotation = Math.min(1, k) * 0.6;
      f.salpicon.position.set(c.x * U, NIVEL_AGUA + 0.01, c.y * U);
      f.salpicon.scale.setScalar(1 + k * 3);
      f.salpicon.material.opacity = Math.max(0, 0.85 * (1 - k / 0.9));
    });
    this.renderer.render(this.escena, this.camara);
  }

  private ajustarTamano(): void {
    const ancho = this.contenedor.clientWidth;
    const alto = this.contenedor.clientHeight;
    if (!ancho || !alto || (ancho === this.ancho && alto === this.alto)) return;
    this.ancho = ancho;
    this.alto = alto;
    this.renderer.setSize(ancho, alto, false);
    this.camara.aspect = ancho / alto;
    this.camara.updateProjectionMatrix();
  }

  destruir(): void {
    const materiales = new Set<Material>();
    this.escena.traverse((o) => {
      const malla = o as Mesh<BufferGeometry, Material | Material[]>;
      malla.geometry?.dispose();
      const m = malla.material;
      if (Array.isArray(m)) m.forEach((x) => materiales.add(x));
      else if (m) materiales.add(m);
    });
    materiales.forEach((m) => m.dispose());
    this.texturas.forEach((t) => t.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.lienzo.remove();
  }
}
