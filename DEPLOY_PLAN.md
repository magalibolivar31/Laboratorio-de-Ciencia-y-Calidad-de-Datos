# 🚀 Plan de Despliegue en Dokploy — UAI | CAETI

Este documento detalla la estrategia para desplegar el **Laboratorio de Ciencias de Datos** de forma automatizada.

---

## ⚠️ CORRECCIÓN DE ERROR DE RUTAS (IMPORTANTE)

Si ves un error como `cannot create ... backend/backend/.env: Directory nonexistent`, seguí estos pasos exactos en tu panel de Dokploy para el **Backend**:

1.  Ve a la pestaña **General**.
2.  **Root Directory:** Debe ser `/` (una barra inclinada sola). Esto le dice a Dokploy que empiece desde la raíz del repositorio.
3.  **Build Type:** Seleccioná **Dockerfile**.
4.  **Docker Build Path:** Escribí `backend/Dockerfile`.
5.  Ve a la pestaña **Environment**.
6.  **Env file path:** Escribí `backend/.env`.

Al poner Root Directory en `/`, Dokploy buscará el archivo `.env` dentro de la carpeta `backend`, resultando en la ruta correcta `backend/.env`.

---

## 📋 Arquitectura de Despliegue

1.  **Base de Datos:** PostgreSQL (Gestionada por Dokploy).
2.  **Backend (API + Motor Python):** Contenedor Docker.
3.  **Frontend (Web):** Sitio estático (Vite/React).

---

## 🛠️ Fase 1: Base de Datos (PostgreSQL)

1.  Creá una nueva **PostgreSQL** en Dokploy.
2.  Copiá la **Internal Connection String**.

---

## ⚙️ Fase 2: El Backend

### Configuración en Dokploy:
*   **Repo:** Seleccioná tu rama `developers` (o `FLORCITA`).
*   **Root Directory:** `/` 👈 **CLAVE PARA EVITAR ERRORES**
*   **Docker Build Path:** `backend/Dockerfile`
*   **Env file path:** `backend/.env`

### Variables de Env:
*   `DATABASE_URL`: (La URL de PostgreSQL).
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

## 🏁 Fase 4: Configuración Inicial (Post-Deploy)

Una vez que el backend esté "Online":
1.  Entra a la **Console** del Backend en Dokploy.
2.  Corré: `npx prisma migrate deploy`
3.  Corré: `npx prisma db seed`
