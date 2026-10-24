# Melipeuco Capital del Trekking — sitio web

Sitio oficial de turismo de **Melipeuco Capital del Trekking**, construido con [Astro](https://astro.build) a partir
de todo el contenido del sitio anterior (WordPress). Es un sitio **estático**: no necesita base de datos ni PHP,
carga muy rápido y se puede publicar en cualquier hosting. Incluye un **panel de administración** en `/admin/`
para editar los contenidos sin tocar código.

## Identidad: el logo desarmado

El logo vectorizado se separó en sus 9 letras-símbolo, y cada una es la identidad (color + emblema) de una zona del sitio:

| Letra | Símbolo | Color | Zona del sitio |
|---|---|---|---|
| M | montaña y río | `#1F6FA8` glaciar | Rutas de trekking |
| E | rostro | `#E2683C` terracota | Noticias, Contacto |
| L | cascada | `#16A0A8` turquesa | Qué hacer |
| I | araucaria | `#2F7D4A` bosque | Qué visitar |
| P | corazón | `#D23B4A` copihue | Gastronomía, Mi viaje |
| E | persona | `#E9A92B` sol | Guías turísticos |
| U | animales | `#8A5A3B` tierra | Operadores, Servicios complementarios |
| C | estrellas | `#3E3E9A` noche | Dónde dormir |
| O | kultrun | `#7A3E91` violeta | Explora Melipeuco, Mapa |

Archivos de marca en `public/marca/`:

- `logo-color.svg`: logo en colores, para fondos claros.
- `logo-color-claro.svg`: logo en colores, para fondos oscuros.
- `logo-blanco.svg` y `logo-negro.svg`: versiones de una sola tinta.
- `emblema-0.svg` … `emblema-8.svg`: cada letra por separado.
- `logo-original.svg`: el archivo vectorial original.

En el código, `src/components/Logo.astro` dibuja el logo animado (las letras caen una a una, luego aparecen los
símbolos y el lema) y `src/components/Emblema.astro` dibuja una sola letra. Los colores están en `src/scripts/zonas.ts`.

## Diseño, animaciones y profundidad

- **Portada con profundidad**: fotos, capas de cordillera y logo que se mueven a distinta velocidad al hacer scroll (parallax).
- **«Cada letra es una puerta»**: al hacer scroll, el logo se desarma en sus 9 letras y el fondo va tomando el color de cada zona, con su nombre, descripción y enlace.
- **Fila de rutas destacadas**: se desliza de lado con flechas, arrastre o el dedo, sin frenar el scroll vertical.
- **Transición entre páginas**: capas de cordillera con el color y el emblema de la sección de destino.
- Títulos que suben palabra por palabra, emblemas flotantes en cada página y fotos que aparecen como cortina.
- Tarjetas con inclinación 3D y brillo al pasar el mouse, y contadores animados.
- Barra de progreso de lectura en los colores del logo y botón «volver arriba» con anillo de avance.
- Transiciones suaves entre páginas, que el navegador hace solo (View Transitions).
- Encabezado flotante tipo vidrio que se esconde al bajar y reaparece al subir, con mega menú de emblemas.
- Menú móvil a pantalla completa con apertura circular.
- **Modo claro y oscuro**: sigue la preferencia del sistema y se puede cambiar con el botón de la luna.
- Las animaciones se desactivan si el visitante tiene activada la opción «reducir movimiento» en su equipo.

## Funciones

- **Buscador global** (botón *Buscar*, `Ctrl K` o la tecla `/`): busca rutas, actividades, alojamientos, guías, servicios y noticias, y se maneja con el teclado.
- **Mi viaje** (`/mi-viaje/`): el visitante guarda con ❤️ lo que le interesa. La lista queda guardada en su navegador y se puede enviar por WhatsApp o imprimir.
- **Clima en vivo** de Melipeuco y pronóstico de 5 días (Open-Meteo, sin clave de API).
- **Filtros instantáneos** en todos los listados (nivel, dificultad MIDE, tipo, especialidad…), con conteo, cambio entre vista de cuadrícula y de lista, y URL compartible (por ejemplo, `/rutas-de-trekking/?interes=Familiares`).
- **Rutas**: mapa satelital, topográfico y de calles con el track GPX, perfil de elevación interactivo animado y descarga del GPX.
- **Mapa general** (`/mapa/`): las 44 rutas coloreadas por nivel. Al tocar un punto se dibuja el track con zoom animado.
- **Fichas de negocios**: botones de WhatsApp y llamada, redes sociales, galería, mapa y, en los operadores, las rutas que ofrecen.
- Botones de compartir (usa el menú nativo del teléfono) e imprimir (con una versión limpia de la ficha).
- Galería con visor a pantalla completa, que se maneja con el teclado y con gestos de deslizar.
- SEO: las mismas URL del sitio anterior, Open Graph, `sitemap.xml` y `robots.txt`.

## Contenido migrado

| Colección | Cantidad | Carpeta |
|---|---|---|
| Rutas de trekking | 44 | `src/content/rutas/` |
| Actividades y atractivos | 41 | `src/content/actividades/` |
| Alojamientos | 27 | `src/content/alojamientos/` |
| Operadores turísticos | 13 | `src/content/operadores/` |
| Gastronomía y servicios | 47 | `src/content/servicios/` |
| Guías turísticos | 25 | `src/content/guias/` |
| Noticias | 3 | `src/content/noticias/` |

Cada elemento es un archivo JSON propio, y su descripción está en Markdown. La configuración general está en `src/data/`:

- `sitio.json`: menú, pie de página, redes y contacto.
- `inicio.json`: portada.
- `mapa.json`: puntos del mapa general.

## Uso

Requiere Node.js 18.20 o superior (se recomienda 20 o 22).

```bash
npm install        # instalar dependencias (la primera vez)
npm run dev        # servidor de desarrollo en http://localhost:4321
npm run build      # genera el sitio final en dist/
npm run preview    # revisa el sitio generado
```

## Panel de administración (`/admin/`)

El panel usa [Decap CMS](https://decapcms.org), que es libre y gratuito. Permite:

- crear, editar, ocultar y eliminar rutas, actividades, alojamientos, operadores, servicios, guías y noticias;
- subir fotos y tracks GPX;
- editar la portada (carrusel, rutas destacadas e imperdibles), el menú, el pie de página, las redes y los puntos del mapa.

Cada guardado es un *commit* en GitHub, así queda un historial completo y se puede deshacer cualquier cambio.
Está activado el **flujo editorial**: los cambios pasan por Borrador → En revisión → Listo, y recién se publican
al aprobarlos. Para publicar sin revisión, elimina `publish_mode: editorial_workflow` de `public/admin/config.yml`.

### Editar en tu computador (sin configurar nada más)

```bash
npm run dev                # en una terminal
npx decap-server           # en otra terminal
```

Abre `http://localhost:4321/admin/`, entra con «Iniciar sesión» y edita. Los cambios se escriben en los archivos
locales; después haz *commit* y *push*.

### Editar en línea (en el sitio publicado)

El panel inicia sesión con GitHub, y para eso necesita un servicio OAuth:

- **Si el sitio se publica en Netlify**: conecta el repositorio y, en *Site configuration → Access & security → OAuth*, instala el proveedor de GitHub. No hay que tocar nada más.
- **En otro hosting** (servidor municipal, Cloudflare, Vercel…): instala un pequeño servidor OAuth para Decap CMS; hay opciones libres que se publican en minutos, por ejemplo en Cloudflare Workers. Luego escribe su dirección en `base_url` dentro de `public/admin/config.yml`.

Cada editor necesita una cuenta de GitHub con permiso de escritura en el repositorio `informatica130/CapitalDelTrekking`.

> El panel guarda en la rama **`main`** (`backend.branch` en `public/admin/config.yml`). Si publicas desde otra rama, cámbiala ahí.

> En las galerías, el panel no muestra la miniatura de las fotos migradas que están en subcarpetas (`/media/2024/11/…`). Es una limitación de Decap con imágenes existentes en subcarpetas: la foto sigue en la lista y en el sitio se ve bien. Las fotos nuevas se suben a `public/media/` y se ven normalmente.

## Estructura

```
src/
  content/       contenidos editables (un JSON por elemento)
  data/          portada, configuración general, mapa y logo desarmado
  layouts/       plantilla general (encabezado, menús, buscador, pie)
  components/    Logo, Emblema, tarjetas, galería, mapas, filtros, clima, fichas
  pages/         páginas y plantillas de cada tipo de contenido
  scripts/       datos, zonas y colores, efectos de scroll, buscador y Mi viaje, GPX y mapas
  styles/        sistema de diseño (global.css)
public/
  admin/         panel de administración (Decap CMS)
  marca/         logo en sus variantes y emblemas
  media/         imágenes y tracks GPX migrados
herramientas/migracion/   scripts que extrajeron el contenido del sitio anterior
```

## Pendientes antes de publicar

- Las 3 noticias migradas eran **entradas de prueba** («Lorem ipsum»). Reemplázalas o elimínalas desde el panel.
- Confirma el correo de contacto (`turismo@munimelipeuco.cl` es provisional) en *Configuración del sitio → Datos generales*.
- Para recibir los mensajes del formulario directamente, configura un *endpoint* (por ejemplo, Formspree) en el mismo lugar. Si queda vacío, el formulario abre el correo del visitante.
