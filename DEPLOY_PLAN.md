# 🚀 Plan de Despliegue en Dokploy — UAI | CAETI

Este documento detalla la estrategia para desplegar el **Laboratorio de Ciencias de Datos** de forma automatizada utilizando **Dokploy** y **GitHub**.

> **Nota:** Los archivos de configuración (`backend/Dockerfile` y `frontend/nixpacks.toml`) ya han sido creados y están listos en tu rama `FLORCITA`.

---

## 📋 Arquitectura de Despliegue

El sistema se compone de tres piezas clave que deben convivir en Dokploy:
1.  **Base de Datos:** PostgreSQL (Gestionada por Dokploy).
2.  **Backend (API + Motor Python):** Contenedor Docker (Node.js + Python).
3.  **Frontend (Web):** Sitio estático (Vite/React).

---

## 🛠️ Fase 1: Base de Datos (PostgreSQL)

1.  En el panel de Dokploy, ve a **"Databases"** y crea una nueva **PostgreSQL**.
2.  **Configuración:**
    *   **Name:** `tfi-db`
    *   **Database Name:** `tfi_laboratorio`
3.  Una vez creada, copia la **Internal Connection String** (ej: `postgres://user:pass@host:5432/db`). La usaremos en el Backend.

---

## ⚙️ Fase 2: El Backend (API + Motor ETL)

### 1. Crear el Servicio en Dokploy
1.  Crea un nuevo **"Application"**.
2.  Conecta tu GitHub y selecciona la rama `FLORCITA`.
3.  **Root Directory:** `/backend`
4.  **Build Type:** Selecciona **Dockerfile** (Dokploy detectará automáticamente el archivo `backend/Dockerfile`).

### 2. Variables de Env (Environment Variables)
Configura estas llaves en el panel de la Application del Backend:
*   `DATABASE_URL`: (La URL que copiaste de la base de datos).
*   `PORT`: `3001`
*   `ZENODO_TOKEN`: Llave maestra del laboratorio.
*   `KAGGLE_KEY`: Llave maestra del laboratorio.
*   `HUGGINGFACE_TOKEN`: Llave maestra del laboratorio.
*   `BACKEND_URL`: La URL pública que le asigne Dokploy al backend.

### 3. Volúmenes Persistentes
Fundamental para no perder los archivos Excel:
1.  En el servicio del Backend, ve a **"Volumes"**.
2.  Crea un montaje: Nombre `uai-exports` -> Carpeta interna: `/app/exports`.

---

## 💻 Fase 3: El Frontend (Interfaz Web)

1.  Crea una nueva **"Application"** en Dokploy.
2.  Conecta tu GitHub y selecciona la rama `FLORCITA`.
3.  **Root Directory:** `/frontend`
4.  **Build Type:** Nixpacks (usará el archivo `frontend/nixpacks.toml`).
5.  **Variables de Entorno:**
    *   `VITE_API_URL`: La URL pública de tu backend + `/api` (ej: `https://api-uai.com/api`).

---

## 🏁 Fase 4: Configuración Inicial (Post-Deploy)

Una vez que el backend esté "Online" por primera vez, debés cargar la estructura de la base de datos:

1.  En Dokploy, entra a la Application del **Backend**.
2.  Ve a la pestaña **"Console"** (Terminal).
3.  Ejecuta este comando para crear las tablas:
    ```bash
    npx prisma migrate deploy
    ```
4.  (Opcional) Carga los usuarios iniciales:
    ```bash
    npx prisma db seed
    ```

---

## 🔄 Automatización (CI/CD)

A partir de ahora, cada vez que hagas un **`git push origin FLORCITA`**, Dokploy actualizará automáticamente tanto el servidor como la web.

---

## ✅ Checklist Final
- [ ] PostgreSQL creado y URL copiada.
- [ ] Backend configurado como Dockerfile.
- [ ] Volumen `/app/exports` creado.
- [ ] Frontend configurado como Nixpacks.
- [ ] `migrate deploy` ejecutado desde la consola de Dokploy.
