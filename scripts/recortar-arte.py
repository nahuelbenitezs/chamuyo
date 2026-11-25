"""Recorta el arte original (carpeta arte/, fuera del repo) en los archivos que usa el juego.

Uso: python scripts/recortar-arte.py   (necesita pillow, numpy y scipy)
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

RAIZ = Path(__file__).resolve().parent.parent
ARTE = RAIZ / "arte"
SALIDA = RAIZ / "public" / "arte"
IDS = ["carpincho", "mate", "empanada", "alfajor", "tero", "yaguarete",
       "perezoso", "tucan", "llama", "mulita", "choripan", "hornero"]
IDS_NUEVOS = ["tortafrita", "churro", "arepa", "coxinha", "palta", "taco"]


def corte(perfil: np.ndarray, centro: int, margen: int) -> int:
    """Busca, cerca de la línea teórica de la grilla, la línea con menos píxeles pintados."""
    desde, hasta = max(0, centro - margen), min(len(perfil), centro + margen)
    return desde + int(np.argmin(perfil[desde:hasta]))


def recortes(hoja: Image.Image, columnas: int = 4, filas: int = 3) -> list[Image.Image]:
    """Separa los stickers de una hoja 4×3 con fondo transparente, en orden de lectura.

    Algunos stickers se tocan entre sí, así que primero se corta por la grilla (ajustando
    cada corte a la línea más vacía cercana) y en cada celda se queda la mancha más grande.
    """
    rgba = np.array(hoja.convert("RGBA"))
    alfa = rgba[..., 3] > 128
    alto, ancho = alfa.shape
    ys = [0] + [corte(alfa.sum(axis=1), round(alto * j / filas), alto // 10) for j in range(1, filas)] + [alto]
    piezas = []
    for f in range(filas):
        banda = alfa[ys[f]:ys[f + 1]]
        xs = [0] + [corte(banda.sum(axis=0), round(ancho * k / columnas), ancho // 12) for k in range(1, columnas)] + [ancho]
        for c in range(columnas):
            celda = banda[:, xs[c]:xs[c + 1]]
            etiquetas, cantidad = ndimage.label(celda)
            areas = ndimage.sum(celda, etiquetas, range(1, cantidad + 1))
            principal = int(np.argmax(areas)) + 1
            mascara = ndimage.binary_dilation(etiquetas == principal, iterations=3)
            recorte = rgba[ys[f]:ys[f + 1], xs[c]:xs[c + 1]].copy()
            recorte[..., 3] = np.where(mascara, recorte[..., 3], 0)
            im = Image.fromarray(recorte)
            piezas.append(im.crop(im.getbbox()))
    return piezas


def fila(hoja: Image.Image, cantidad: int) -> list[Image.Image]:
    """Separa los `cantidad` stickers más grandes de una hoja, ordenados de izquierda a derecha."""
    rgba = np.array(hoja.convert("RGBA"))
    alfa = rgba[..., 3] > 128
    etiquetas, total = ndimage.label(alfa)
    areas = ndimage.sum(alfa, etiquetas, range(1, total + 1))
    mayores = sorted(range(total), key=lambda i: -areas[i])[:cantidad]
    cajas = ndimage.find_objects(etiquetas)
    piezas = []
    for i in sorted(mayores, key=lambda i: cajas[i][1].start):
        fy, fx = cajas[i]
        recorte = rgba[fy, fx].copy()
        mascara = ndimage.binary_dilation(etiquetas[fy, fx] == i + 1, iterations=3)
        recorte[..., 3] = np.where(mascara, recorte[..., 3], 0)
        piezas.append(Image.fromarray(recorte))
    return piezas


def cuadrado(im: Image.Image, lado: int) -> Image.Image:
    escala = lado * 0.94 / max(im.size)
    im = im.resize((round(im.width * escala), round(im.height * escala)), Image.LANCZOS)
    lienzo = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    lienzo.paste(im, ((lado - im.width) // 2, (lado - im.height) // 2), im)
    return lienzo


def sin_fondo_oscuro(im: Image.Image) -> Image.Image:
    """Quita el fondo oscuro conectado al borde (el sticker tiene borde blanco que lo separa)."""
    rgba = np.array(im.convert("RGBA"))
    oscuro = rgba[..., :3].max(axis=2) < 48
    etiquetas, _ = ndimage.label(oscuro)
    borde = set(np.unique(np.concatenate([etiquetas[0], etiquetas[-1], etiquetas[:, 0], etiquetas[:, -1]]))) - {0}
    fondo = np.isin(etiquetas, list(borde))
    fondo = ndimage.binary_dilation(fondo, iterations=1)
    rgba[..., 3] = np.where(fondo, 0, 255)
    sticker = Image.fromarray(rgba)
    return sticker.crop(sticker.getbbox())


def main() -> None:
    (SALIDA / "personajes").mkdir(parents=True, exist_ok=True)
    hojas = (
        ("personajes.webp", "", IDS, 4, 3),
        ("sorpresa.webp", "-sorpresa", IDS, 4, 3),
        ("personajes-nuevos.webp", "", IDS_NUEVOS, 3, 2),
        ("sorpresa-nuevos.webp", "-sorpresa", IDS_NUEVOS, 3, 2),
    )
    for hoja, sufijo, ids, columnas, filas in hojas:
        piezas = recortes(Image.open(ARTE / hoja), columnas, filas)
        assert len(piezas) == len(ids), f"{hoja}: {len(piezas)} stickers"
        for nombre, pieza in zip(ids, piezas):
            cuadrado(pieza, 256).save(SALIDA / "personajes" / f"{nombre}{sufijo}.webp", quality=88)
            if not sufijo:
                cuadrado(pieza, 512).save(SALIDA / "personajes" / f"{nombre}-grande.webp", quality=88)

    mascota = sin_fondo_oscuro(Image.open(ARTE / "logo.webp"))
    cuadrado(mascota, 512).save(SALIDA / "mascota.webp", quality=90)
    fondo = (19, 18, 21, 255)
    for lado, nombre in ((512, "icono-512.png"), (192, "icono-192.png"), (180, "apple-touch-icon.png"), (64, "favicon.png")):
        icono = Image.new("RGBA", (lado, lado), fondo)
        m = cuadrado(mascota, round(lado * 0.86))
        icono.paste(m, ((lado - m.width) // 2, (lado - m.height) // 2), m)
        icono.save(RAIZ / "public" / nombre)

    portada = Image.open(ARTE / "portada.webp").convert("RGB")
    portada.save(SALIDA / "portada.webp", quality=86)

    # Fondos: el escenario va detrás de las rondas en la tele; el patrón, en los celulares.
    Image.open(ARTE / "escenario.webp").convert("RGB").save(SALIDA / "escenario.webp", quality=82)
    Image.open(ARTE / "patron.webp").convert("RGB").resize((512, 512), Image.LANCZOS).save(SALIDA / "patron.webp", quality=80)

    # Hojas con stickers sueltos en una fila, de izquierda a derecha.
    for hoja, nombres, lado in (
        ("modos.webp", ["modo-chamuyo", "modo-ocurrencias"], 640),
        ("estados.webp", ["estado-vacio", "estado-conectando", "estado-perdido"], 360),
    ):
        for nombre, pieza in zip(nombres, fila(Image.open(ARTE / hoja), len(nombres))):
            cuadrado(pieza, lado).save(SALIDA / f"{nombre}.webp", quality=88)

    # Portadas de destacados de Instagram: quedan en arte/, fuera del sitio.
    (ARTE / "instagram").mkdir(exist_ok=True)
    # Los círculos se tocan entre sí: se cortan por grilla.
    for i, pieza in enumerate(recortes(Image.open(ARTE / "instagram-destacados.webp"), columnas=5, filas=1), 1):
        cuadrado(pieza, 1080).save(ARTE / "instagram" / f"destacado-{i}.png")
    print("listo:", sorted(p.name for p in (SALIDA / "personajes").iterdir())[:4], "...")


if __name__ == "__main__":
    main()
