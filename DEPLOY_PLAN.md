# 🚀 Plan de Despliegue en Dokploy — UAI | CAETI

Este documento detalla la estrategia definitiva para desplegar el **Laboratorio de Ciencias de Datos** de forma 100% automatizada.

---

## 📋 Arquitectura de Despliegue

1.  **Base de Datos:** PostgreSQL (Gestionada por Dokploy).
2.  **Backend (API + Motor Python):** Contenedor Docker (Usa el `Dockerfile` de la raíz).
3.  **Frontend (Web):** Sitio estático (Vite/React).

---

## 🛠️ Fase 1: Base de Datos (PostgreSQL)

1.  Creá una nueva **PostgreSQL** en Dokploy.
2.  Copiá la **Internal Connection String**.

---

## ⚙️ Fase 2: El Backend (Sincronización Automática)

### Configuración en Dokploy:
1.  Crea un nuevo **Application**.
2.  **Repo:** Seleccioná la rama `developers` (o `FLORCITA`).
3.  **Root Directory:** `/` (Raíz del repositorio).
4.  **Build Type:** **Dockerfile**.
5.  **Docker Build Path:** `Dockerfile`.

### Variables de Entorno:
*   `DATABASE_URL`: (URL interna de PostgreSQL).
*   `PORT`: `3001`
*   `ZENODO_TOKEN`, `KAGGLE_USER`, `KAGGLE_KEY`, `HUGGINGFACE_TOKEN`.
*   `BACKEND_URL`: URL pública de Dokploy para el backend.

> **Nota:** Las migraciones de la base de datos se ejecutan **automáticamente** cada vez que el servidor arranca. No necesitás correr comandos manuales para crear las tablas.

---

## 💻 Fase 3: El Frontend

1.  Crea una nueva **Application**.
2.  **Root Directory:** `/frontend`.
3.  **Build Type:** Nixpacks (Dokploy leerá el archivo `nixpacks.toml`).
4.  **Variables de Entorno:**
    *   `VITE_API_URL`: URL pública del backend + `/api`.

---

## 🏁 Fase 4: Carga de Datos Iniciales (Opcional)

Si es la primera vez que desplegás y querés cargar el usuario de prueba (`flor@uai.edu.ar`), hacé esto:

1.  Entra a la **Console** del Backend en Dokploy.
2.  Corré:
    ```bash
    npx prisma db seed
    ```

---

## 🔄 CI/CD Automatizado
A partir de ahora, cada **`git push origin developers`** actualizará automáticamente todo el sistema (Base de datos, Servidor y Web) sin intervención manual.
