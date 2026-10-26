# Continuar SmartHome Cisco 3D con Antigravity

Abre este repositorio en Antigravity y lee README.md antes de cambiarlo. Conserva las dos ediciones y no reemplaces la aplicación Java por una demo estática.

## Arranque rápido local

1. Instala Docker y Docker Compose.
2. Copia `.env.example` a `.env` sin subir credenciales a Git.
3. Ejecuta `docker compose --profile local up -d --build`.
4. Abre el puerto 8088 en el navegador local y comprueba `/actuator/health` y `/api/projects`.
5. Para desarrollo con recarga, usa Java 21/Maven en `backend`, Node en `frontend`, PostgreSQL en Compose y las instrucciones del README.

## Contratos que deben conservarse

- `npm run build:pages`: navegador autónomo, sin peticiones a Java; IndexedDB.
- `npm run build:local`: API Spring Boot y PostgreSQL detrás de Nginx.
- `projectStorage.ts`: adaptación de persistencia y validación del JSON compartido.
- Flyway migra la base de datos: añade migraciones, no edites las ya aplicadas.
- El estado guardado actual solo incluye vista, paredes y selección; no existen aún dispositivos ni motor de red.
- No uses ping, traceroute o comandos arbitrarios del anfitrión para la futura simulación.
- El modo Pages es público, sin secretos ni credenciales externas.

## Siguiente tarea recomendada: Fase 2

Implementar catálogo, Room/NetworkDevice, posiciones, selección y edición de dispositivos. Extender el formato del proyecto de forma versionada; actualizar validación TypeScript y DTO Java, migraciones y pruebas. Guardar los mismos datos en IndexedDB (Pages) y PostgreSQL (local). Mantener escenas iniciales y exportación/importación compatibles o proporcionar migración explícita.

Para futuros motores TypeScript y Java, usar los mismos casos de prueba deterministas. No afirmar paridad ni terminar funciones sin ejecutar sus pruebas. CLI, VLAN, NAT, cámaras y monitoreo todavía no están implementados.

## Verificación antes de publicar

Ejecuta pruebas Java con PostgreSQL, compilaciones `build:pages` y `build:local`, pruebas Playwright de ambas ediciones y una petición funcional a través del frontend del contenedor local. Revisa `git diff` para excluir `.env`, dependencias y artefactos. El workflow Pages publica automáticamente al recibir cambios en `main`; los ajustes de Pages deben usar GitHub Actions.
