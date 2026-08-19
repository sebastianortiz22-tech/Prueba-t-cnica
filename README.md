# Cómo ejecutar la aplicación?
Requisito: Node.js 20 o superior.
`npm install`.

```bash
npm start
```

Variables de entorno opcionales (ver `.env`, todas tienen default):

| Variable                        | Default                            | Qué controla                                   |
| -------------------------------- | ----------------------------------- | ----------------------------------------------- |
| `PORT`                          | `3000`                             | Puerto HTTP del servicio                        |
| `MAX_EXTRACCIONES_SIMULTANEAS`  | `3`                                 | Peticiones concurrentes contra la fuente externa|
| `INTENTOS_MAXIMOS_SCRAPING`     | `2`                                 | Reintentos por producto ante fallos temporales  |
| `TIMEOUT_SCRAPING_MS`           | `8000`                             | Timeout por petición a Automation Exercise      |
| `AUTOMATION_EXERCISE_BASE_URL`  | `https://automationexercise.com`   | Útil para apuntar a un mock en tests manuales   |

Correr los tests automatizados:

```bash
npm test
```

Correr un flujo de humo end-to-end real (requiere el servidor corriendo y
acceso a internet):

```bash
npm start          # esta en una terminal
npm run smoke       # y esta en otra terminal
```

# Tecnologías utilizadas

- Node.js puro (módulos nativos `http`, `https`, `fs`, `crypto`, `url`).
  Sin frameworks ni librerías externas.
- Persistencia en archivos JSON (motor casero, `src/almacen/almacenJSON.js`).
- Testing con el runner integrado de Node (`node:test` + `node:assert`),
  también sin dependencias.

# Por qué este lenguaje y estas herramientas?

Elegí Node.js porque es el lenguaje con el que más cómodo me siento para
resolver un problema con estas características (I/O de red, procesamiento
asíncrono, JSON) y porque su modelo de concurrencia basado en un único hilo
con event loop calza naturalmente con "lanzar varias extracciones sin
bloquear al llamador".

La decisión menos convencional del proyecto es **no usar dependencias
externas** (nada de Express, axios, cheerio, better-sqlite3, etc.). Lo pensé
así:

- El entorno donde armé la solución no siempre tiene acceso confiable a la
  red para `npm install` (lo comprobé mientras desarrollaba), y quise
  asegurarme de que el evaluador pueda clonar y correr el proyecto sin
  fricciones ni sorpresas de instalación, sin importar su entorno.
- El problema en sí no es tan grande como para justificar un framework:
  un router con `:parametros`, un parser de `application/json` y un cliente
  HTTPS se escriben en pocas líneas con los módulos nativos.
- Me pareció una buena forma de mostrar que entiendo qué hace Express (o
  cheerio) "por debajo" y no solo cómo se usan.

El trade-off es real y lo asumo: en un proyecto de producción usaría
Express (rutas más declarativas, middlewares, mejor DX) y cheerio
(parseo de HTML con selectores CSS en vez de regex sobre texto), porque a
partir de cierto tamaño el código a mano empieza a costar más de lo que
ahorra. Lo dejo comentado en "Qué mejoraría con más tiempo".

# Descripción general de la solución

```
src/
├── servidor.js                         # arranca el servidor HTTP nativo
├── app.js                              # router + manejo central de errores
├── config/
│   └── configuracionApp.js             # puerto, límites, .env casero
├── nucleoHttp/
│   ├── enrutadorSimple.js              # mini router (método + :parametros)
│   └── cuerpoJSON.js                   # parseo de body + helper de respuesta
├── compartido/
│   └── erroresPersonalizados.js        # errores de dominio -> códigos HTTP
├── almacen/
│   ├── almacenJSON.js                  # motor genérico de persistencia
│   ├── repositorioProductos.js         # CRUD + upsert de productos
│   └── repositorioTrabajosExtraccion.js# CRUD de trabajos de extracción
├── catalogoProductos/                  # feature: POST/GET/PATCH/DELETE /products
└── extraccionAutomationExercise/       # feature: extracción asíncrona
    ├── automationExerciseScraper.js    # fetch + parseo del HTML del producto
    ├── extraccion.colaConcurrencia.js  # límite de peticiones simultáneas
    ├── extraccion.trabajador.js        # orquesta el procesamiento de un job
    ├── extraccion.controlador.js       # handlers HTTP
    └── extraccion.rutas.js
```

Organicé el código por feature (`catalogoProductos`,
`extraccionAutomationExercise`) en vez de por capa técnica (`controllers/`,
`services/`, `models/` mezclando todo), porque así cuando alguien toca "cómo
funciona la extracción" tiene todos los archivos relevantes en una sola
carpeta, en vez de saltar entre cuatro carpetas distintas.

# Endpoints principales

Productos

```
POST   /products             crea un producto manualmente
GET    /products             lista productos (filtros opcionales: ?category=&brand=)
GET    /products/:id         detalle de un producto
PATCH  /products/:id         actualiza campos parciales
DELETE /products/:id         elimina un producto
```

Extracciones

```
POST /extractions                 { "productIds": [1, 2, 3] }  -> 202 Accepted
GET  /extractions                 lista todos los trabajos
GET  /extractions/:id             estado/progreso del trabajo
GET  /extractions/:id/products    productos que resultaron de ese trabajo
```

Ejemplo de respuesta de `GET /extractions/:id` mientras corre:

```json
{
  "id": "2e78815d-...",
  "status": "PROCESSING",
  "total": 3,
  "procesados": 1,
  "exitosos": 1,
  "fallidos": 0,
  "detalles": [
    { "productId": 1, "status": "SUCCESS", "productoId": "…", "error": null },
    { "productId": 2, "status": "PROCESSING", "productoId": null, "error": null },
    { "productId": 3, "status": "PENDING", "productoId": null, "error": null }
  ]
}
```

# Estrategia utilizada para el procesamiento asíncrono

1. `POST /extractions` valida el body, crea el trabajo en estado `PENDING`
   (con un "detalle" por cada `productId` solicitado) y responde 202 de
   inmediato con el `id` del trabajo — sin esperar (`await`) a que el
   procesamiento termine.
2. En paralelo, se llama a `ejecutarTrabajoDeExtraccion(...)` **sin
   awaitear su promesa** desde el controlador; esa función sigue corriendo
   en el event loop después de que la respuesta HTTP ya salió.
3. Cada producto del trabajo se encola en una `ColaConcurrencia` global
   (una sola instancia compartida por todos los trabajos, no una por
   trabajo), que garantiza que nunca haya más de
   `MAX_EXTRACCIONES_SIMULTANEAS` peticiones en vuelo contra Automation
   Exercise al mismo tiempo, sin importar cuántos `POST /extractions` hayan
   llegado.
4. Cada producto se procesa de forma aislada: se descarga su HTML, se
   parsea, se reintenta hasta `INTENTOS_MAXIMOS_SCRAPING` veces si falla, y
   el resultado (éxito o error) se escribe en su propio "detalle" dentro
   del trabajo. Un producto que falla nunca detiene a los demás — el
   `try/catch` está a nivel de producto individual, no del trabajo completo.
5. Cuando terminan todos los productos (`Promise.all`), se calcula el
   estado final del trabajo:
   - `COMPLETED` si todos los productos se extrajeron con éxito.
   - `COMPLETED_WITH_ERRORS` si hubo una mezcla de éxitos y fallos.
   - `FAILED` si ningún producto se pudo extraer.

Elegí esto en vez de una cola con un broker externo (Redis/RabbitMQ/BullMQ)
porque para el alcance de la prueba (procesamiento en memoria, un solo
proceso, sin necesidad de sobrevivir un reinicio del servidor) agrega
complejidad de infraestructura sin un beneficio claro. Es la limitación más
importante a tener en cuenta: **si el proceso se reinicia, los trabajos en
curso se pierden** (ver "Qué mejoraría con más tiempo").

# Decisiones o trade-offs relevantes

- Persistencia en JSON en vez de una base de datos real. Cada
  colección (`productos.json`, `trabajosExtraccion.json`) vive en su
  propio archivo dentro de `src/datos/`, con un motor casero
  (`almacenJSON.js`) que serializa las escrituras concurrentes con una
  promesa encadenada, para evitar que dos productos de una misma
  extracción terminando al mismo tiempo corrompan el archivo. Es
  suficiente para esta prueba y para el volumen de datos esperado, pero no
  escalaría bien con muchos productos ni con múltiples instancias del
  servicio corriendo a la vez (no hay locking entre procesos).
- Extracción por regex sobre el HTML en vez de un parser tipo cheerio.
  Automation Exercise no expone clases CSS muy estables para todos los
  campos, así que en vez de depender de selectores frágiles, busco el texto
  ("Category:", "Availability:", "Condition:", "Brand:") y extraigo lo que
  sigue, saltándome etiquetas intermedias como `<b>`. Es más tolerante a
  cambios menores de marcado, pero menos legible que un selector CSS.
- Deduplicación por `externalId`. Si se vuelve a lanzar una extracción
  sobre un producto que ya se había extraído antes, se actualiza el
  registro existente en vez de crear uno duplicado. Los productos creados
  manualmente (`origen: "MANUAL"`) no se tocan.
- IDs de trabajo y de producto con `crypto.randomUUID()` en vez de
  IDs incrementales, para no depender de un contador centralizado que
  también necesitaría sincronización entre escrituras.
- Reintentos con backoff simple (300ms, 600ms, …) en vez de una
  librería de retry, porque la lógica es de tres líneas.

# Herramientas de inteligencia artificial utilizadas

Usé Claude (Anthropic) durante el desarrollo como asistente: para discutir
el diseño inicial (organización de carpetas, cómo modelar los estados del
trabajo), generar el andamiaje de los distintos módulos siguiendo esas
decisiones, y escribir los tests. Revisé y ejecuté todo el código
generado —incluyendo correr `npm test` y probar los endpoints a mano con
`curl`— antes de darlo por bueno. No se incorporó IA *dentro* de la
solución en sí (no hay llamadas a un modelo de lenguaje en el flujo de
extracción); el uso fue exclusivamente como herramienta de desarrollo.

# Qué mejoraría con más tiempo

- Persistencia real: migrar de archivos JSON a SQLite o PostgreSQL
  con transacciones, sobre todo para que los trabajos de extracción
  sobrevivan a un reinicio del proceso (hoy un trabajo `PROCESSING` en
  curso se pierde si el servidor se cae).
- Cola de trabajos persistente: reemplazar la cola en memoria por algo
  tipo BullMQ + Redis si el volumen de extracciones creciera, para poder
  escalar a varios workers en procesos o máquinas distintas.
- Idempotencia a nivel de API: aceptar una `Idempotency-Key` en
  `POST /extractions` para que reintentar la misma petición HTTP (por
  ejemplo, ante un timeout de red del cliente) no cree un trabajo
  duplicado.
- Cancelación de trabajos: un `DELETE /extractions/:id` que marque el
  trabajo como cancelado y detenga el encolado de los productos
  restantes.
- Paginación real en `GET /products` (hoy filtra pero no pagina) y
  ordenamiento configurable.
- Documentación OpenAPI/Swagger generada a partir de las rutas.
- Más cobertura de tests, en particular tests de integración que
  levanten el servidor HTTP real y golpeen los endpoints de extracción con
  un servidor HTTP de prueba en vez de solo probar el parser con un
  fixture.

# Nota sobre las pruebas del scraper

Los tests de `automationExerciseScraper.js` corren contra un fixture local
(`tests/fixtures/productoEjemplo.html`) que reproduce la estructura real de
una página de detalle de Automation Exercise, en vez de golpear el sitio en
cada corrida de `npm test`. Esto hace los tests deterministas y rápidos, y
evita que fallen si el sitio está caído o cambia algo no relacionado con la
extracción. El flujo contra el sitio real se puede validar con
`npm run smoke` (requiere internet).
