# Melipeuco Capital del Trekking — sitio web

Nuevo sitio web de **Melipeuco Capital del Trekking**, construido desde cero con [Astro](https://astro.build)
a partir de todo el contenido del sitio anterior (WordPress) `melipeucocapitaldeltrekking.cl`.

Es un sitio **estático**: no necesita base de datos ni PHP, carga muy rápido y se puede publicar en
cualquier hosting (servidor municipal, Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc.).

## Contenido migrado

| Sección | Cantidad | Datos | URL |
|---|---|---|---|
| Rutas de trekking | 44 | ficha técnica, MIDE, nivel, galería, track GPX, mapa, perfil de elevación, operadores | `/ruta-de-trekking/<slug>/` |
| Actividades (Qué hacer) | 18 | tipo, descripción, galería, mapa, operadores | `/actividad-atractivo/<slug>/` |
| Atractivos (Qué visitar) | 23 | tipo, descripción, galería, mapa | `/actividad-atractivo/<slug>/` |
| Alojamientos | 27 | clase, contacto, pagos, servicios, redes, galería | `/donde-dormir/<slug>/` |
| Operadores turísticos | 13 | contacto, redes, galería, rutas/actividades que ofrecen | `/operador-turistico/<slug>/` |
| Gastronomía y servicios complementarios | 47 | tipo, contacto, redes, galería | `/servicio-restaurante/<slug>/` |
| Guías turísticos | 25 | especialidad, dirección, certificaciones, contacto | `/guias-turisticos/` |
| Noticias | 3 | entradas del blog | `/<slug>/` |
| Páginas | — | Inicio, Explora Melipeuco, Contáctanos, Mapa de senderos | |

Además: unas 750 imágenes y logos del sitio original y los 44 tracks GPX.

**Se conservan las mismas URL del sitio anterior**, así los enlaces existentes y el posicionamiento en
Google siguen funcionando.

### Funciones nuevas

- Filtros instantáneos y buscador en todos los listados (nivel, dificultad MIDE, tipo de recorrido, tipo de alojamiento, especialidad, etc.). Los filtros se pueden enlazar, por ejemplo `/rutas-de-trekking/?interes=Familiares`.
- Mapa por ruta con capas satelital, topográfica y de calles, el track GPX dibujado y un **perfil de elevación interactivo**. El track GPX se puede descargar.
- **Mapa general de senderos** (`/mapa/`) con las 44 rutas, coloreadas por nivel.
- Galería de fotos con visor a pantalla completa (se maneja con el teclado o con gestos).
- Animaciones: entrada del logo, carrusel con efecto Ken Burns, aparición de secciones al hacer scroll, contadores animados, franja animada de logos institucionales y logo del pie de página flotando. Respetan la preferencia de "reducir movimiento" del sistema.
- Diseño adaptado a celulares, metadatos para redes sociales (Open Graph), `sitemap.xml` y `robots.txt` automáticos.

## Requisitos

- Node.js 18.20 o superior (recomendado: 20 o 22)

## Uso

```bash
npm install        # instalar dependencias (solo la primera vez)
npm run dev        # servidor de desarrollo en http://localhost:4321
npm run build      # genera el sitio final en la carpeta dist/
npm run preview    # revisa localmente el sitio ya generado
```

Para publicar, sube el contenido de `dist/` al hosting.

## Cómo editar el contenido

Todo el contenido está en archivos JSON dentro de `src/data/`:

| Archivo | Contenido |
|---|---|
| `sitio.json` | nombre, lema, redes sociales, menú, enlaces del pie, correo y formulario de contacto |
| `inicio.json` | fotos del carrusel, rutas destacadas e "Imperdibles" de la portada |
| `rutas.json` | rutas de trekking |
| `actividades.json` | actividades (`"categoria": "actividad"`) y atractivos (`"categoria": "atractivo"`) |
| `alojamientos.json` | dónde dormir |
| `operadores.json` | operadores turísticos |
| `servicios.json` | gastronomía (`"seccion": "gastronomia"`) y complementarios (`"seccion": "complementarios"`) |
| `guias.json` | guías turísticos |
| `noticias.json` | noticias |
| `mapa.json` | puntos y tracks del mapa general |

### Agregar una ruta nueva

1. Copia las fotos a `public/media/...` y el track a `public/media/kmz/nombre.gpx`.
2. Agrega un objeto a `src/data/rutas.json`. Puedes copiar una ruta existente y cambiar sus valores:
   - `slug`: la URL, en minúsculas y con guiones (`laguna-nueva`)
   - `interes`: `Familiares`, `Trekkeros` o `Expertos`
   - `cuerpo`: la descripción, en HTML (`<p>…</p>`)
   - `imagen`, `galeria`, `gpx`: rutas que empiezan con `/media/...`
   - `coords`: `[latitud, longitud]` del punto de inicio
   - `operadores`: lista de `slug` de operadores que ofrecen la ruta
3. Si quieres que aparezca en el mapa general, agrégala también a `mapa.json`.
4. Ejecuta `npm run build`.

Los alojamientos, servicios, operadores, actividades y noticias se agregan igual.

### Formulario de contacto

Por defecto, el formulario abre el programa de correo del visitante con el mensaje listo, dirigido a
`email_contacto` en `sitio.json`. Para recibir los mensajes directamente, crea un formulario en un
servicio como Formspree, Getform o uno propio, y escribe su URL en `formulario_endpoint`.

> **Revisa** que `email_contacto` (`turismo@munimelipeuco.cl`) sea la casilla correcta; es un valor provisional.

## Estructura del proyecto

```
src/
  data/          contenidos (JSON)
  layouts/       plantilla general (encabezado, menú, pie)
  components/    tarjetas, galería, mapas, filtros, fichas, iconos
  pages/         páginas y plantillas de cada tipo de contenido
  scripts/       acceso a datos, lectura de GPX y mapas
  styles/        estilos globales (colores y tipografías en :root)
public/media/    imágenes, logos y tracks GPX migrados
herramientas/migracion/  scripts que extrajeron el contenido del sitio anterior
```

## Notas de la migración

- Las 3 noticias del sitio anterior eran **entradas de prueba** (texto "Lorem ipsum"). Se migraron tal cual para que el sistema de noticias funcione: reemplázalas por noticias reales o bórralas de `noticias.json`. El sitio original no publicaba su fecha, así que se les asignó enero de 2025.
- Varias fichas del sitio original venían con campos vacíos o en blanco (por ejemplo "Distancia desde la plaza: KM"). Esos campos se omiten, y cuando falta la foto se muestra un ícono.
- Las fichas de guías sin foto muestran las iniciales del guía.
- Los mapas usan capas públicas (Esri, OpenTopoMap y OpenStreetMap), sin claves de API.
- Los scripts de `herramientas/migracion/` sirven para volver a extraer el contenido mientras el sitio anterior siga en línea. Se ejecutan con Python 3 y BeautifulSoup: `crawl.py` → `extract.py` / `guias.py` → `assets.py` → `download.py` → `transform.py`.
