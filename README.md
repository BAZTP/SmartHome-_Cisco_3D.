# SmartHome Cisco 3D — Interactive Network Simulator

Dos ediciones de la misma aplicación educativa, sin afiliación con Cisco:

| Edición | Ejecución | Persistencia | Requisitos |
| --- | --- | --- | --- |
| **Pages** | Navegador, sin API | IndexedDB del navegador y archivos JSON | Navegador con WebGL2 |
| **Local** | React + Spring Boot Java 21 + PostgreSQL 17 | PostgreSQL y archivos JSON | Docker Compose, o JDK/Maven/Node para desarrollo |

Ambas comparten interfaz y formato de escena. No se duplican fuentes ni se mantienen ramas incompatibles. El comando de compilación selecciona la edición.

## Funcionalidades disponibles

Casa 3D esquemática de nueve zonas y mobiliario generado por código; órbita, zoom, desplazamiento, vistas isométrica/superior/interior, selección de habitaciones, paredes conmutables y paneles laterales redimensionables/ocultables. Interfaz adaptable con mensajes de errores visibles.

**Guardar proyecto** conserva la vista predefinida, visibilidad de paredes, habitación seleccionada, dispositivos y enlaces. **Cargar proyecto** recupera explícitamente esa escena, incluso después de recargar. No se guarda automáticamente; tampoco se guarda aún la posición libre de la cámara al orbitar. Exportar/importar JSON permite trasladar ese estado entre ambas ediciones. Importar no guarda hasta pulsar Guardar. Solo hay una escena por edición en esta fase.

El laboratorio incluye edición y arrastre 3D, interfaces independientes, tres medios de conexión, simulación IPv4, CLI, topología sincronizada, reproducción de paquetes, monitoreo, cámaras e iluminación virtual. El apartado de alcance describe las simplificaciones educativas.

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

Nginx sirve el frontend local y redirige API y OpenAPI al contenedor Java. PostgreSQL conserva los datos en un volumen. Flyway crea el proyecto inicial, el campo de escena y el historial de eventos. La interfaz muestra “API y PostgreSQL conectados” cuando puede consultar el proyecto.

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

Abre el puerto 5173. Vite redirige `/api`, `/ws` y `/actuator` al backend 8080. `npm run build:local` genera la versión para el despliegue con Nginx. No definas `VITE_STATIC_DEMO=true` (compatibilidad con la edición anterior) al compilar la versión local.

Spring Boot no carga `.env` automáticamente fuera de Compose. Si personalizas la base de datos, exporta `DB_URL`, `DB_USER` y `DB_PASSWORD` en el proceso Java. La URL predeterminada es `jdbc:postgresql://localhost:5432/smarthome`.

## API

- `GET /api/projects`: proyecto de demostración.
- `GET /api/projects/{id}/scene`: escena guardada; respuesta vacía si nunca se guardó.
- `PUT /api/projects/{id}/scene`: reemplaza la escena validada, responde 204.
- `GET /actuator/health`: disponibilidad del backend y PostgreSQL.
- `POST /api/simulation/ping` y `/api/simulation/traceroute`: reciben `{network, source, target}` y devuelven `{ok, message, path}`.
- `POST /api/simulation/dhcp`: recibe `{network, source}` y devuelve el dispositivo con su dirección asignada.
- `POST /api/cli`: recibe `{network, source, context:{mode,port}, command}` y devuelve `{network,context,output,save,trace}`. Cuando `save=true`, el cliente guarda la escena mediante PUT.
- `GET /api/simulation/events` y `/api/simulation/metrics`: últimos 100 eventos y acumulados persistidos.
- `WS /ws/events`: eventos de ping/traceroute del servidor en tiempo real.
- `/v3/api-docs` y `/swagger-ui/index.html`: documentación OpenAPI.

Formato compartido:

```json
{"version":1,"view":"Superior","walls":false,"selected":"Oficina"}
```

## Pruebas

Con PostgreSQL iniciado, `cd backend && mvn verify` ejecuta pruebas HTTP de migraciones, salud, guardado/carga y rechazo de escenas inválidas/proyectos inexistentes. Usa una base de datos de desarrollo/pruebas, pues Flyway aplica migraciones y las pruebas escriben la escena del proyecto inicial.

En `frontend`:

```bash
node --experimental-strip-types --test tests/network.test.ts tests/advanced.test.ts
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

## Laboratorio interactivo

La escena inicial incluye **Internet virtual → Firewall ASA → Router ISR → Switch 2960 → PC y Laptop**. Router LAN `192.168.1.1/24`, switch `192.168.1.2/24`, PC `.101`, laptop `.102`; gateway de ambos equipos `.1`. La WAN del router es `192.168.254.2/24`, ASA interna `.1` y externa `203.0.113.2/24`, Internet virtual `203.0.113.1`. Existen rutas de ida y retorno; ninguna dirección representa acceso a Internet real.

1. Selecciona PC y pulsa **Ejecutar ping** hacia `192.168.1.102`: responde y dibuja PC → Switch → Laptop.
2. Pulsa **Desconectar sl** y repite: falla. Reconecta Switch puerto 2 → Laptop puerto 0 para recuperarlo.
3. Apaga un equipo, desactiva una interfaz o cambia una VLAN y repite la prueba para observar el resultado.
4. Selecciona un dispositivo desde la casa, la lista o la topología. Arrastra su etiqueta en la casa; también puedes editar habitación, X/Z y rotación. Arrastra un dispositivo del catálogo lateral al suelo para agregarlo.
5. Selecciona origen, destino, puertos y medio. Los puertos ocupados y medios incompatibles se rechazan. Wi-Fi requiere un access point y una distancia máxima de 8 unidades de la escena; fibra requiere equipos de infraestructura o servidor.
6. Usa Reproducir/Pausar, Siguiente salto y Reiniciar para inspeccionar el último recorrido. El marcador representa un paquete virtual; los cables recorren puntos de control a nivel del suelo.
7. Guarda, recarga y carga el proyecto. Configuraciones, conexiones, posiciones y estado de bombillas forman parte del mismo JSON portable.

Los modelos son geometrías originales: monitores, portátiles, equipos de rack, cámaras, AP, sensores y bombillas. El render usa antialiasing, densidad hasta 2× y sombras de 2048 px. Son modelos educativos, no activos propietarios ni una reconstrucción fotorrealista de la imagen de referencia.

## Configuración de red y CLI

Abre **Interfaces, VLAN, gateway, rutas, DHCP y firewall**. El formulario modifica cada interfaz; el editor JSON permite configurar gateway, rutas estáticas, reglas y DHCP. Los errores de validación aparecen junto al editor. `eth0` coincide con la dirección principal del equipo.

Ejemplo de rutas y servicios dentro de la configuración de un router (conserva también los demás campos):

```json
{
  "gateway": "192.168.1.1",
  "routes": [{"network":"0.0.0.0","prefix":0,"gateway":"192.168.254.1"}],
  "firewall": [{"action":"deny","source":"192.168.1.101","destination":"203.0.113.1"}],
  "dhcp": {"start":"192.168.1.150","end":"192.168.1.180","gateway":"192.168.1.1","prefix":24},
  "nat": false
}
```

**Solicitar DHCP** asigna una dirección libre de un servidor alcanzable; no inventa una concesión si el equipo está desconectado. Firewall evalúa la primera regla coincidente y permite por defecto. `*` representa cualquier dirección. Las rutas se eligen por el prefijo más específico; se exige también conectividad de retorno. Los puertos access reciben tramas sin etiqueta y asignan su VLAN; los trunks transportan las VLAN entre switches. No hay negociación automática del trunk.

CLI interpretada en **Java en la edición local** y **TypeScript en Pages**. No ejecuta comandos del sistema. Usa `?`, Tab e historial con ↑/↓. Ejemplo para interrumpir el enlace de PC desde el switch:

```text
enable
configure terminal
interface eth1
description Enlace PC
shutdown
end
show ip interface brief
write memory
```

`shutdown` afecta solo a la interfaz elegida. `no shutdown` la restaura. También se soportan `disable`, `exit`, `hostname`, `ip address IP MASCARA`, `show running-config`, `show interfaces`, `show ip route`, `show vlan brief`, `switchport mode access`, `switchport mode trunk`, `switchport access vlan N`, `ip route RED MASCARA GATEWAY`, `ping IP`, `traceroute IP` e `ip dhcp` en modo configuración. `vlan N` valida la disponibilidad del identificador; las VLAN efectivas se crean al asignarlas a puertos. `write memory` guarda el proyecto completo desde la interfaz de usuario.

## Monitoreo, cámaras e IoT

Cada ping exitoso representa 32 bytes de solicitud y 32 de respuesta. Las gráficas muestran bytes **virtuales por evento**, no Mbps ni mediciones físicas. El backend conserva eventos y publica por WebSocket; Pages los calcula en memoria. Exportar eventos CSV descarga la actividad de esta sesión. El historial visible está limitado a 100 eventos y se reinicia al cargar otro proyecto; el historial del servidor se consulta por API.

Agrega una Cámara IP y conéctala a un puerto libre del switch. **Vista de cámara virtual** sitúa la cámara del render en su ubicación; **Simular movimiento** genera un evento educativo si tiene conectividad con el router. Apagarla cierra la vista. No hay vídeo real. Una Bombilla IoT conectada permite alternar la iluminación; si se desconecta, la operación se rechaza.

## Alcance y pendientes explícitos

Esta entrega amplía las fases 2–6 y añade pruebas y documentación de la fase 7. **No equivale a completar todos los requisitos del prompt maestro.**

- El motor modela ICMP, reenvío, VLAN, DHCP básico y reglas por IP. `traceroute` muestra el recorrido lógico incluyendo switches, sin sondas TTL ni tiempos de red.
- `nat=true` demuestra traducción de dirección de origen en ICMP y su efecto en reglas posteriores. No implementa tablas PAT con puertos TCP/UDP, expiración de sesiones ni un firewall con estado.
- DHCP asigna direcciones deterministas sin negociación de broadcast ni expiración de concesiones. No hay DNS/HTTP virtual ni tablas ARP/MAC aprendidas y consultables.
- La topología es un SVG interactivo sincronizado, sin editor React Flow. Los modelos GLB/GLTF todavía no se importan.
- Se guarda un proyecto completo como escena JSON en PostgreSQL; faltan creación de múltiples proyectos desde la interfaz, CRUD individual de habitaciones/dispositivos y tablas relacionales independientes para cada entidad del dominio.
- Los paneles laterales se redimensionan y ocultan; los apartados inferiores se contraen. La posición libre de la cámara no se persiste. El paquete Three.js/Recharts sigue siendo grande y Vite avisa durante la compilación.

## Verificación de esta entrega

Los motores Java y TypeScript consumen los mismos **16 escenarios deterministas** en `backend/src/test/resources/network-cases.json`: LAN, cable desconectado, interfaz apagada, VLAN aislada/compartida, trunk correcto/incorrecto, rutas y retorno, firewall, traducción de origen, Wi-Fi dentro/fuera de alcance y fibra. `frontend/tests/create-fixtures.ts` regenera esos casos; no son tráfico físico.

Las pruebas de navegador cubren CLI Java, persistencia de interfaces, WebSocket con eventos de 64 bytes, arrastre de etiquetas, cámaras, bombillas, JSON portable y Pages sin API. Revisa los resultados del comando en tu entorno; el repositorio no sustituye una ejecución de pruebas por una afirmación de éxito.
