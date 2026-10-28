# Continuar SmartHome Cisco 3D con Antigravity

Lee README.md y su apartado de alcance antes de ampliar funciones. Mantén ambas ediciones usando el mismo formato de escena.

## Ejecutar

```bash
cp .env.example .env
docker compose --profile local up -d --build
```

Abre http://localhost:8088. Para desarrollar con recarga: PostgreSQL en Compose, Java 21/Maven en backend y Node 24/Vite en frontend. Pages usa `npm run dev:pages` sin backend.

## Arquitectura actual

- `network.ts`: dispositivos, enlaces, validación, estado y topología inicial.
- `advanced.ts` / `NetworkSimulator.java`: motores deterministas de IPv4, VLAN, rutas, firewall y NAT ICMP educativo. Mantén paridad mediante fixtures compartidos.
- `cli.ts` / `CliController.java`: modos y comandos; la respuesta incluye la nueva red. `save=true` pide al cliente guardar mediante el adaptador de persistencia.
- `AdvancedPanel.tsx`: configuración de interfaces y JSON; DHCP.
- `NetworkScene.tsx`, `DeviceModel.tsx`, `House.tsx`: dispositivos, arrastre, cables, paquetes y cámara virtual.
- `Topology.tsx`: editor React Flow sincronizado, puertos, enlaces y posiciones persistidas. `Telemetry.tsx`: pasos, gráficas, CSV e IoT.
- `EventService` / `EventSocket`: eventos persistidos y WebSocket. Nginx y Vite redirigen `/ws`.
- `projectStorage.ts`: IndexedDB v2 para Pages y REST para local, con metadatos y escenas por UUID. Conserva la migración desde v1. `ProjectManager.tsx` gestiona múltiples proyectos; el guardado CLI usa el UUID activo. Escena v1 admite configuraciones opcionales y escenas antiguas.
- Los eventos llevan `projectId`; consultas REST y gráficos se filtran por proyecto. WebSocket emite ID estable para fusionar historial y eventos sin duplicados.
- Flyway V1–V6: proyectos, escena JSON, entidades relacionales, eventos y trazas asociadas a cada proyecto. Añade migraciones; no cambies las aplicadas.

## Alcance y mantenimiento

El README describe las simplificaciones educativas. Traceroute ahora usa TTL y verifica retorno, con tiempos virtuales deterministas. Conserva la paridad Java/TypeScript mediante `traceroute-cases.json`. PAT no implementa la máquina de estados completa de TCP y DHCP no simula cada broadcast. Las nueve posiciones de habitaciones mantienen la geometría y los límites de Wi-Fi consistentes entre motores.

`DesignDto` / `design.ts` preservan habitaciones, posiciones de React Flow, cámara y calidad; incluye este campo al exportar, guardar o ejecutar `write memory`. `NetworkEntityService` usa un bloqueo de proyecto y validación completa antes de actualizar escena y `NetworkInventory`. No escribas directamente en las tablas de proyección: romperías la sincronización. `InventoryBackfill` regenera la proyección al arrancar para conservar proyectos anteriores.

`SimulationSessionService` controla inicio/pausa/pasos; cada paso recibe la red actual del navegador. No crea un hilo de tráfico indefinido cuando se cierra el cliente. `EventService` persiste el resultado y publica WebSocket después de confirmar la transacción. `ServicesEditor.tsx` ofrece formularios de rutas, firewall y DHCP.

## Verificar antes de publicar

```bash
cd backend
mvn verify
cd ../frontend
node --experimental-strip-types --test tests/network.test.ts tests/advanced.test.ts tests/runtime.test.ts tests/models.test.ts tests/traceroute.test.ts tests/design.test.ts
npm run build:local
# Con API y Vite activos:
npx playwright test --workers=1
npm run build:pages
# Servir dist bajo /SmartHome-_Cisco_3D./ en el puerto 4173:
npx playwright test --config playwright.pages.config.ts
```

La configuración usa Chromium de `/usr/bin/chromium`; adapta la ruta en otros sistemas. Para verificar Nginx, ejecuta Playwright con `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8088` tras construir Compose. Las pruebas escriben la escena de demostración: usa una base de desarrollo.

No introduzcas secretos, tráfico físico ni comandos del anfitrión. Conserva los mensajes visibles de error y la exportación/importación JSON. El workflow de Pages publica `main`; Settings → Pages debe utilizar GitHub Actions.

## Nuevos módulos

`runtime.ts` y `RuntimeService.java` mantienen aprendizaje ARP/MAC y sesiones PAT con reloj virtual. `RuntimeController` expone acciones y publica resultados al monitoreo. `RuntimePanel.tsx` permite consultar tablas y probar respuestas y caducidad. Los cambios de configuración invalidan el contexto; no persistir estas tablas como configuración.

`models.ts` y `ModelLibrary.java` validan la biblioteca autocontenida del proyecto. `ImportedModel.tsx` carga con GLTFLoader y libera recursos gráficos; `ModelPanel.tsx` importa y asigna modelos. La biblioteca está en `SceneSnapshot.models`, separada de la red para evitar enviarla con cada simulación. Conserva este campo en guardado, carga, CLI y cambios de proyecto. No relajes la restricción de recursos externos sin diseñar un mecanismo explícito de importación.
