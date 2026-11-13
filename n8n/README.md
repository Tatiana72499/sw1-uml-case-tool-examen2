# n8n - SW1 UML CASE Tool

El `docker-compose.yml` de la raíz ejecuta n8n junto con PostgreSQL, backend y frontend. Desde la raíz del repositorio:

```bash
docker compose up -d n8n
```

El editor queda disponible únicamente en `http://localhost:5678`. En EC2 se accede mediante un túnel SSH; el puerto 5678 no debe abrirse públicamente.

Los workflows exportados están en `workflows/workflows.json`. Después de importarlos, crea en n8n la credencial `Google Gemini(PaLM) Api account`, usa la clave indicada por `GEMINI_API_KEY` y selecciona esa credencial en los dos nodos Gemini.

## Asistente de n8n con OpenRouter y sandbox local

El modelo OpenRouter se configura en n8n, en **Settings → AI** (formato `openrouter/organización/modelo`). No uses OpenRouter como URL del sandbox. El sandbox es un servicio independiente y el Compose principal no lo inicia.

Para usar el sandbox local gratuito:

1. Copia `n8n/.env.sandbox.example` como `n8n/.env.sandbox` y genera tres secretos aleatorios. `N8N_SANDBOX_SERVICE_API_KEY` debe coincidir con `SANDBOX_API_KEYS`; `SANDBOX_API_RUNNER_REGISTRATION_TOKEN` debe coincidir con `SANDBOX_RUNNER_REGISTRATION_TOKEN`; y `SANDBOX_API_RUNNER_API_KEY` debe coincidir con `SANDBOX_RUNNER_API_KEYS`. No incluyas la clave de OpenRouter en este archivo.
2. Desde la raíz, inicia la extensión oficial de sandbox:

   ```powershell
   docker compose -f docker-compose.yml -f docker-compose.n8n-sandbox.yml up -d n8n sandbox-runner-1
   ```

3. Comprueba que n8n puede alcanzar el API y que el runner se registró:

   ```powershell
   docker compose -f docker-compose.yml -f docker-compose.n8n-sandbox.yml exec n8n wget -qO- http://sandbox-api:8080/healthz
   docker compose -f docker-compose.yml -f docker-compose.n8n-sandbox.yml logs sandbox-api
   ```

4. En el asistente, configura **Code sandbox → n8n Sandbox**, URL `http://sandbox-api:8080` y el mismo valor de `N8N_SANDBOX_SERVICE_API_KEY`. El modelo OpenRouter permanece configurado en la sección **Model**.

La extensión agrega API, certificados y runner Docker-in-Docker; el runner usa `privileged: true` y no publica puertos. Úsalo para desarrollo local, mantén Docker Desktop actualizado y no expongas estos servicios. El overlay fija las imágenes del sandbox en la versión oficial `1.15.0`; las imágenes API, runner y sandbox deben mantenerse en la misma versión.

El Compose incluido en esta carpeta se conserva para ejecutar n8n de forma independiente durante desarrollo. No debe levantarse al mismo tiempo que el Compose principal porque ambos usan el puerto 5678.
