# 🏛️ Arquitectura — Laboratorio de Calidad y Ciencia de Datos

> CAETI · Universidad Abierta Interamericana
> Documento técnico de arquitectura — todas las capas y componentes.

---

## 0. Resumen ejecutivo

Plataforma web **políglota en 4 capas** que combina dos capacidades:

1. **Búsqueda federada** de datasets abiertos (Zenodo, Kaggle, Hugging Face, UCI, HealthData.gov).
2. **Evaluación de calidad de datos** con scoring inspirado en ISO/IEC 25012 + validación empírica
   de su utilidad para Machine Learning.

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| **Frontend** | React 19 + Vite + TypeScript + Tailwind | Interfaz SPA |
| **Backend / API Gateway** | Node.js + Express + TypeScript | Auth, orquestación, persistencia |
| **Motores de análisis** | Python (pandas, scikit-learn, scipy) | Búsqueda, calidad, ML |
| **Base de datos** | PostgreSQL 16 + Prisma ORM | Persistencia |
| **Infraestructura** | Docker Compose | Empaquetado y despliegue |

Principio rector: **el backend orquesta, Python calcula, Postgres persiste.** Ningún ML vive en Node.

---

## 1. Diagrama general

```
┌──────────────────────────────────────────────────────────────────────────┐
│  NAVEGADOR — Frontend SPA (React + Vite + TS + Tailwind)                   │
│  Home · Login/Register · Búsqueda · Diccionarios · Historial ·            │
│  Exportaciones · Calidad de Datos · Settings · Admin                       │
└───────────────────────────────────┬────────────────────────────────────────┘
                                     │  HTTP REST + JWT (axios + interceptor)
┌───────────────────────────────────▼────────────────────────────────────────┐
│  BACKEND — Node.js / Express / TypeScript   (API GATEWAY / ORQUESTADOR)     │
│                                                                             │
│   routes/ ──► middlewares/ (auth, admin) ──► controllers/ ──► lib/          │
│   · Autenticación (JWT, Google OAuth, bcrypt, reset por email)             │
│   · Resolución de credenciales (token usuario > key global > .env)         │
│   · Orquestación de procesos Python (spawn)                                │
│   · Persistencia vía Prisma                                                │
│   · Sirve /exports como estáticos                                          │
└──────┬────────────────────────────────────────────────┬─────────────────────┘
       │ child_process.spawn (args + env + stdin/stdout)  │ Prisma Client
┌──────▼─────────────────────────────────┐   ┌────────────▼─────────────────────┐
│  MOTORES PYTHON (subprocesos stateless) │   │  PostgreSQL 16                   │
│                                         │   │  (Prisma ORM, 11 modelos)        │
│  etl.py ............ búsqueda federada  │   │                                  │
│  quality.py ........ motor de calidad   │   │  Usuario, Token, Keyword,        │
│  dataset_download.py  descarga sample   │   │  GrupoDiccionario(+pivot),       │
│  quality_validate.py  RF + label qual.  │   │  HistorialBusqueda,              │
│  quality_compare.py   Kruskal-Wallis    │   │  HistorialExportacion,           │
│  experiment_*.py ... experimentos (off) │   │  FuenteDatos, PasswordResetToken,│
│  quality_config.json  pesos/umbrales    │   │  AuditLog, QualityReport         │
└──────┬──────────────────────────────────┘   └──────────────────────────────────┘
       │ HTTP saliente
┌──────▼──────────────────────────────────────────────────────────────────────┐
│  SERVICIOS EXTERNOS                                                          │
│  Datos: Zenodo · Kaggle · Hugging Face · UCI · HealthData.gov               │
│  Identidad: Google OAuth     ·     Email: Resend / SMTP (nodemailer)         │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Capa Frontend (`frontend/`)

**Stack:** React 19, Vite, TypeScript, TailwindCSS, React Router v7, axios, lucide-react, `@react-oauth/google`.

### Estructura
```
frontend/src/
├── App.tsx                 # Routing (rutas públicas y privadas)
├── main.tsx                # Bootstrap + GoogleOAuthProvider
├── pages/
│   ├── Home.tsx            # Landing
│   ├── Login / Register / ForgotPassword / ResetPassword
│   ├── SearchLaboratory.tsx   # Búsqueda de datasets
│   ├── Keywords.tsx           # Gestión de diccionarios
│   ├── SearchHistory.tsx      # Historial de búsquedas
│   ├── Exports.tsx            # Mis exportaciones + biblioteca pública
│   ├── QualityAnalysis.tsx    # Módulo de Calidad de Datos
│   ├── Settings.tsx          # Conexiones API personales (tokens)
│   └── Admin.tsx             # Panel de administración
├── components/
│   ├── GlobalLayout.tsx     # Layout raíz
│   ├── Sidebar.tsx          # Navegación lateral (según rol)
│   ├── PrivateRoute.tsx     # Guard de rutas con JWT
│   └── InfoPopover.tsx      # Modales "(?)" explicativos
└── lib/
    ├── api.ts               # axios + interceptor JWT
    └── quality-explanations.ts  # Textos de los pop-ups
```

### Decisiones
- **SPA stateless**: la sesión (token + datos de usuario) se guarda en `localStorage`.
- **Sin store global**: cada página maneja su estado con hooks (`useState`/`useEffect`).
- **Cliente HTTP único** (`lib/api.ts`): un interceptor agrega `Authorization: Bearer <token>` a todas las requests; `baseURL` configurable por `VITE_API_URL`.
- **Rutas privadas** envueltas en `<PrivateRoute>` (redirige a login si no hay token).
- **Autoexplicabilidad**: cada métrica tiene un `<InfoPopover>` con definición, qué mide, cómo se calcula, por qué importa y ejemplo.

---

## 3. Capa Backend / API Gateway (`backend/`)

**Stack:** Node.js, Express, TypeScript, Prisma Client, `bcrypt`, `jsonwebtoken`, `cors`, `dotenv`, `multer`, `xlsx`, `nodemailer`, `resend`, `google-auth-library`.

### Estructura
```
backend/src/
├── index.ts                # Bootstrap: CORS, JSON, routers, /exports estáticos, /api/health
├── controllers/
│   ├── auth.controller.ts        # register, login, google, forgot/reset password
│   ├── dataset.controller.ts     # búsqueda (spawn etl.py)
│   ├── quality.controller.ts     # análisis de calidad (spawn quality*.py)
│   ├── token.controller.ts       # API keys personales
│   ├── keyword.controller.ts     # keywords
│   ├── diccionario.controller.ts # diccionarios temáticos
│   ├── historial.controller.ts   # historial de búsquedas/exportaciones
│   ├── fuentes.controller.ts     # fuentes y keys globales
│   └── admin.controller.ts       # usuarios, auditoría
├── routes/                  # Un router por dominio (aplican middlewares)
├── middlewares/
│   ├── auth.middleware.ts   # authMiddleware (obligatorio) + optionalAuth
│   └── admin.middleware.ts  # exige rol ADMINISTRADOR
└── lib/
    ├── prisma.ts            # Cliente Prisma singleton
    ├── audit.helper.ts      # logAudit() → AuditLog
    └── default-keywords.ts  # Siembra 5 diccionarios al registrarse
```

### Responsabilidad central
El backend **no hace ML ni estadística**. Su trabajo:
1. **Autenticar** y autorizar (JWT, roles).
2. **Resolver credenciales** de las fuentes con prioridad: *token personal del usuario > key global de la fuente > `.env`*.
3. **Orquestar** el proceso Python correcto (spawn).
4. **Parsear** la salida JSON y **persistir** en Postgres.
5. **Servir** los archivos generados (`/exports`).

### Mapa de endpoints
| Dominio | Endpoints |
|---|---|
| **Auth** | `POST /api/auth/register · /login · /google · /forgot-password · /reset-password` |
| **Datasets** | `POST /api/datasets/search` |
| **Calidad** | `POST /api/quality/analyze · /analyze-url · /upload-analyze · /validate` · `GET /api/quality/compare · /history · /report/:id` |
| **Tokens** | `GET/POST/PATCH/DELETE /api/tokens` (API keys personales) |
| **Keywords** | `/api/keywords` (CRUD) |
| **Diccionarios** | `/api/diccionarios` (CRUD + relación keywords) |
| **Historial** | `GET /api/historial/busquedas · /exportaciones · /exportaciones/publicas` · `POST /exportaciones` · `PATCH /:id/visibilidad` |
| **Fuentes** | `GET/POST/PATCH /api/fuentes` (activar/desactivar, keys globales) |
| **Admin** | `/api/admin/*` (usuarios, auditoría) |
| **Salud** | `GET /api/health` |

---

## 4. Capa de Motores Python (`python/`)

Scripts **independientes y stateless**, invocados por `spawn`. Reciben argumentos/archivos y devuelven **JSON por stdout** (logs y diagnóstico por stderr).

| Script | Entrada | Salida | Técnicas |
|---|---|---|---|
| `etl.py` | keywords (argv) + keys (env) | Excel en `/exports` + stdout | búsqueda federada paralela (ThreadPool), normalización de metadatos |
| `quality.py` | ruta de archivo | JSON: score, dimensiones, problemas, ML-readiness, reproducibilidad | estadística + Isolation Forest + heurísticas |
| `quality_config.json` | — | — | pesos y umbrales versionados |
| `dataset_download.py` | URL + `--out` | archivo + JSON (path, bytes, params) | descarga streaming con tope (25 MB / 100k) |
| `quality_validate.py` | archivo + `--target` | JSON: performance, calidad de etiquetas | Random Forest + cross-validation + confident learning |
| `quality_compare.py` | JSON por stdin | JSON: stats por fuente + test | Kruskal-Wallis (scipy) |
| `experiment_correlation.py` | corpus | JSON + reporte .md | correlación + pesos NNLS |
| `experiment_degradation.py` | dataset | JSON + reporte .md | degradación controlada (features / labels) |

**Deps Python** (`requirements.txt`): pandas, numpy, scikit-learn, scipy, requests, openpyxl, kaggle, ucimlrepo, wfdb, python-dotenv.

### Detalle del motor de calidad (`quality.py`)
- **Detección de separador** del CSV (`, ; \t |`).
- **Sampleo** aleatorio con semilla fija (`42`) si supera 50.000 filas.
- **Estadística**: % faltantes, % duplicados, completitud por columna, consistencia de tipos.
- **ML**: Isolation Forest para outliers (fallback IQR).
- **Score ISO** = Σ(peso × valor) sobre 4 dimensiones (Completitud, Consistencia, Exactitud, Unicidad).
- **Aptitud ML** (reglas): Clasificación / Regresión / Clustering / Series temporales → apto/limitado/no apto.
- **Reproducibilidad**: SHA-256 del contenido + parámetros + versiones.

---

## 5. Comunicación Node ↔ Python

Patrón uniforme con `child_process.spawn`:

```
1. findRoot(__dirname)        → ubica la raíz (busca python/etl.py; sirve en dev y Docker)
2. armar env                  → inyecta API keys (token usuario > key global > .env) + PYTHONIOENCODING=utf-8
3. spawn(python, [script,…])  → pasa args (y stdin para upload/compare)
4. acumular stdout            → JSON.parse(stdout) al cerrar el proceso
5. manejar stderr / exit code → errores claros al frontend
```

- **Helper `runPython`** (en `quality.controller.ts`) encapsula este patrón.
- **Por qué subprocesos y no un microservicio HTTP**: simplicidad operativa, sin segundo servidor, encaja con el patrón ya existente de `etl.py`. *Camino de escalado documentado: migrar a FastAPI si el volumen lo exige.*

---

## 6. Capa de Datos — PostgreSQL + Prisma

Esquema en `backend/prisma/schema.prisma`, migraciones versionadas en `prisma/migrations/`.

### Modelo de datos (11 entidades)
```
Usuario ──┬─< Token            (API keys personales por servicio, cifradas)
          ├─< Keyword >──┬── GrupoDiccionarioKeyword ──┬─< GrupoDiccionario
          │              │         (pivot N–N)          │
          ├─< HistorialBusqueda ──< HistorialExportacion (pública/privada)
          ├─< PasswordResetToken
          ├─< AuditLog
          └─< QualityReport     (resultado de cada análisis de calidad)

FuenteDatos ──< Token           (key global por fuente, activable)
```

| Modelo | Campos clave | Notas |
|---|---|---|
| `Usuario` | nombre, email, password_hash?, google_id?, rol, activo | rol: INVESTIGADOR / ADMINISTRADOR |
| `Token` | api_key_cifrada, servicio, usuario_id, fuente_id? | credencial personal |
| `Keyword` | palabra, categoria | |
| `GrupoDiccionario` + `GrupoDiccionarioKeyword` | nombre, descripcion | relación N–N |
| `HistorialBusqueda` | keywords, fuente, resultados | una por búsqueda |
| `HistorialExportacion` | nombre_archivo, publica, descripcion, url | biblioteca pública |
| `FuenteDatos` | nombre, tipo, api_key?, activa | fuentes federadas |
| `PasswordResetToken` | token, expires_at, used | recuperación |
| `AuditLog` | accion, entidad, entidad_id, detalle, ip | trazabilidad |
| `QualityReport` | quality_score, rows_sampled, columnas, **metrics (JSON)**, issues (JSON), alerts (JSON), fuente, dataset_ref | el JSON `metrics` guarda dimensiones, metodología, ML-readiness y reproducibilidad |

- **ORM tipado**: el cliente Prisma se regenera del schema (`prisma generate`); el backend tiene tipos seguros.
- **Campos JSON** en `QualityReport` evitan migraciones por cada métrica nueva.

---

## 7. Autenticación y seguridad

| Mecanismo | Implementación |
|---|---|
| **Sesión** | JWT (`jsonwebtoken`); el frontend lo guarda en localStorage y lo envía en cada request |
| **Verificación** | `authMiddleware` valida el token e inyecta `usuarioId`/`rol`; `optionalAuth` para endpoints semi-públicos |
| **Login social** | Google OAuth (`google-auth-library` + `@react-oauth/google`) |
| **Contraseñas** | hash con `bcrypt` |
| **Recuperación** | `PasswordResetToken` con expiración + email vía Resend/nodemailer |
| **Autorización** | roles INVESTIGADOR / ADMINISTRADOR (`admin.middleware`) |
| **Auditoría** | `logAudit()` registra acciones sensibles en `AuditLog` (con IP) |
| **Credenciales de fuentes** | API keys cifradas; prioridad token personal > global > .env |
| **Uploads** | `multer`: valida extensión (.csv/.xlsx/.tsv) y tamaño (≤50 MB) |
| **Path traversal** | `path.basename()` sobre nombres de archivo en el módulo de calidad |

---

## 8. Integraciones externas

- **Repositorios de datos** (vía `etl.py` / `dataset_download.py`): Zenodo, Kaggle (API + key), Hugging Face, UCI (`ucimlrepo`), HealthData.gov.
- **Google** — login OAuth.
- **Resend / SMTP** — emails de recuperación de contraseña.

---

## 9. Flujos principales (end-to-end)

### A. Búsqueda federada
```
Frontend (keywords + fuente)
  → POST /api/datasets/search
  → Node arma env con API keys del usuario/globales
  → spawn etl.py (consulta fuentes en paralelo)
  → genera Excel en /exports
  → Node lo lee con xlsx, guarda HistorialBusqueda
  → devuelve resultados normalizados → tabla en el frontend
```

### B. Análisis de calidad (datos reales)
```
Frontend (sube archivo  |  pega URL)
  → POST /upload-analyze (multer guarda)  |  /analyze-url (dataset_download.py baja sample)
  → spawn quality.py sobre el archivo
  → JSON: score + dimensiones + ML-readiness + hash
  → guarda QualityReport
  → frontend renderiza score, desglose, problemas, alertas (+ pop-ups)
```

### C. Validación predictiva
```
Frontend (elige columna target)
  → POST /api/quality/validate
  → spawn quality_validate.py
  → Random Forest + cross-validation (F1/R²) + calidad de etiquetas
  → frontend muestra performance, calidad de etiquetas y score combinado
```

### D. Exportación + biblioteca pública
```
Resultados de búsqueda → exportar a Excel (nombre, descripción, visibilidad)
  → POST /api/historial/exportaciones (publica = true/false)
  → si pública: aparece en GET /exportaciones/publicas para toda la comunidad
```

---

## 10. Infraestructura y despliegue

- **`docker-compose.yml`** — PostgreSQL 16 (`tfi_laboratorio`, puerto 5432, volumen persistente `postgres_data`).
- **`Dockerfile` + `nixpacks.toml`** — build de la app; Node y Python conviven en el mismo entorno (el backend invoca Python local).
- **`/exports`** — carpeta compartida servida como estáticos: Excel de búsquedas y samples descargados.
- **Variables de entorno** — `DATABASE_URL`, `JWT_SECRET`, keys de fuentes, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `FRONTEND_URL`, `BACKEND_URL`, `PYTHON_PATH`.

### Levantar en local
```bash
docker compose up -d db                      # PostgreSQL
cd backend && npx prisma migrate deploy      # aplica migraciones
cd backend && npx prisma db seed             # usuarios/diccionarios por defecto
cd backend && npm run dev                    # API → http://localhost:3001
cd frontend && npm run dev                   # SPA → http://localhost:5173
```

---

## 11. Decisiones de arquitectura clave

1. **Backend Node como orquestador; ML en Python** — cada lenguaje en lo suyo; el gateway coordina, no calcula.
2. **Subprocesos en lugar de microservicio** — simplicidad operativa, sin segundo servidor.
3. **Modelo federado / proxy, NO data lake** — el sistema consulta fuentes en vivo; **no almacena los datasets**, solo metadatos y reportes. *Es la decisión que más condiciona el roadmap de IA: cualquier feature que necesite un corpus persistido (embeddings, recomendador) requiere primero construir esa capa.*
4. **Configuración externalizada y versionada** (`quality_config.json`) — la heurística del score se ajusta sin tocar el motor.
5. **Reproducibilidad de primera clase** — cada `QualityReport` guarda hash + parámetros + versiones de config y motor.
6. **Stateless en todas las capas** — frontend (localStorage), backend (JWT), Python (sin estado) → escalable horizontalmente.
7. **Separación calidad de features vs. calidad de etiquetas** — el hallazgo científico central (la calidad de etiquetas predice la utilidad para ML mucho mejor que las métricas clásicas) está reflejado en la arquitectura del módulo de validación.

---

## 12. Mapa de componentes (referencia rápida)

| Necesito tocar… | Está en… |
|---|---|
| Una pantalla | `frontend/src/pages/*.tsx` |
| Llamadas al backend | `frontend/src/lib/api.ts` |
| Un endpoint | `backend/src/routes/*.ts` + `controllers/*.ts` |
| Auth / permisos | `backend/src/middlewares/*.ts` |
| El modelo de datos | `backend/prisma/schema.prisma` (+ `migrations/`) |
| La lógica de búsqueda | `python/etl.py` |
| El cálculo de calidad | `python/quality.py` + `quality_config.json` |
| La validación ML | `python/quality_validate.py` |
| Los experimentos | `python/experiment_*.py` |
| Infra / base | `docker-compose.yml`, `Dockerfile`, `nixpacks.toml` |

---

_Documento de arquitectura · Laboratorio de Calidad y Ciencia de Datos · UAI–CAETI_
