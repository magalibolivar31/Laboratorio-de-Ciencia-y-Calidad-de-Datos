# 🚀 Plan de Despliegue en Dokploy — UAI | CAETI

Este documento detalla la estrategia definitiva para desplegar el proyecto.

---

## 🛠️ CONFIGURACIÓN DE DOKPLOY (BACKEND)

Para solucionar el error de archivos no encontrados, movimos la configuración a la raíz. Seguí estos pasos exactos:

1.  Ve a la pestaña **General** de tu aplicación de Backend en Dokploy.
2.  **Root Directory:** Dejalo en `/` (o simplemente votalo si te lo permite, debe ser la raíz).
3.  **Build Type:** Seleccioná **Dockerfile**.
4.  **Docker Build Path:** Escribí `Dockerfile` (así solo, sin el prefijo backend/).
5.  Ve a la pestaña **Environment**.
6.  **Env file path:** Escribí `.env` (si estás cargando las variables desde un archivo) o simplemente cargalas manualmente en el panel de Dokploy.

---

## 📋 Arquitectura de Despliegue

1.  **Base de Datos:** PostgreSQL (Gestionada por Dokploy).
2.  **Backend (API + Motor Python):** Contenedor Docker (Usa el `Dockerfile` de la raíz).
3.  **Frontend (Web):** Sitio estático (Vite/React).

---

## ⚙️ Fase 2: El Backend

### Variables de Env en Dokploy:
*   `DATABASE_URL`: (Internal Connection String de PostgreSQL).
*   `PORT`: `3001`
*   `ZENODO_TOKEN`, `KAGGLE_USER`, `KAGGLE_KEY`, `HUGGINGFACE_TOKEN`.
*   `BACKEND_URL`: La URL pública de Dokploy para el backend.

---

## 💻 Fase 3: El Frontend

1.  Crea una nueva **Application**.
2.  **Root Directory:** `/frontend`
3.  **Build Type:** Nixpacks.
4.  **Variables de Entorno:**
    *   `VITE_API_URL`: URL pública del backend + `/api`.

---

## 🏁 Fase 4: Comandos Post-Deploy

Si el servidor arranca pero la base de datos está vacía, entra a la **Console** del Backend en Dokploy y corre:
```bash
npx prisma migrate deploy --schema=./prisma/schema.prisma
npx prisma db seed
```
