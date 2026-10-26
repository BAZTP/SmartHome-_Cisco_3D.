# SmartHome Cisco 3D — Interactive Network Simulator

Dos ediciones de la misma aplicación educativa, sin afiliación con Cisco:

| Edición | Ejecución | Persistencia | Requisitos |
| --- | --- | --- | --- |
| **Pages** | Navegador, sin API | IndexedDB del navegador y archivos JSON | Navegador con WebGL2 |
| **Local** | React + Spring Boot Java 21 + PostgreSQL 17 | PostgreSQL y archivos JSON | Docker Compose, o JDK/Maven/Node para desarrollo |

Ambas comparten interfaz y formato de escena. No se duplican fuentes ni se mantienen ramas incompatibles. El comando de compilación selecciona la edición.

## Funcionalidades disponibles

Casa 3D esquemática de nueve zonas y mobiliario generado por código; órbita, zoom, desplazamiento, vistas isométrica/superior/interior, selección de habitaciones, paredes conmutables y paneles laterales redimensionables/ocultables. Interfaz adaptable con mensajes de errores visibles.

**Guardar proyecto** conserva la vista predefinida, visibilidad de paredes y habitación seleccionada. **Cargar proyecto** recupera explícitamente esa escena, incluso después de recargar. No se guarda automáticamente; tampoco se guarda aún la posición libre de la cámara al orbitar. Exportar/importar JSON permite trasladar ese estado entre ambas ediciones. Importar no guarda hasta pulsar Guardar. Solo hay una escena por edición en esta fase.

El catálogo, dispositivos editables, conexiones, simulación IPv4, CLI, tráfico, cámaras e IoT siguen pendientes. Esta entrega prepara ambas versiones de la base funcional; no declara completadas las siete fases del simulador.

## Versión GitHub Pages

El workflow `.github/workflows/pages.yml` ejecuta `npm ci` y `npm run build:pages`, y publica `frontend/dist` al recibir cambios en `main`. Se puede ejecutar manualmente desde Actions.

En GitHub, configura **Settings → Pages → Build and deployment → Source: GitHub Actions**. Si el repositorio es privado, Pages depende del plan de GitHub. Tras un despliegue correcto, la dirección esperada es `https://baztp.github.io/SmartHome-_Cisco_3D./`.

Los recursos usan rutas relativas y React Router usa hash; las recargas funcionan bajo la ruta del repositorio. No se envían peticiones a `/api` en esta edición. El estado se guarda en IndexedDB con el origen del sitio: borrar datos del navegador, cambiar de navegador o usar otro equipo no conserva ese estado. Exporta JSON como respaldo. Si el almacenamiento está bloqueado, la aplicación muestra un error de guardado; no simula un resultado exitoso.

Para desarrollar o probar Pages sin Docker ni Java:

```bash
cd frontend
npm ci
npm run dev:pages
# O compilar y servir:
npm run build:pages
npm run preview -- --port 4173
```

`frontend/.env.pages` define `VITE_APP_MODE=pages`. No contiene secretos. IndexedDB funciona al servir por HTTP local o HTTPS, no abriendo `index.html` como archivo.

## Versión local con un comando

Instala Docker con Compose. Desde la raíz:

```bash
cp .env.example .env
docker compose --profile local up -d --build
```

Abre `http://localhost:8088`. El primer arranque descarga imágenes y dependencias; la API puede necesitar unos segundos adicionales. Los contenedores incluyen Node/Maven/JDK durante la compilación; no tienes que instalarlos en tu sistema.

```bash
docker compose --profile local logs -f backend
curl http://localhost:8088/actuator/health
curl http://localhost:8088/api/projects
```

Nginx sirve el frontend local y redirige API y OpenAPI al contenedor Java. PostgreSQL conserva los datos en un volumen. Flyway crea el proyecto inicial y migra el campo de escena. La interfaz muestra “API y PostgreSQL conectados” cuando puede consultar el proyecto.

Los valores predeterminados son exclusivamente de desarrollo local. Personaliza `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` y `WEB_PORT` en `.env`. No lo subas a Git. Compose conecta automáticamente el backend a PostgreSQL. Cambiar la contraseña en `.env` no modifica un rol de un volumen PostgreSQL ya inicializado.

Para parar conservando datos:

```bash
docker compose --profile local stop
```

No uses `down -v` si quieres conservarlos. No expongas esta versión de desarrollo a Internet: no incluye autenticación multiusuario.

## Desarrollo local sin contenedores de aplicación

Requiere **JDK 21 completo**, Maven 3.9+, Node 22.12+ o 24 y Docker para PostgreSQL.

```bash
docker compose up -d --wait postgres
```

En terminales separados:

```bash
cd backend
mvn spring-boot:run
```

```bash
cd frontend
npm ci
npm run dev
```

Abre el puerto 5173. Vite redirige `/api` y `/actuator` al backend 8080. `npm run build:local` genera la versión para el despliegue con Nginx. No definas `VITE_STATIC_DEMO=true` (compatibilidad con la edición anterior) al compilar la versión local.

Spring Boot no carga `.env` automáticamente fuera de Compose. Si personalizas la base de datos, exporta `DB_URL`, `DB_USER` y `DB_PASSWORD` en el proceso Java. La URL predeterminada es `jdbc:postgresql://localhost:5432/smarthome`.

## API

- `GET /api/projects`: proyecto de demostración.
- `GET /api/projects/{id}/scene`: escena guardada; respuesta vacía si nunca se guardó.
- `PUT /api/projects/{id}/scene`: reemplaza la escena validada, responde 204.
- `GET /actuator/health`: disponibilidad del backend y PostgreSQL.
- `/v3/api-docs` y `/swagger-ui/index.html`: documentación OpenAPI.

Formato compartido:

```json
{"version":1,"view":"Superior","walls":false,"selected":"Oficina"}
```

## Pruebas

Con PostgreSQL iniciado, `cd backend && mvn verify` ejecuta pruebas HTTP de migraciones, salud, guardado/carga y rechazo de escenas inválidas/proyectos inexistentes. Usa una base de datos de desarrollo/pruebas, pues Flyway aplica migraciones y las pruebas escriben la escena del proyecto inicial.

En `frontend`:

```bash
npm run build:local
# Con Vite local y backend iniciados:
npx playwright test
# Contra los contenedores locales:
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8088 npx playwright test
# Con el artefacto Pages servido en la subruta del repositorio del puerto 4173:
npx playwright test --config playwright.pages.config.ts
```

La prueba Pages valida ausencia de peticiones a la API, WebGL, controles, persistencia tras recargar, exportación e importación válida/inválida. Las pruebas locales validan interfaz, conexión, errores y persistencia PostgreSQL. La configuración usa Chromium en `/usr/bin/chromium`; adapta `executablePath` o instala el navegador de Playwright en otro equipo.

## Estructura

- `frontend/src/House.tsx`: geometrías y controles 3D.
- `frontend/src/App.tsx`: interfaz compartida.
- `frontend/src/store.ts`: estado de escena con Zustand.
- `frontend/src/projectStorage.ts`: selección del almacenamiento IndexedDB/API y formato JSON.
- `backend/src/main/java/com/smarthome/`: controladores, servicios, dominio, DTO y repositorios.
- `backend/src/main/resources/db/migration/`: migraciones Flyway.
- `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`: despliegue local.
- `compose.yaml`: servicios y perfil `local`.
- `ANTIGRAVITY.md`: guía para continuar el trabajo en Antigravity.

En el entorno de nube actual, `scripts/mvn` activa el JDK y Maven conservados en `/workspace/tools`. `scripts/setup-cloud.sh` prepara dependencias, arranca PostgreSQL y valida backend/frontend con el proxy del entorno. No es necesario para un equipo local con Docker.

## Pendiente

Implementar Fase 2 (catálogo, entidades Room/NetworkDevice, posiciones 3D, movimiento y edición), seguida de cableado y simulación. Mantener contratos comunes y pruebas en las dos ediciones. El paquete gráfico todavía genera una advertencia por tamaño; optimizar carga diferida antes de ampliar escenas.
