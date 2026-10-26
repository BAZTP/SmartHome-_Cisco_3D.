# SmartHome Cisco 3D — Interactive Network Simulator

Base funcional de la **Fase 1**, con Java 21 / Spring Boot 3.5, PostgreSQL 17 y React 19 / TypeScript / Vite / React Three Fiber. Simulador educativo independiente, sin afiliación con Cisco.

## Alcance actual

- Escena 3D generada con geometrías locales: nueve zonas y mobiliario inicial esquemático.
- Órbita, zoom, desplazamiento, vistas isométrica, superior e interior.
- Selección sincronizada entre escena, explorador e inspector; paredes conmutables.
- Paneles laterales redimensionables mediante el borde inferior y ocultables desde la barra de cámara. Diseño adaptable a pantallas pequeñas.
- API de listado de proyectos, proyecto inicial persistido mediante Flyway, indicador de conexión real a la API y PostgreSQL.
- Interfaz oscura con errores de conectividad visibles y botón de reintento.

Las categorías del catálogo anuncian la Fase 2 y no son controles de edición. No se implementan aún dispositivos, conexiones, simulación, CLI, guardado de escenas, WebSocket ni gráficos de tráfico. Sus dependencias base están disponibles. Las habitaciones del modelo aún son geometrías estáticas del frontend; solo el proyecto inicial se almacena en PostgreSQL.

## Requisitos

JDK **21 completo** (no solo JRE), Maven 3.9+, Node 22.12+ o 24, Docker con Compose y navegador con WebGL2. No se necesitan servicios de pago ni credenciales externas. El contenedor de base de datos se limita a loopback.

## Inicio local

Desde la raíz del repositorio:

```bash
cp .env.example .env
docker compose up -d --wait
```

En un terminal:

```bash
cd backend
mvn spring-boot:run
```

En otro terminal:

```bash
cd frontend
npm ci
npm run dev
```

Abrir el puerto 5173 en el navegador local. Vite redirige `/api` y `/actuator` al backend del puerto 8080. La API escucha solo en loopback. OpenAPI se sirve en el backend en `/v3/api-docs` y Swagger UI en `/swagger-ui/index.html`.

La contraseña predeterminada es exclusivamente de desarrollo local. Para cambiarla, configura `DB_USER`, `DB_PASSWORD` y `DB_URL` en el proceso del backend; Compose lee `.env`, pero Spring Boot no lo carga automáticamente. `DB_PORT` cambia el puerto publicado de Compose y debe reflejarse en `DB_URL`. No subas `.env` al repositorio. Cambiar las credenciales de un volumen PostgreSQL existente no actualiza sus roles automáticamente.

## Entorno de nube preparado

Maven y el JDK completo se conservan en `/workspace/tools`. El ayudante `scripts/mvn` activa estas herramientas y la configuración del proxy de la nube, sin almacenar credenciales. Desde `backend`, usa `../scripts/mvn verify` o `../scripts/mvn spring-boot:run`. La caché de npm es escribible con `npm ci --cache /workspace/.npm-cache`.

## Validación

Con PostgreSQL iniciado:

```bash
cd backend
mvn verify
cd ../frontend
npm run build
```

Las dos pruebas JUnit levantan una API HTTP real contra PostgreSQL y comprueban migración, proyecto inicial y salud. **Usar una base de datos de desarrollo/prueba**, pues Flyway aplica migraciones. Se incluyen Mockito y Spring Test mediante el starter de pruebas.

Con frontend y backend ejecutándose:

```bash
cd frontend
npx playwright test
```

La configuración de navegador usa `/usr/bin/chromium` y renderizado por software para el entorno de nube. En otra máquina adapta `executablePath` a tu instalación de Chromium o usa los navegadores de Playwright. La prueba verifica WebGL, conexión al backend, selección, cambios de vista, paredes, paneles, interacciones de cámara y ancho móvil. No valida aún funcionalidades de fases posteriores.

## Arquitectura

```text
backend/
  src/main/java/com/smarthome/
    controller/  # API REST
    service/     # Casos de uso y transacciones
    domain/      # Entidades JPA
    repository/  # Acceso a PostgreSQL
    dto/         # Contratos HTTP
  src/main/resources/db/migration/ # Flyway
  src/test/     # Integración HTTP y base de datos
frontend/
  src/House.tsx # Escena, geometría, cámara e interacción
  src/store.ts  # Estado de vistas y selección con Zustand
  src/App.tsx   # Composición de la interfaz y estado de API
  src/main.tsx  # Punto de entrada, React Router
  src/SceneBoundary.tsx # Recuperación de errores de renderizado
  src/style.css # Tailwind y estilos de la interfaz
  tests/        # Prueba de navegador
compose.yaml    # PostgreSQL con volumen y healthcheck
```

## Apagado

Detén frontend y backend con Ctrl+C; `docker compose stop` conserva los datos. `docker compose down` elimina contenedores y red, conservando el volumen. No utilices `down -v` si deseas conservar proyectos.

## Siguiente fase

Implementar entidades Room, NetworkDevice y posiciones 3D; catálogo con arrastre, selección, movimiento, rotación y CRUD validado. Añadir pruebas de persistencia y recuperación antes de introducir interfaces y cableado en la Fase 3. El motor de redes y sus pruebas deterministas pertenecen a la Fase 4.

## GitHub Pages

El workflow `.github/workflows/pages.yml` compila y despliega el frontend con cada push a `main` y permite ejecución manual. En GitHub, abre **Settings → Pages → Build and deployment → Source: GitHub Actions**. Si el repositorio es privado, la disponibilidad de Pages depende del plan de GitHub.

La dirección esperada, después de un despliegue correcto, es `https://baztp.github.io/SmartHome-_Cisco_3D./`. Los recursos utilizan rutas relativas y React Router usa hash para admitir recargas desde Pages.

Esta publicación ejecuta la escena 3D y sus controles en modo demostración. Muestra explícitamente que no dispone de backend ni persistencia y no intenta conectarse a `/api/projects`. GitHub Pages no ejecuta Java, Docker ni PostgreSQL. Para utilizar la API y la base de datos, sigue las instrucciones locales anteriores; alojar e integrar el backend remoto queda pendiente.

Para probar el mismo artefacto localmente:

```bash
cd frontend
VITE_STATIC_DEMO=true npm run build
npm run preview -- --port 4173
```

Para volver al modo local con backend, ejecuta `npm run dev` o recompila sin `VITE_STATIC_DEMO`.
